import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";

// Compare snapshots, not a merge-base diff: main may have been amended.
// Keep all backend verification/build inputs here, including this release logic.
const backendPaths = [
  "apps/api", "packages/api-contract", "package.json", "pnpm-lock.yaml",
  "pnpm-workspace.yaml", "tsconfig.base.json", "turbo.json", "Dockerfile",
  ".dockerignore", "amvera.yaml", "docker/api-entrypoint.sh", ".github/workflows/backend-ci.yml",
  ".github/scripts", ".npmrc", ".pnpmfile.cjs", "patches",
];
const sourceRef = "refs/heads/main";
const releaseRef = "refs/heads/amvera-api";

function git(args, options = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`git ${args[0]} failed (${result.status}): ${result.stderr.trim()}`);
  }
  return result.stdout.trim();
}

function remoteRefs() {
  const lines = git(["ls-remote", "--refs", "origin", sourceRef, releaseRef]);
  const refs = new Map(lines.split("\n").filter(Boolean).map((line) => {
    const [sha, ref] = line.split(/\s+/);
    return [ref, sha];
  }));
  if (!refs.has(sourceRef)) throw new Error("Remote main branch is missing");
  return { source: refs.get(sourceRef), release: refs.get(releaseRef) ?? "" };
}

function hasBackendChanges(release, source) {
  if (!release) return true;
  const result = spawnSync("git", [
    "diff", "--quiet", "--no-ext-diff", "--no-textconv", release, source, "--", ...backendPaths,
  ], { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status === 0) return false;
  if (result.status === 1) return true;
  throw new Error(`git diff failed (${result.status}): ${result.stderr.trim()}`);
}

function output(values, summary) {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join("");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n\n`);
  console.log(summary);
}

function plan() {
  // Checkout selects current main after the workflow acquires its concurrency slot.
  // Every subsequent job must use this immutable SHA, not github.sha or main.
  const source = git(["rev-parse", "HEAD^{commit}"]);
  const { release } = remoteRefs();
  if (release) git(["fetch", "--no-tags", "origin", release]);
  const changed = hasBackendChanges(release, source);
  output({ source_sha: source, release_sha: release, changed }, changed
    ? `Backend verification required for source \`${source}\`.`
    : `No backend changes relative to release \`${release}\`; verification and promotion skipped.`);
}

function promote() {
  const source = process.env.SOURCE_SHA;
  const previous = process.env.EXPECTED_RELEASE_SHA;
  if (!/^[0-9a-f]{40}$/.test(source ?? "") || previous === undefined
      || (previous !== "" && !/^[0-9a-f]{40}$/.test(previous))) {
    throw new Error("SOURCE_SHA and EXPECTED_RELEASE_SHA must come from the release plan");
  }
  // This command is only called by the job that needs successful verification.
  const current = remoteRefs();
  if (current.source !== source) {
    output({ status: "superseded" }, `Source \`${source}\` was superseded; promotion skipped. The next queued run checks current main.`);
    return;
  }
  if (current.release !== previous) {
    throw new Error("The release branch changed after planning; refusing to publish. Run a new release plan.");
  }
  if (git(["rev-parse", "HEAD^{commit}"]) !== source) {
    throw new Error("Checkout does not match the verified source SHA");
  }
  if (previous) git(["fetch", "--no-tags", "origin", previous]);
  const tree = git(["rev-parse", `${source}^{tree}`]);
  const parents = previous ? ["-p", previous, "-p", source] : ["-p", source];
  const identity = {
    GIT_AUTHOR_NAME: "github-actions[bot]",
    GIT_AUTHOR_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
    GIT_COMMITTER_NAME: "github-actions[bot]",
    GIT_COMMITTER_EMAIL: "41898282+github-actions[bot]@users.noreply.github.com",
  };
  // Use the verified tree directly: merging file contents could retain deleted
  // files or introduce an untested conflict resolution. No working tree/index use.
  const release = git([
    "commit-tree", tree, ...parents, "-m", `ci(api): release verified backend\n\nSource-Commit: ${source}`,
  ], { env: { ...process.env, ...identity } });
  // The previous release is a parent, so even rewritten main uses fast-forward.
  // A concurrent release based on the same parent is rejected by ordinary push.
  git(["push", "origin", `${release}:${releaseRef}`]);
  output({ status: "promoted", release_sha: release }, `Promoted release \`${release}\` from verified source \`${source}\` (tree \`${tree}\`). Check the Amvera deployment separately.`);
}

try {
  if (process.argv[2] === "plan") plan();
  else if (process.argv[2] === "promote") promote();
  else throw new Error("Usage: node backend-release.mjs <plan|promote>");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
