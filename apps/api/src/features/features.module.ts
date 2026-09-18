import { Module } from "@nestjs/common";

import { FEATURE_CONFIG, featureConfig } from "./feature-config.js";

@Module({
  providers: [{ provide: FEATURE_CONFIG, useValue: featureConfig }],
  exports: [FEATURE_CONFIG],
})
export class FeaturesModule {}
