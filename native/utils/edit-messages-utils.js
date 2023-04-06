// @flow

import * as React from 'react';

import { FeatureFlagsContext } from '../components/feature-flags-provider.react.js';

function useShouldRenderEditButton(): boolean {
  const { configuration: featureFlagConfig } =
    React.useContext(FeatureFlagsContext);

  return !!featureFlagConfig['EDIT_BUTTON_DISPLAY'];
}

export { useShouldRenderEditButton };
