// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import DirectoryPrompt from './directory-prompt.react.js';
import { type NUXTip, nuxTip } from './nux-tips-context.react.js';
import PrimaryButton from './primary-button.react.js';
import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import {
  type NavigationRoute,
  NUXTipOverlayBackdropRouteName,
} from '../navigation/route-names.js';

const directoryPromptHeight = 300;
const marginBottom = 40;
const buttonHeight = 61;

const orderedTips: $ReadOnlyArray<NUXTip> = [nuxTip.COMMUNITY_DIRECTORY];

type Props = {
  +navigation: RootNavigationProp<'DirectoryPromptBottomSheet'>,
  +route: NavigationRoute<'DirectoryPromptBottomSheet'>,
};

function DirectoryPromptBottomSheet(props: Props): React.Node {
  const { navigation } = props;

  const { goBack } = navigation;

  const bottomSheetRef = React.useRef(null);

  const bottomSheetContext = React.useContext(BottomSheetContext);
  invariant(bottomSheetContext, 'bottomSheetContext should be set');
  const { setContentHeight } = bottomSheetContext;

  const insets = useSafeAreaInsets();

  React.useLayoutEffect(() => {
    setContentHeight(
      directoryPromptHeight +
        marginBottom +
        buttonHeight +
        buttonHeight +
        insets.bottom,
    );
  }, [insets.bottom, setContentHeight]);

  const onPressAccept = React.useCallback(() => {
    console.log('User accepted the prompt');
  }, []);

  const onCloseOrPressDecline = React.useCallback(() => {
    goBack();
    navigation.navigate<'NUXTipOverlayBackdrop'>({
      name: NUXTipOverlayBackdropRouteName,
      params: {
        orderedTips,
      },
    });
  }, [goBack, navigation]);

  const directoryPromptBottomSheet = React.useMemo(
    () => (
      <BottomSheet ref={bottomSheetRef} onClosed={onCloseOrPressDecline}>
        <View style={styles.container}>
          <View style={styles.promptContainer}>
            <DirectoryPrompt />
          </View>
          <View style={styles.buttonContainer}>
            <PrimaryButton
              onPress={onPressAccept}
              label="Explore communities"
              variant="enabled"
            />
            <PrimaryButton
              onPress={onCloseOrPressDecline}
              label="No thanks"
              variant="outline"
            />
          </View>
        </View>
      </BottomSheet>
    ),
    [onPressAccept, onCloseOrPressDecline],
  );

  return directoryPromptBottomSheet;
}

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  promptContainer: {
    marginBottom,
  },
});

export default DirectoryPromptBottomSheet;
