// @flow

import * as React from 'react';
import Alert from 'react-native/Libraries/Alert/Alert.js';

import { FeatureFlagsContext } from '../components/feature-flags-provider.react.js';

function useShouldRenderEditButton(): boolean {
  const { configuration: featureFlagConfig } =
    React.useContext(FeatureFlagsContext);

  return !!featureFlagConfig['EDIT_BUTTON_DISPLAY'];
}

function exitEditAlert(onDiscard: () => void): void {
  Alert.alert('Are you sure?', 'Your edits will be discarded.', [
    {
      text: 'Continue editing',
      style: 'cancel',
    },
    {
      text: 'Discard edit',
      style: 'destructive',
      onPress: () => {
        onDiscard();
      },
    },
  ]);
}

export { useShouldRenderEditButton, exitEditAlert };
