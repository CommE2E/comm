// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';
import {
  useCurrentUserFID,
  useCurrentUserSupportsDCs,
} from 'lib/utils/farcaster-utils.js';
import { useIsFarcasterDCsIntegrationEnabled } from 'lib/utils/services-utils.js';

import FarcasterPrompt from './farcaster-prompt.react.js';
import FarcasterWebView, {
  type FarcasterWebViewState,
} from './farcaster-web-view.react.js';
import PrimaryButton from './primary-button.react.js';
import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import ConnectFarcasterDCs from '../profile/connect-farcaster-dcs.react.js';
import { useTryLinkFID } from '../utils/farcaster-utils.js';

const farcasterPromptHeight = 350;
const marginBottom = 40;
const buttonHeight = 61;

type Props = {
  +navigation: RootNavigationProp<'ConnectFarcasterBottomSheet'>,
  +route: NavigationRoute<'ConnectFarcasterBottomSheet'>,
};

function ConnectFarcasterBottomSheet(props: Props): React.Node {
  const { navigation } = props;

  const { goBack } = navigation;

  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

  const [isLoadingLinkFID, setIsLoadingLinkFID] = React.useState(false);
  const [showConnectDCs, setShowConnectDCs] = React.useState(false);

  const fid = useCurrentUserFID();
  const currentUserSupportsDCs = useCurrentUserSupportsDCs();
  const supportsFarcasterDCs = useIsFarcasterDCsIntegrationEnabled();

  const tryLinkFID = useTryLinkFID();

  const onSuccess = React.useCallback(
    async (newFID: string) => {
      setWebViewState('closed');

      try {
        await tryLinkFID(newFID);
        if (supportsFarcasterDCs) {
          setShowConnectDCs(true);
        }
      } finally {
        setIsLoadingLinkFID(false);
      }
    },
    [tryLinkFID, supportsFarcasterDCs],
  );

  const bottomSheetContext = React.useContext(BottomSheetContext);
  invariant(bottomSheetContext, 'bottomSheetContext should be set');
  const { setContentHeight } = bottomSheetContext;

  const insets = useSafeAreaInsets();

  React.useLayoutEffect(() => {
    setContentHeight(
      farcasterPromptHeight + marginBottom + buttonHeight + insets.bottom,
    );
  }, [insets.bottom, setContentHeight]);

  const isAppForegrounded = useIsAppForegrounded();

  React.useEffect(() => {
    if (fid && isAppForegrounded) {
      if (currentUserSupportsDCs || !supportsFarcasterDCs) {
        goBack();
      } else if (supportsFarcasterDCs && !showConnectDCs) {
        setShowConnectDCs(true);
      }
    }
  }, [
    fid,
    goBack,
    isAppForegrounded,
    currentUserSupportsDCs,
    showConnectDCs,
    supportsFarcasterDCs,
  ]);

  const onPressConnect = React.useCallback(() => {
    setIsLoadingLinkFID(true);
    setWebViewState('opening');
  }, []);

  const onConnectDCsSuccess = React.useCallback(() => {
    setShowConnectDCs(false);
    goBack();
  }, [goBack]);

  const onConnectDCsCancel = React.useCallback(() => {
    setShowConnectDCs(false);
    goBack();
  }, [goBack]);

  const connectButtonVariant = isLoadingLinkFID ? 'loading' : 'enabled';

  const connectFarcasterBottomSheet = React.useMemo(() => {
    if (showConnectDCs) {
      return (
        <BottomSheet onClosed={goBack}>
          <ConnectFarcasterDCs
            onSuccess={onConnectDCsSuccess}
            onCancel={onConnectDCsCancel}
            useBottomSheetTextInput={true}
          />
        </BottomSheet>
      );
    }

    return (
      <BottomSheet onClosed={goBack}>
        <View style={styles.container}>
          <View style={styles.promptContainer}>
            <FarcasterPrompt textType="connect" />
          </View>
          <PrimaryButton
            onPress={onPressConnect}
            label="Connect Farcaster account"
            variant={connectButtonVariant}
          />
        </View>
        <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
      </BottomSheet>
    );
  }, [
    showConnectDCs,
    goBack,
    onConnectDCsSuccess,
    onConnectDCsCancel,
    onPressConnect,
    connectButtonVariant,
    onSuccess,
    webViewState,
  ]);

  return connectFarcasterBottomSheet;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  promptContainer: {
    marginBottom,
  },
});

export default ConnectFarcasterBottomSheet;
