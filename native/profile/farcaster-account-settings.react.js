// @flow

import * as React from 'react';
import { View } from 'react-native';

import {
  setSyncedMetadataEntryActionType,
  clearSyncedMetadataEntryActionType,
} from 'lib/actions/synced-metadata-actions.js';
import { syncedMetadataNames } from 'lib/types/synced-metadata-types.js';
import { useCurrentUserFID } from 'lib/utils/farcaster-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import RegistrationButton from '../account/registration/registration-button.react.js';
import FarcasterPrompt from '../components/farcaster-prompt.react.js';
import FarcasterWebView from '../components/farcaster-web-view.react.js';
import type { FarcasterWebViewState } from '../components/farcaster-web-view.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +navigation: ProfileNavigationProp<'FarcasterAccountSettings'>,
  +route: NavigationRoute<'FarcasterAccountSettings'>,
};

// eslint-disable-next-line no-unused-vars
function FarcasterAccountSettings(props: Props): React.Node {
  const dispatch = useDispatch();

  const fid = useCurrentUserFID();

  const styles = useStyles(unboundStyles);

  const onPressDisconnect = React.useCallback(() => {
    dispatch({
      type: clearSyncedMetadataEntryActionType,
      payload: {
        name: syncedMetadataNames.CURRENT_USER_FID,
      },
    });
  }, [dispatch]);

  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

  const onSuccess = React.useCallback(
    (newFID: string) => {
      setWebViewState('closed');
      dispatch({
        type: setSyncedMetadataEntryActionType,
        payload: {
          name: syncedMetadataNames.CURRENT_USER_FID,
          data: newFID,
        },
      });
    },
    [dispatch],
  );

  const onPressConnectFarcaster = React.useCallback(() => {
    setWebViewState('opening');
  }, []);

  const connectButtonVariant =
    webViewState === 'opening' ? 'loading' : 'enabled';

  const button = React.useMemo(() => {
    if (fid) {
      return (
        <RegistrationButton
          onPress={onPressDisconnect}
          label="Disconnect"
          variant="outline"
        />
      );
    }

    return (
      <RegistrationButton
        onPress={onPressConnectFarcaster}
        label="Connect Farcaster account"
        variant={connectButtonVariant}
      />
    );
  }, [connectButtonVariant, fid, onPressConnectFarcaster, onPressDisconnect]);

  const farcasterAccountSettings = React.useMemo(
    () => (
      <View style={styles.connectContainer}>
        <View style={styles.promptContainer}>
          <FarcasterPrompt showDisconnectText={!!fid} />
        </View>
        <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
        <View style={styles.buttonContainer}>{button}</View>
      </View>
    ),
    [
      button,
      fid,
      onSuccess,
      styles.buttonContainer,
      styles.connectContainer,
      styles.promptContainer,
      webViewState,
    ],
  );

  return farcasterAccountSettings;
}

const unboundStyles = {
  connectContainer: {
    flex: 1,
    backgroundColor: 'panelBackground',
    paddingBottom: 16,
  },
  promptContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  buttonContainer: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
};

export default FarcasterAccountSettings;
