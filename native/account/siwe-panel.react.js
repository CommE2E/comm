// @flow

import BottomSheet from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
  siweAuthActionTypes,
} from 'lib/actions/siwe-actions.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { SIWEWebViewMessage, SIWEResult } from 'lib/types/siwe-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
  type BindServerCallsParams,
} from 'lib/utils/action-utils.js';

import { commCoreModule } from '../native-modules.js';
import { useSelector } from '../redux/redux-utils.js';
import { defaultLandingURLPrefix } from '../utils/url-utils.js';

const commSIWE = `${defaultLandingURLPrefix}/siwe`;

const getSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);
const siweAuthLoadingStatusSelector =
  createLoadingStatusSelector(siweAuthActionTypes);

type Props = {
  +onClosed: () => mixed,
  +onClosing: () => mixed,
  +onSuccessfulWalletSignature: SIWEResult => mixed,
  +closing: boolean,
  +setLoading: boolean => mixed,
  +keyserverCallParamOverride?: $Shape<BindServerCallsParams>,
};
function SIWEPanel(props: Props): React.Node {
  const dispatchActionPromise = useDispatchActionPromise();
  const getSIWENonceCall = useServerCall(
    getSIWENonce,
    props.keyserverCallParamOverride,
  );

  const getSIWENonceCallFailed = useSelector(
    state => getSIWENonceLoadingStatusSelector(state) === 'error',
  );

  const { onClosing } = props;
  React.useEffect(() => {
    if (getSIWENonceCallFailed) {
      Alert.alert(
        'Unknown error',
        'Uhh... try again?',
        [{ text: 'OK', onPress: onClosing }],
        { cancelable: false },
      );
    }
  }, [getSIWENonceCallFailed, onClosing]);

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
      const {
        primaryIdentityPublicKeys: { ed25519 },
      } = await commCoreModule.getUserPublicKey();
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

  const closeBottomSheet = bottomSheetRef.current?.close;
  const { closing, onSuccessfulWalletSignature } = props;
  const handleMessage = React.useCallback(
    async event => {
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
        setWalletConnectModalOpen(data.state === 'open');
      }
    },
    [onSuccessfulWalletSignature, onClosing, closeBottomSheet],
  );
  const prevClosingRef = React.useRef();
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
  const loading = !getSIWENonceCallFailed && (isLoading || siweAuthCallLoading);
  React.useEffect(() => {
    setLoadingProp(loading);
  }, [setLoadingProp, loading]);

  return bottomSheet;
}

export default SIWEPanel;
