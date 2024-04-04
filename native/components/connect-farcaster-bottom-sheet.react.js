// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';

import FarcasterPrompt from './farcaster-prompt.react.js';
import FarcasterWebView, {
  type FarcasterWebViewState,
} from './farcaster-web-view.react.js';
import RegistrationButton from '../account/registration/registration-button.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';

type Props = {
  +navigation: RootNavigationProp<'ConnectFarcasterBottomSheet'>,
  +route: NavigationRoute<'ConnectFarcasterBottomSheet'>,
};

function ConnectFarcasterBottomSheet(props: Props): React.Node {
  const { navigation } = props;

  const { goBack } = navigation;

  const bottomSheetRef = React.useRef(null);

  const [webViewState, setWebViewState] =
    React.useState<FarcasterWebViewState>('closed');

  const onSuccessfulConnect = React.useCallback(() => {
    // TODO: Update fid
    bottomSheetRef.current?.close();
  }, []);

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
        <FarcasterWebView
          onSuccess={onSuccessfulConnect}
          webViewState={webViewState}
        />
      </BottomSheet>
    ),
    [
      connectButtonVariant,
      goBack,
      onPressConnect,
      onSuccessfulConnect,
      webViewState,
    ],
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
