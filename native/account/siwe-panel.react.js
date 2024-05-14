// @flow

import BottomSheet from '@gorhom/bottom-sheet';
import * as React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
  legacySiweAuthActionTypes,
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
const legacySiweAuthLoadingStatusSelector = createLoadingStatusSelector(
  legacySiweAuthActionTypes,
);

type NonceInfo = {
  +nonce: string,
  +nonceTimestamp: number,
};

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
  const {
    siweSignatureRequestData: { messageType, messageToSign },
  } = props;

  const legacySiweAuthCallLoading = useSelector(
    state => legacySiweAuthLoadingStatusSelector(state) === 'loading',
  );

  const [nonceInfo, setNonceInfo] = React.useState<?NonceInfo>(null);
  const [primaryIdentityPublicKey, setPrimaryIdentityPublicKey] =
    React.useState<?string>(null);

  // This is set if we either succeed or fail, at which point we expect
  // to be unmounted/remounted by our parent component prior to a retry
  const nonceNotNeededRef = React.useRef(false);

  React.useEffect(() => {
    if (messageToSign) {
      return;
    }
    if (nonceNotNeededRef.current) {
      return;
    }
    const generateNonce = async (nonceFunction: () => Promise<string>) => {
      try {
        const response = await nonceFunction();
        setNonceInfo({ nonce: response, nonceTimestamp: Date.now() });
      } catch (e) {
        Alert.alert(
          UnknownErrorAlertDetails.title,
          UnknownErrorAlertDetails.message,
          [
            {
              text: 'OK',
              onPress: () => {
                nonceNotNeededRef.current = true;
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
    messageToSign,
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
          nonceNotNeededRef.current = true;
          closeBottomSheet?.();
          await onSuccessfulWalletSignature({
            address,
            message,
            signature,
            nonceTimestamp,
          });
        }
      } else if (data.type === 'siwe_closed') {
        nonceNotNeededRef.current = true;
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
      nonceTimestamp,
    ],
  );
  const prevClosingRef = React.useRef<?boolean>();
  React.useEffect(() => {
    if (closing && !prevClosingRef.current) {
      nonceNotNeededRef.current = true;
      closeBottomSheet?.();
    }
    prevClosingRef.current = closing;
  }, [closing, closeBottomSheet]);

  const nonce = nonceInfo?.nonce;
  const source = React.useMemo(() => {
    let headers;
    if (messageToSign) {
      headers = {
        'siwe-message-type': messageType,
        'siwe-message-to-sign': encodeURIComponent(messageToSign),
      };
    } else {
      headers = {
        'siwe-nonce': nonce,
        'siwe-primary-identity-public-key': primaryIdentityPublicKey,
        'siwe-message-type': messageType,
      };
    }

    return { uri: commSIWE, headers };
  }, [nonce, primaryIdentityPublicKey, messageType, messageToSign]);

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
  if ((nonce && primaryIdentityPublicKey) || messageToSign) {
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
