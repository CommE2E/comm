// @flow

import * as React from 'react';
import { View } from 'react-native';

import { useCurrentUserFID, useUnlinkFID } from 'lib/utils/farcaster-utils.js';

import type { ProfileNavigationProp } from './profile.react.js';
import FarcasterPrompt from '../components/farcaster-prompt.react.js';
import FarcasterWebView from '../components/farcaster-web-view.react.js';
import type { FarcasterWebViewState } from '../components/farcaster-web-view.react.js';
import LoadingButton from '../components/loading-button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import { useTryLinkFID } from '../utils/farcaster-utils.js';

type Props = {
  +navigation: ProfileNavigationProp<'FarcasterAccountSettings'>,
  +route: NavigationRoute<'FarcasterAccountSettings'>,
};

// eslint-disable-next-line no-unused-vars
function FarcasterAccountSettings(props: Props): React.Node {
  const fid = useCurrentUserFID();

  const styles = useStyles(unboundStyles);

  const [isLoadingUnlinkFID, setIsLoadingUnlinkFID] = React.useState(false);

  const unlinkFID = useUnlinkFID();

  const onPressDisconnect = React.useCallback(async () => {
    setIsLoadingUnlinkFID(true);
    try {
      await unlinkFID();
    } catch {
      Alert.alert(
        unknownErrorAlertDetails.title,
        unknownErrorAlertDetails.message,
      );
    } finally {
      setIsLoadingUnlinkFID(false);
    }
  }, [unlinkFID]);

  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

  const [isLoadingLinkFID, setIsLoadingLinkFID] = React.useState(false);

  const tryLinkFID = useTryLinkFID();

  const onSuccess = React.useCallback(
    async (newFID: string) => {
      setWebViewState('closed');

      try {
        await tryLinkFID(newFID);
      } finally {
        setIsLoadingLinkFID(false);
      }
    },
    [tryLinkFID],
  );

  const onPressConnectFarcaster = React.useCallback(() => {
    setIsLoadingLinkFID(true);
    setWebViewState('opening');
  }, []);

  const disconnectButtonVariant = isLoadingUnlinkFID ? 'loading' : 'outline';

  const connectButtonVariant = isLoadingLinkFID ? 'loading' : 'enabled';

  const button = React.useMemo(() => {
    if (fid) {
      return (
        <LoadingButton
          onPress={onPressDisconnect}
          label="Disconnect"
          variant={disconnectButtonVariant}
        />
      );
    }

    return (
      <LoadingButton
        onPress={onPressConnectFarcaster}
        label="Connect Farcaster account"
        variant={connectButtonVariant}
      />
    );
  }, [
    connectButtonVariant,
    disconnectButtonVariant,
    fid,
    onPressConnectFarcaster,
    onPressDisconnect,
  ]);

  const farcasterPromptTextType = fid ? 'disconnect' : 'optional';
  const farcasterAccountSettings = React.useMemo(
    () => (
      <View style={styles.connectContainer}>
        <View style={styles.promptContainer}>
          <FarcasterPrompt textType={farcasterPromptTextType} />
        </View>
        <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
        <View style={styles.buttonContainer}>{button}</View>
      </View>
    ),
    [
      button,
      farcasterPromptTextType,
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
