// @flow

import BottomSheet from '@gorhom/bottom-sheet';
import * as React from 'react';
import { ActivityIndicator, View, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
  siweAuth,
  siweAuthActionTypes,
} from 'lib/actions/siwe-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { LogInStartingPayload } from 'lib/types/account-types.js';
import type { SIWEWebViewMessage } from 'lib/types/siwe-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import type { LoggedOutMode } from './logged-out-modal.react.js';
import { commCoreModule } from '../native-modules.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors.js';
import { defaultLandingURLPrefix } from '../utils/url-utils.js';

const commSIWE = `${defaultLandingURLPrefix}/siwe`;

const getSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
const siweAuthLoadingStatusSelector =
  createLoadingStatusSelector(siweAuthActionTypes);

type Props = {
  +onClose: () => mixed,
  +nextMode: LoggedOutMode,
};
function SIWEPanel(props: Props): React.Node {
  const navContext = React.useContext(NavContext);
  const dispatchActionPromise = useDispatchActionPromise();
  const getSIWENonceCall = useServerCall(getSIWENonce);
  const siweAuthCall = useServerCall(siweAuth);

  const logInExtraInfo = useSelector(state =>
    nativeLogInExtraInfoSelector({
      redux: state,
      navContext,
    }),
  );

  const getSIWENonceCallFailed = useSelector(
    state => getSIWENonceLoadingStatusSelector(state) === 'error',
  );

  const { onClose } = props;
  React.useEffect(() => {
    if (getSIWENonceCallFailed) {
      Alert.alert(
        'Unknown error',
        'Uhh... try again?',
        [{ text: 'OK', onPress: onClose }],
        { cancelable: false },
      );
    }
  }, [getSIWENonceCallFailed, onClose]);

  const siweAuthCallLoading = useSelector(
    state => siweAuthLoadingStatusSelector(state) === 'loading',
  );

  const [nonce, setNonce] = React.useState<?string>(null);
  const [primaryIdentityPublicKey, setPrimaryIdentityPublicKey] =
    React.useState<?string>(null);

  React.useEffect(() => {
    (async () => {
      dispatchActionPromise(
        getSIWENonceActionTypes,
        (async () => {
          const response = await getSIWENonceCall();
          setNonce(response);
        })(),
      );
      await commCoreModule.initializeCryptoAccount();
      const { ed25519 } = await commCoreModule.getUserPublicKey();
      setPrimaryIdentityPublicKey(ed25519);
    })();
  }, [dispatchActionPromise, getSIWENonceCall]);

  const [isLoading, setLoading] = React.useState(true);
  const [isWalletConnectModalOpen, setWalletConnectModalOpen] =
    React.useState(false);
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const snapPoints = React.useMemo(() => {
    if (isLoading) {
      return [1];
    } else if (isWalletConnectModalOpen) {
      return [bottomInset + 600];
    } else {
      return [bottomInset + 435, bottomInset + 600];
    }
  }, [isLoading, isWalletConnectModalOpen, bottomInset]);

  const bottomSheetRef = React.useRef();
  const snapToIndex = bottomSheetRef.current?.snapToIndex;
  React.useEffect(() => {
    // When the snapPoints change, always reset to the first one
    // Without this, when we close the WalletConnect modal we don't resize
    snapToIndex?.(0);
  }, [snapToIndex, snapPoints]);

  const callSIWE = React.useCallback(
    async (message, signature, extraInfo) => {
      try {
        return await siweAuthCall({
          message,
          signature,
          ...extraInfo,
        });
      } catch (e) {
        Alert.alert(
          'Unknown error',
          'Uhh... try again?',
          [{ text: 'OK', onPress: onClose }],
          { cancelable: false },
        );
        throw e;
      }
    },
    [onClose, siweAuthCall],
  );

  const handleSIWE = React.useCallback(
    async ({ message, signature }) => {
      const { primaryIdentityPublicKey: publicKey, ...extraInfo } =
        await logInExtraInfo();

      dispatchActionPromise(
        siweAuthActionTypes,
        callSIWE(message, signature, extraInfo),
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
    },
    [logInExtraInfo, dispatchActionPromise, callSIWE],
  );
  const closeBottomSheet = bottomSheetRef.current?.close;
  const { nextMode } = props;
  const disableOnClose = React.useRef(false);
  const handleMessage = React.useCallback(
    async event => {
      const data: SIWEWebViewMessage = JSON.parse(event.nativeEvent.data);
      if (data.type === 'siwe_success') {
        const { address, message, signature } = data;
        if (address && signature) {
          disableOnClose.current = true;
          closeBottomSheet?.();
          await handleSIWE({ message, signature });
        }
      } else if (data.type === 'siwe_closed') {
        onClose();
        closeBottomSheet?.();
      } else if (data.type === 'walletconnect_modal_update') {
        setWalletConnectModalOpen(data.state === 'open');
      }
    },
    [handleSIWE, onClose, closeBottomSheet],
  );
  const prevNextModeRef = React.useRef();
  React.useEffect(() => {
    if (nextMode === 'prompt' && prevNextModeRef.current === 'siwe') {
      closeBottomSheet?.();
    }
    prevNextModeRef.current = nextMode;
  }, [nextMode, closeBottomSheet]);

  const source = React.useMemo(
    () => ({
      uri: commSIWE,
      headers: {
        'siwe-nonce': nonce,
        'siwe-primary-identity-public-key': primaryIdentityPublicKey,
      },
    }),
    [nonce, primaryIdentityPublicKey],
  );

  const onWebViewLoaded = React.useCallback(() => {
    setLoading(false);
  }, []);

  const backgroundStyle = React.useMemo(
    () => ({
      backgroundColor: '#242529',
    }),
    [],
  );

  const bottomSheetHandleIndicatorStyle = React.useMemo(
    () => ({
      backgroundColor: 'white',
    }),
    [],
  );

  const onBottomSheetChange = React.useCallback(
    (index: number) => {
      if (disableOnClose.current) {
        disableOnClose.current = false;
        return;
      }
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  let bottomSheet;
  if (nonce && primaryIdentityPublicKey) {
    bottomSheet = (
      <BottomSheet
        snapPoints={snapPoints}
        backgroundStyle={backgroundStyle}
        handleIndicatorStyle={bottomSheetHandleIndicatorStyle}
        enablePanDownToClose={true}
        onChange={onBottomSheetChange}
        ref={bottomSheetRef}
      >
        <WebView
          source={source}
          onMessage={handleMessage}
          onLoad={onWebViewLoaded}
          style={backgroundStyle}
          incognito={true}
        />
      </BottomSheet>
    );
  }

  let activity;
  if (!getSIWENonceCallFailed && (isLoading || siweAuthCallLoading)) {
    activity = <ActivityIndicator size="large" />;
  }

  const activityContainer = React.useMemo(
    () => ({
      flex: 1,
    }),
    [],
  );

  return (
    <>
      <View style={activityContainer}>{activity}</View>
      {bottomSheet}
    </>
  );
}

export default SIWEPanel;
