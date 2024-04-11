// @flow

import BottomSheet from '@gorhom/bottom-sheet';
import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
  siweAuthActionTypes,
} from 'lib/actions/siwe-actions.js';
import {
  identityGenerateNonceActionTypes,
  useIdentityGenerateNonce,
} from 'lib/actions/user-actions.js';
import type { ServerCallSelectorParams } from 'lib/keyserver-conn/call-keyserver-endpoint-provider.react.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  SIWEWebViewMessage,
  SIWEResult,
  SIWEMessageType,
} from 'lib/types/siwe-types.js';
import { useLegacyAshoatKeyserverCall } from 'lib/utils/action-utils.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { usingCommServicesAccessToken } from 'lib/utils/services-utils.js';

import { useKeyboardHeight } from '../keyboard/keyboard-hooks.js';
import { useSelector } from '../redux/redux-utils.js';
import type { BottomSheetRef } from '../types/bottom-sheet.js';
import type { WebViewMessageEvent } from '../types/web-view-types.js';
import { UnknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import { defaultLandingURLPrefix } from '../utils/url-utils.js';

const commSIWE = `${defaultLandingURLPrefix}/siwe`;

const getSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
const identityGenerateNonceLoadingStatusSelector = createLoadingStatusSelector(
  identityGenerateNonceActionTypes,
);
const legacySiweAuthLoadingStatusSelector =
  createLoadingStatusSelector(siweAuthActionTypes);

type Props = {
  +onClosed: () => mixed,
  +onClosing: () => mixed,
  +onSuccessfulWalletSignature: SIWEResult => mixed,
  +siweMessageType: SIWEMessageType,
  +closing: boolean,
  +setLoading: boolean => mixed,
  +keyserverCallParamOverride?: Partial<ServerCallSelectorParams>,
};
function SIWEPanel(props: Props): React.Node {
  const dispatchActionPromise = useDispatchActionPromise();
  const getSIWENonceCall = useLegacyAshoatKeyserverCall(
    getSIWENonce,
    props.keyserverCallParamOverride,
  );
  const identityGenerateNonce = useIdentityGenerateNonce();

  const legacyGetSIWENonceCallFailed = useSelector(
    state => getSIWENonceLoadingStatusSelector(state) === 'error',
  );
  const identityGenerateNonceFailed = useSelector(
    state => identityGenerateNonceLoadingStatusSelector(state) === 'error',
  );

  const { onClosing } = props;
  const { siweMessageType } = props;

  const legacySiweAuthCallLoading = useSelector(
    state => legacySiweAuthLoadingStatusSelector(state) === 'loading',
  );

  const [nonce, setNonce] = React.useState<?string>(null);
  const [primaryIdentityPublicKey, setPrimaryIdentityPublicKey] =
    React.useState<?string>(null);

  React.useEffect(() => {
    const generateNonce = async (nonceFunction: () => Promise<string>) => {
      try {
        const response = await nonceFunction();
        setNonce(response);
      } catch (e) {
        Alert.alert(
          UnknownErrorAlertDetails.title,
          UnknownErrorAlertDetails.message,
          [{ text: 'OK', onPress: onClosing }],
          { cancelable: false },
        );
        throw e;
      }
    };

    void (async () => {
      if (usingCommServicesAccessToken) {
        void dispatchActionPromise(
          identityGenerateNonceActionTypes,
          generateNonce(identityGenerateNonce),
        );
      } else {
        void dispatchActionPromise(
          getSIWENonceActionTypes,
          generateNonce(getSIWENonceCall),
        );
      }

      const ed25519 = await getContentSigningKey();
      setPrimaryIdentityPublicKey(ed25519);
    })();
  }, [
    dispatchActionPromise,
    getSIWENonceCall,
    identityGenerateNonce,
    onClosing,
  ]);

  const [isLoading, setLoading] = React.useState(true);
  const [walletConnectModalHeight, setWalletConnectModalHeight] =
    React.useState(0);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const bottomInset = insets.bottom;
  const snapPoints = React.useMemo(() => {
    if (isLoading) {
      return [1];
    } else if (walletConnectModalHeight) {
      const baseHeight =
        bottomInset + walletConnectModalHeight + keyboardHeight;
      if (baseHeight < 400) {
        return [baseHeight - 10];
      } else {
        return [baseHeight + 5];
      }
    } else {
      const baseHeight = bottomInset + keyboardHeight;
      return [baseHeight + 435, baseHeight + 600];
    }
  }, [isLoading, walletConnectModalHeight, bottomInset, keyboardHeight]);

  const bottomSheetRef = React.useRef<?BottomSheetRef>();
  const snapToIndex = bottomSheetRef.current?.snapToIndex;
  React.useEffect(() => {
    // When the snapPoints change, always reset to the first one
    // Without this, when we close the WalletConnect modal we don't resize
    snapToIndex?.(0);
  }, [snapToIndex, snapPoints]);

  const closeBottomSheet = bottomSheetRef.current?.close;
  const { closing, onSuccessfulWalletSignature } = props;
  const handleMessage = React.useCallback(
    async (event: WebViewMessageEvent) => {
      const data: SIWEWebViewMessage = JSON.parse(event.nativeEvent.data);
      if (data.type === 'siwe_success') {
        const { address, message, signature } = data;
        if (address && signature) {
          closeBottomSheet?.();
          await onSuccessfulWalletSignature({ address, message, signature });
        }
      } else if (data.type === 'siwe_closed') {
        onClosing();
        closeBottomSheet?.();
      } else if (data.type === 'walletconnect_modal_update') {
        const height = data.state === 'open' ? data.height : 0;
        if (!walletConnectModalHeight || height > 0) {
          setWalletConnectModalHeight(height);
        }
      }
    },
    [
      onSuccessfulWalletSignature,
      onClosing,
      closeBottomSheet,
      walletConnectModalHeight,
    ],
  );
  const prevClosingRef = React.useRef<?boolean>();
  React.useEffect(() => {
    if (closing && !prevClosingRef.current) {
      closeBottomSheet?.();
    }
    prevClosingRef.current = closing;
  }, [closing, closeBottomSheet]);

  const source = React.useMemo(
    () => ({
      uri: commSIWE,
      headers: {
        'siwe-nonce': nonce,
        'siwe-primary-identity-public-key': primaryIdentityPublicKey,
        'siwe-message-type': siweMessageType,
      },
    }),
    [nonce, primaryIdentityPublicKey, siweMessageType],
  );

  const onWebViewLoaded = React.useCallback(() => {
    setLoading(false);
  }, []);

  const walletConnectModalOpen = walletConnectModalHeight !== 0;
  const backgroundStyle = React.useMemo(
    () => ({
      backgroundColor: walletConnectModalOpen ? '#3396ff' : '#242529',
    }),
    [walletConnectModalOpen],
  );

  const bottomSheetHandleIndicatorStyle = React.useMemo(
    () => ({
      backgroundColor: 'white',
    }),
    [],
  );

  const { onClosed } = props;
  const onBottomSheetChange = React.useCallback(
    (index: number) => {
      if (index === -1) {
        onClosed();
      }
    },
    [onClosed],
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

  const setLoadingProp = props.setLoading;
  const loading =
    !legacyGetSIWENonceCallFailed &&
    !identityGenerateNonceFailed &&
    (isLoading || legacySiweAuthCallLoading);
  React.useEffect(() => {
    setLoadingProp(loading);
  }, [setLoadingProp, loading]);

  return bottomSheet;
}

export default SIWEPanel;
