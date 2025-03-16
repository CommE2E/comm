// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';
import {
  useCurrentUserFID,
  useSetLocalFID,
} from 'lib/utils/farcaster-utils.js';

import FarcasterPrompt from './farcaster-prompt.react.js';
import FarcasterWebView, {
  type FarcasterWebViewState,
} from './farcaster-web-view.react.js';
import PrimaryButton from './primary-button.react.js';
import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
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

  const fid = useCurrentUserFID();

  const tryLinkFID = useTryLinkFID();

  const setLocalFID = useSetLocalFID();

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

  const bottomSheetRef = React.useRef(null);

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
      bottomSheetRef.current?.close();
    }
  }, [fid, isAppForegrounded]);

  const onPressConnect = React.useCallback(() => {
    setIsLoadingLinkFID(true);
    setWebViewState('opening');
  }, []);

  const connectButtonVariant = isLoadingLinkFID ? 'loading' : 'enabled';

  const onClosed = React.useCallback(() => {
    if (!fid) {
      setLocalFID(null);
    }
    goBack();
  }, [fid, setLocalFID, goBack]);

  const connectFarcasterBottomSheet = React.useMemo(
    () => (
      <BottomSheet ref={bottomSheetRef} onClosed={onClosed}>
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
    ),
    [onClosed, onPressConnect, connectButtonVariant, onSuccess, webViewState],
  );

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
