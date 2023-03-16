// @flow

import * as React from 'react';

import { FeatureFlagsContext } from '../components/feature-flags-provider.react.js';

function useShouldRenderAvatars(): boolean {
  const { configuration: featureFlagConfig } =
    React.useContext(FeatureFlagsContext);

  return featureFlagConfig['AVATARS_DISPLAY'];
}

export { useShouldRenderAvatars };
