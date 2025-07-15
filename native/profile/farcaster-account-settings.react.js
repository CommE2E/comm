// @flow

import * as React from 'react';
import { ScrollView, View } from 'react-native';

import {
  useCurrentUserFID,
  useCurrentUserSupportsDCs,
  useUnlinkFID,
} from 'lib/utils/farcaster-utils.js';
import { supportsFarcasterDCs } from 'lib/utils/services-utils.js';

import ConnectFarcasterDCs from './connect-farcaster-dcs.react.js';
import type { ProfileNavigationProp } from './profile.react.js';
import FarcasterPrompt from '../components/farcaster-prompt.react.js';
import type { FarcasterWebViewState } from '../components/farcaster-web-view.react.js';
import FarcasterWebView from '../components/farcaster-web-view.react.js';
import PrimaryButton from '../components/primary-button.react.js';
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
  const currentUserSupportsDCs = useCurrentUserSupportsDCs();

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
  const [showConnectDCs, setShowConnectDCs] = React.useState(false);

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

  const onPressConnectDCs = React.useCallback(() => {
    setShowConnectDCs(true);
  }, []);

  const onConnectDCsSuccess = React.useCallback(() => {
    setShowConnectDCs(false);
  }, []);

  const onConnectDCsCancel = React.useCallback(() => {
    setShowConnectDCs(false);
  }, []);

  const disconnectButtonVariant = isLoadingUnlinkFID ? 'loading' : 'outline';

  const connectButtonVariant = isLoadingLinkFID ? 'loading' : 'enabled';

  const buttons = React.useMemo(() => {
    if (fid) {
      const buttonList = [
        <PrimaryButton
          key="disconnect"
          onPress={onPressDisconnect}
          label="Disconnect"
          variant={disconnectButtonVariant}
        />,
      ];

      if (supportsFarcasterDCs && !currentUserSupportsDCs) {
        buttonList.unshift(
          <PrimaryButton
            key="connect-dcs"
            onPress={onPressConnectDCs}
            label="Connect Direct Casts"
            variant="enabled"
          />,
        );
      }

      return buttonList;
    }

    return [
      <PrimaryButton
        key="connect"
        onPress={onPressConnectFarcaster}
        label="Connect Farcaster account"
        variant={connectButtonVariant}
      />,
    ];
  }, [
    connectButtonVariant,
    disconnectButtonVariant,
    fid,
    currentUserSupportsDCs,
    onPressConnectFarcaster,
    onPressDisconnect,
    onPressConnectDCs,
  ]);

  const farcasterPromptTextType = React.useMemo(() => {
    if (!fid) {
      return 'connect';
    }
    if (supportsFarcasterDCs && !currentUserSupportsDCs) {
      return 'disconnect_or_connect_DC';
    }
    return 'disconnect';
  }, [fid, currentUserSupportsDCs]);

  return React.useMemo(() => {
    if (showConnectDCs) {
      return (
        <ConnectFarcasterDCs
          onSuccess={onConnectDCsSuccess}
          onCancel={onConnectDCsCancel}
        />
      );
    }

    return (
      <View style={styles.connectContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollViewContentContainer}
          style={styles.promptContainer}
          alwaysBounceVertical={false}
        >
          <FarcasterPrompt textType={farcasterPromptTextType} />
        </ScrollView>
        <View style={styles.buttonContainer}>{buttons}</View>
        <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
      </View>
    );
  }, [
    buttons,
    farcasterPromptTextType,
    onConnectDCsCancel,
    onConnectDCsSuccess,
    onSuccess,
    showConnectDCs,
    styles.buttonContainer,
    styles.connectContainer,
    styles.promptContainer,
    styles.scrollViewContentContainer,
    webViewState,
  ]);
}

const unboundStyles = {
  connectContainer: {
    flex: 1,
    backgroundColor: 'panelBackground',
    paddingBottom: 16,
    justifyContent: 'space-between',
  },
  promptContainer: {
    padding: 16,
  },
  buttonContainer: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  scrollViewContentContainer: {
    padding: 16,
  },
};

export default FarcasterAccountSettings;
