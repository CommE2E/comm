// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FIDContext } from 'lib/components/fid-provider.react.js';
import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';

import FarcasterPrompt from './farcaster-prompt.react.js';
import FarcasterWebView, {
  type FarcasterWebViewState,
} from './farcaster-web-view.react.js';
import RegistrationButton from '../account/registration/registration-button.react.js';
import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

const bottomSheetPaddingTop = 32;
const farcasterPromptHeight = 350;
const marginBottom = 40;
const buttonHeight = 48;

type Props = {
  +navigation: RootNavigationProp<'ConnectFarcasterBottomSheet'>,
  +route: NavigationRoute<'ConnectFarcasterBottomSheet'>,
};

function ConnectFarcasterBottomSheet(props: Props): React.Node {
  const { navigation } = props;

  const { goBack } = navigation;

  const bottomSheetRef = React.useRef(null);

  const fidContext = React.useContext(FIDContext);
  invariant(fidContext, 'fidContext is missing');
  const { fid, setFID } = fidContext;

  const bottomSheetContext = React.useContext(BottomSheetContext);
  invariant(bottomSheetContext, 'bottomSheetContext should be set');
  const { setContentHeight } = bottomSheetContext;

  const insets = useSafeAreaInsets();

  React.useLayoutEffect(() => {
    setContentHeight(
      bottomSheetPaddingTop +
        farcasterPromptHeight +
        marginBottom +
        buttonHeight +
        insets.bottom,
    );
  }, [insets.bottom, setContentHeight]);

  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

  const isAppForegrounded = useIsAppForegrounded();

  React.useEffect(() => {
    if (fid && isAppForegrounded) {
      bottomSheetRef.current?.close();
    }
  }, [fid, isAppForegrounded]);

  const onPressConnect = React.useCallback(() => {
    setWebViewState('opening');
  }, []);

  const connectButtonVariant =
    webViewState === 'opening' ? 'loading' : 'enabled';

  const connectFarcasterBottomSheet = React.useMemo(
    () => (
      <BottomSheet ref={bottomSheetRef} onClosed={goBack}>
        <View style={styles.container}>
          <View style={styles.promptContainer}>
            <FarcasterPrompt />
          </View>
          <RegistrationButton
            onPress={onPressConnect}
            label="Connect Farcaster account"
            variant={connectButtonVariant}
          />
        </View>
        <FarcasterWebView onSuccess={setFID} webViewState={webViewState} />
      </BottomSheet>
    ),
    [connectButtonVariant, goBack, onPressConnect, setFID, webViewState],
  );

  return connectFarcasterBottomSheet;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  promptContainer: {
    marginBottom: 40,
  },
});

export default ConnectFarcasterBottomSheet;
