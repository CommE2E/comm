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
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import type { SIWEWebViewMessage, SIWEResult } from 'lib/types/siwe-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
  type BindServerCallsParams,
} from 'lib/utils/action-utils.js';

import { useSelector } from '../redux/redux-utils.js';
import Alert from '../utils/alert.js';
import { getContentSigningKey } from '../utils/crypto-utils.js';
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
      const ed25519 = await getContentSigningKey();
      setPrimaryIdentityPublicKey(ed25519);
    })();
  }, [dispatchActionPromise, getSIWENonceCall]);

  const [isLoading, setLoading] = React.useState(true);
  const [walletConnectModalHeight, setWalletConnectModalHeight] =
    React.useState(0);
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  const snapPoints = React.useMemo(() => {
    if (isLoading) {
      return [1];
    } else if (walletConnectModalHeight) {
      const baseHeight = bottomInset + walletConnectModalHeight;
      if (baseHeight < 400) {
        return [baseHeight + 3];
      } else {
        return [baseHeight - 17];
      }
    } else {
      return [bottomInset + 435, bottomInset + 600];
    }
  }, [isLoading, walletConnectModalHeight, bottomInset]);

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
        const height = data.state === 'open' ? data.height : 0;
        setWalletConnectModalHeight(height);
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
  const loading = !getSIWENonceCallFailed && (isLoading || siweAuthCallLoading);
  React.useEffect(() => {
    setLoadingProp(loading);
  }, [setLoadingProp, loading]);

  return bottomSheet;
}

export default SIWEPanel;
