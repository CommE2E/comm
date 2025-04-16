// @flow

import BottomSheet from '@gorhom/bottom-sheet';
import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
} from 'lib/actions/siwe-actions.js';
import {
  identityGenerateNonceActionTypes,
  useIdentityGenerateNonce,
} from 'lib/actions/user-actions.js';
import type { ServerCallSelectorParams } from 'lib/keyserver-conn/call-keyserver-endpoint-provider.react.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type {
  SIWEWebViewMessage,
  SIWEResult,
  SIWESignatureRequestData,
} from 'lib/types/siwe-types.js';
import { getContentSigningKey } from 'lib/utils/crypto-utils.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';
import { getPublicKeyFromSIWEStatement } from 'lib/utils/siwe-utils.js';

import { useKeyboardHeight } from '../keyboard/keyboard-hooks.js';
import { useSelector } from '../redux/redux-utils.js';
import type { BottomSheetRef } from '../types/bottom-sheet.js';
import type { WebViewMessageEvent } from '../types/web-view-types.js';
import { unknownErrorAlertDetails } from '../utils/alert-messages.js';
import Alert from '../utils/alert.js';
import { defaultLandingURLPrefix } from '../utils/url-utils.js';

const commSIWE = `${defaultLandingURLPrefix}/siwe`;

const getSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
const identityGenerateNonceLoadingStatusSelector = createLoadingStatusSelector(
  identityGenerateNonceActionTypes,
);

type NonceInfo =
  | { +nonceType: 'local', +nonce: string, +issuedAt: string }
  | { +nonceType: 'remote', +nonce: string, +nonceTimestamp: number };

type Props = {
  +onClosed: () => mixed,
  +onClosing: () => mixed,
  +onSuccessfulWalletSignature: SIWEResult => mixed,
  +siweSignatureRequestData: SIWESignatureRequestData,
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
  const { messageType, siweNonce, siweStatement, siweIssuedAt } =
    props.siweSignatureRequestData;

  const [nonceInfo, setNonceInfo] = React.useState<?NonceInfo>(null);
  const [primaryIdentityPublicKey, setPrimaryIdentityPublicKey] =
    React.useState<?string>(null);

  // This is set if we either succeed or fail, at which point we expect
  // to be unmounted/remounted by our parent component prior to a retry
  const nonceNotNeededRef = React.useRef(false);

  // When we succeed or fail, we call onSuccessOrCancel, which cancels
  // any pending setWalletConnectModalHeight callbacks
  const walletConnectModalHeightResetTimeout = React.useRef<?TimeoutID>();
  const onSuccessOrCancel = React.useCallback(() => {
    nonceNotNeededRef.current = true;
    if (walletConnectModalHeightResetTimeout.current) {
      clearTimeout(walletConnectModalHeightResetTimeout.current);
      walletConnectModalHeightResetTimeout.current = undefined;
    }
  }, []);

  React.useEffect(() => {
    if (siweNonce && siweStatement && siweIssuedAt) {
      setNonceInfo({
        nonce: siweNonce,
        issuedAt: siweIssuedAt,
        nonceType: 'local',
      });
      const siwePrimaryIdentityPublicKey =
        getPublicKeyFromSIWEStatement(siweStatement);
      setPrimaryIdentityPublicKey(siwePrimaryIdentityPublicKey);
      return;
    }
    if (nonceNotNeededRef.current) {
      return;
    }
    const generateNonce = async (nonceFunction: () => Promise<string>) => {
      try {
        const response = await nonceFunction();
        setNonceInfo({
          nonce: response,
          nonceTimestamp: Date.now(),
          nonceType: 'remote',
        });
      } catch (e) {
        Alert.alert(
          unknownErrorAlertDetails.title,
          unknownErrorAlertDetails.message,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccessOrCancel();
                onClosing();
              },
            },
          ],
          { cancelable: false },
        );
        throw e;
      }
    };

    void (async () => {
      void dispatchActionPromise(
        identityGenerateNonceActionTypes,
        generateNonce(identityGenerateNonce),
      );

      const ed25519 = await getContentSigningKey();
      setPrimaryIdentityPublicKey(ed25519);
    })();
  }, [
    dispatchActionPromise,
    getSIWENonceCall,
    identityGenerateNonce,
    onClosing,
    siweNonce,
    siweStatement,
    siweIssuedAt,
    onSuccessOrCancel,
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
  const nonceTimestamp = nonceInfo?.nonceTimestamp;
  const handleMessage = React.useCallback(
    async (event: WebViewMessageEvent) => {
      const data: SIWEWebViewMessage = JSON.parse(event.nativeEvent.data);
      if (data.type === 'siwe_success') {
        const { address, message, signature } = data;
        if (address && signature) {
          onSuccessOrCancel();
          closeBottomSheet?.();
          await onSuccessfulWalletSignature({
            address,
            message,
            signature,
            nonceTimestamp,
          });
        }
      } else if (data.type === 'siwe_closed') {
        onSuccessOrCancel();
        onClosing();
        closeBottomSheet?.();
      } else if (data.type === 'walletconnect_modal_update') {
        if (nonceNotNeededRef.current) {
          return;
        }
        const height = data.state === 'open' ? data.height : 0;
        if (!walletConnectModalHeight || height > 0) {
          setWalletConnectModalHeight(height);
          return;
        }
        walletConnectModalHeightResetTimeout.current = setTimeout(() => {
          if (!nonceNotNeededRef.current) {
            setWalletConnectModalHeight(height);
          }
        }, 50);
      }
    },
    [
      onSuccessfulWalletSignature,
      onClosing,
      closeBottomSheet,
      walletConnectModalHeight,
      nonceTimestamp,
      onSuccessOrCancel,
    ],
  );
  const prevClosingRef = React.useRef<?boolean>();
  React.useEffect(() => {
    if (closing && !prevClosingRef.current) {
      onSuccessOrCancel();
      closeBottomSheet?.();
    }
    prevClosingRef.current = closing;
  }, [closing, closeBottomSheet, onSuccessOrCancel]);

  const nonce = nonceInfo?.nonce;
  const issuedAt = nonceInfo?.issuedAt;
  const source = React.useMemo(
    () => ({
      uri: commSIWE,
      headers: {
        'siwe-nonce': nonce,
        'siwe-primary-identity-public-key': primaryIdentityPublicKey,
        'siwe-message-type': messageType,
        'siwe-message-issued-at': issuedAt,
      },
    }),
    [nonce, primaryIdentityPublicKey, messageType, issuedAt],
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
    !legacyGetSIWENonceCallFailed && !identityGenerateNonceFailed && isLoading;
  React.useEffect(() => {
    setLoadingProp(loading);
  }, [setLoadingProp, loading]);

  return bottomSheet;
}

export default SIWEPanel;
