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
    "boundaries/no-unknown-dependencies": "error",
    "boundaries/dependencies": [
      "error",
      {
        default: "allow",
        message:
          "ED small dependency violation: {{from.element.type}} must not import {{to.element.type}}.",
        policies: [
          {
            from: { element: { type: ["app", "shared", "feature"] } },
            disallow: {
              dependency: outsideTargetElement,
              to: { element: { type: "feature" } },
            },
            message:
              "Import feature modules through their public API: index.ts(x) or route-level *.page.tsx.",
          },
          {
            from: { element: { type: ["app", "shared", "feature"] } },
            allow: {
              dependency: outsideTargetElement,
              to: {
                element: {
                  internalPath: ["index.ts", "index.tsx", "*.page.tsx"],
                  type: "feature",
                },
              },
            },
          },
          {
            from: { element: { type: "shared" } },
            disallow: { to: { element: { type: ["app", "feature"] } } },
          },
          {
            from: { element: { type: "feature" } },
            disallow: { to: { element: { type: "app" } } },
          },
        ],
      },
    ],
  },
};
