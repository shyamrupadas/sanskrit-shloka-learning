import boundaries from "eslint-plugin-boundaries";

const outsideTargetElement = {
  relationship: {
    to: null,
  },
};

export const edSmallBoundariesConfig = {
  files: ["src/**/*.{ts,tsx}"],
  plugins: {
    boundaries,
  },
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
      },
    },
    "boundaries/flag-as-external": {
      customSourcePatterns: ["@sanskrit-shloka-learning/*"],
    },
    "boundaries/elements": [
      {
        pattern: "src/app",
        type: "app",
      },
      {
        capture: ["feature"],
        pattern: "src/features/*",
        type: "feature",
      },
      {
        pattern: "src/shared",
        type: "shared",
      },
    ],
  },
  rules: {
    "boundaries/no-unknown-files": "error",
    "boundaries/no-unknown": "error",
    "boundaries/dependencies": [
      "error",
      {
        default: "allow",
        message:
          "ED small dependency violation: ${file.type} must not import ${dependency.type}.",
        rules: [
          {
            from: { type: ["app", "shared", "feature"] },
            disallow: {
              dependency: outsideTargetElement,
              to: { type: "feature" },
            },
            message:
              "Import feature modules through their public API: index.ts(x) or route-level *.page.tsx.",
          },
          {
            from: { type: ["app", "shared", "feature"] },
            allow: {
              dependency: outsideTargetElement,
              to: {
                internalPath: ["index.ts", "index.tsx", "*.page.tsx"],
                type: "feature",
              },
            },
          },
          {
            from: { type: "shared" },
            disallow: { to: { type: ["app", "feature"] } },
          },
          {
            from: { type: "feature" },
            disallow: { to: { type: "app" } },
          },
        ],
      },
    ],
  },
};
