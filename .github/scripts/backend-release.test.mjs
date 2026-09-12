import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const script = fileURLToPath(new URL("./backend-release.mjs", import.meta.url));
const baseline = { "apps/api/src/main.ts": "v1", "README.md": "docs" };

function fixture(t) {
  const cwd = mkdtempSync(join(tmpdir(), "backend-release-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  const remote = join(cwd, "origin.git");
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: "CI test",
    GIT_AUTHOR_EMAIL: "ci@example.invalid",
    GIT_COMMITTER_NAME: "CI test",
    GIT_COMMITTER_EMAIL: "ci@example.invalid",
    GITHUB_OUTPUT: join(cwd, "output"),
    GITHUB_STEP_SUMMARY: join(cwd, "summary"),
  };
  function git(args, input) {
    const result = spawnSync("git", args, { cwd, env, input, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  }
  git(["init", "--bare", remote]);
  git(["init", "-b", "main"]);
  git(["remote", "add", "origin", remote]);

  function tree(files) {
    const entries = new Map();
    for (const [path, content] of Object.entries(files)) {
      const slash = path.indexOf("/");
      if (slash < 0) entries.set(path, content);
      else {
        const dir = path.slice(0, slash);
        if (!entries.has(dir)) entries.set(dir, {});
        entries.get(dir)[path.slice(slash + 1)] = content;
      }
    }
    const input = [...entries].map(([name, content]) => {
      if (typeof content === "object") return `040000 tree ${tree(content)}\t${name}\n`;
      return `100644 blob ${git(["hash-object", "-w", "--stdin"], content)}\t${name}\n`;
    }).join("");
    return git(["mktree"], input);
  }
  function commit(files, parent, message = "fixture") {
    return git(["commit-tree", tree(files), ...(parent ? ["-p", parent] : []), "-m", message]);
  }
  function main(sha) {
    // Only the disposable remote is rewritten to reproduce an amended main.
    git(["push", "--force", "origin", `${sha}:refs/heads/main`]);
    git(["update-ref", "refs/heads/main", sha]);
  }
  function release(sha) {
    git(["push", "origin", `${sha}:refs/heads/amvera-api`]);
  }
  function run(command, extraEnv = {}) {
    writeFileSync(env.GITHUB_OUTPUT, "");
    const result = spawnSync(process.execPath, [script, command], {
      cwd, env: { ...env, ...extraEnv }, encoding: "utf8",
    });
    const outputs = Object.fromEntries(readFileSync(env.GITHUB_OUTPUT, "utf8")
      .trim().split("\n").filter(Boolean).map((line) => line.split("=")));
    return { ...result, outputs };
  }
  function plan() {
    const result = run("plan");
    assert.equal(result.status, 0, result.stderr);
    return result.outputs;
  }
  function promote(plan) {
    return run("promote", { SOURCE_SHA: plan.source_sha, EXPECTED_RELEASE_SHA: plan.release_sha });
  }
  function releaseSha() {
    return git(["--git-dir", remote, "rev-parse", "refs/heads/amvera-api"]);
  }
  const base = commit(baseline);
  main(base);
  return { git, commit, main, release, run, plan, promote, releaseSha, base, remote };
}

test("first release preserves the verified tree and source parent", (t) => {
  const f = fixture(t);
  const plan = f.plan();
  assert.equal(plan.changed, "true");
  assert.equal(plan.release_sha, "");
  const result = f.promote(plan);
  assert.equal(result.status, 0, result.stderr);
  const release = f.releaseSha();
  assert.equal(f.git(["rev-parse", `${release}^{tree}`]), f.git(["rev-parse", `${f.base}^{tree}`]));
  assert.equal(f.git(["show", "-s", "--format=%P", release]), f.base);
  assert.match(f.git(["show", "-s", "--format=%B", release]), new RegExp(`Source-Commit: ${f.base}`));
});

test("amended backend creates a fast-forward release with exact files and both parents", (t) => {
  const f = fixture(t);
  const published = f.commit({ ...baseline, "removed.txt": "old", "apps/api/src/main.ts": "v2" }, f.base);
  f.release(published);
  const amended = f.commit({ ...baseline, "apps/api/src/main.ts": "amended" }, f.base);
  f.main(amended);
  const result = f.promote(f.plan());
  assert.equal(result.status, 0, result.stderr);
  const release = f.releaseSha();
  assert.equal(f.git(["rev-parse", `${release}^{tree}`]), f.git(["rev-parse", `${amended}^{tree}`]));
  assert.equal(f.git(["show", "-s", "--format=%P", release]), `${published} ${amended}`);
  assert.doesNotMatch(f.git(["ls-tree", "--name-only", release]), /removed.txt/);
  assert.equal(f.plan().changed, "false");

  // Subsequent source commits still follow main, not the synthetic release.
  const next = f.commit({ ...baseline, "apps/api/src/main.ts": "next" }, amended);
  f.main(next);
  const nextResult = f.promote(f.plan());
  assert.equal(nextResult.status, 0, nextResult.stderr);
  assert.equal(f.git(["show", "-s", "--format=%P", f.releaseSha()]), `${release} ${next}`);
  assert.equal(f.git(["rev-parse", `${f.releaseSha()}^{tree}`]), f.git(["rev-parse", `${next}^{tree}`]));
});

test("docs/frontend-only amend skips without changing the release", (t) => {
  const f = fixture(t);
  const published = f.commit(baseline, f.base, "published");
  f.release(published);
  const amended = f.commit({ ...baseline, "README.md": "amended", "apps/web/page.tsx": "new" }, f.base);
  f.main(amended);
  const plan = f.plan();
  assert.equal(plan.changed, "false");
  assert.equal(f.releaseSha(), published);
});

test("build, contract, migration and CI inputs trigger verification", (t) => {
  const f = fixture(t);
  f.release(f.base);
  for (const path of [
    "apps/api/src/database/migrations/001.ts", "packages/api-contract/generated/server.ts",
    "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.base.json", "turbo.json",
    "Dockerfile", ".dockerignore", "amvera.yaml", "docker/api-entrypoint.sh",
    ".github/workflows/backend-ci.yml", ".github/scripts/backend-release.mjs",
  ]) {
    f.main(f.commit({ ...baseline, [path]: "changed" }, f.base));
    assert.equal(f.plan().changed, "true", path);
  }
});

test("a superseded candidate skips promotion; next plan sees the unpublished backend", (t) => {
  const f = fixture(t);
  f.release(f.base);
  const backend = f.commit({ ...baseline, "apps/api/src/main.ts": "v2" }, f.base);
  f.main(backend);
  const oldPlan = f.plan();
  const latest = f.commit({ ...baseline, "apps/api/src/main.ts": "v2", "README.md": "new" }, backend);
  f.main(latest);
  const result = f.promote(oldPlan);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.outputs.status, "superseded");
  assert.equal(f.releaseSha(), f.base);
  assert.equal(f.plan().changed, "true");
});

test("unexpected release movement is an error and preserves the other release", (t) => {
  const f = fixture(t);
  f.release(f.base);
  const backend = f.commit({ ...baseline, "apps/api/src/main.ts": "v2" }, f.base);
  f.main(backend);
  const plan = f.plan();
  const otherRelease = f.commit({ ...baseline, "apps/api/src/main.ts": "other" }, f.base);
  f.release(otherRelease);
  const result = f.promote(plan);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /release branch changed/i);
  assert.equal(f.releaseSha(), otherRelease);
});

test("a concurrent release after the final check cannot be overwritten", (t) => {
  const f = fixture(t);
  f.release(f.base);
  f.main(f.commit({ ...baseline, "apps/api/src/main.ts": "v2" }, f.base));
  const plan = f.plan();
  const otherRelease = f.commit({ ...baseline, "apps/api/src/main.ts": "other" }, f.base);
  f.git(["push", "origin", `${otherRelease}:refs/heads/fixture`]);
  // Inject a competing update after remoteRefs(), during the actual push.
  writeFileSync(join(f.remote, "..", ".git", "hooks", "pre-push"),
    `#!/bin/sh\ngit --git-dir="$PWD/origin.git" update-ref refs/heads/amvera-api ${otherRelease}\n`,
    { mode: 0o755 });
  const result = f.promote(plan);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /git push failed/);
  assert.equal(f.releaseSha(), otherRelease);
});

test("remote read failures cannot become a successful no-change result", (t) => {
  const f = fixture(t);
  f.git(["remote", "set-url", "origin", join(f.remote, "missing")]);
  const result = f.run("plan");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /git ls-remote failed/);
  assert.equal(result.outputs.changed, undefined);
});
