// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setSyncedMetadataEntryActionType } from 'lib/actions/synced-metadata-actions.js';
import { currentUserFIDSelector } from 'lib/selectors/synced-metadata-selectors.js';
import { useIsAppForegrounded } from 'lib/shared/lifecycle-utils.js';
import { syncedMetadataNames } from 'lib/types/synced-metadata-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import FarcasterPrompt from './farcaster-prompt.react.js';
import FarcasterWebView, {
  type FarcasterWebViewState,
} from './farcaster-web-view.react.js';
import RegistrationButton from '../account/registration/registration-button.react.js';
import { BottomSheetContext } from '../bottom-sheet/bottom-sheet-provider.react.js';
import BottomSheet from '../bottom-sheet/bottom-sheet.react.js';
import type { RootNavigationProp } from '../navigation/root-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';

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

  const dispatch = useDispatch();

  const fid = useSelector(currentUserFIDSelector);

  const onSuccess = React.useCallback(
    (newFID: string) => {
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

  const { goBack } = navigation;

  const bottomSheetRef = React.useRef(null);

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
        <FarcasterWebView onSuccess={onSuccess} webViewState={webViewState} />
      </BottomSheet>
    ),
    [connectButtonVariant, goBack, onPressConnect, onSuccess, webViewState],
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
