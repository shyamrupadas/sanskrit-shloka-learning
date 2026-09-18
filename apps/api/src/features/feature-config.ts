export interface FeatureConfig {
  readonly reviewLearnedShlokasImmediately: boolean;
}

export const FEATURE_CONFIG = Symbol("FEATURE_CONFIG");

// Application-wide feature settings. Changes take effect after redeploying.
export const featureConfig: FeatureConfig = {
  // false defers newly learned shlokas until the next local user day.
  reviewLearnedShlokasImmediately: true,
};
