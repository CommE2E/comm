// @flow

import BottomSheet from '@gorhom/bottom-sheet';
import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import WebView from 'react-native-webview';

import {
  getSIWENonce,
  getSIWENonceActionTypes,
} from 'lib/actions/siwe-actions';
import { registerActionTypes, register } from 'lib/actions/user-actions';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors';
import type { LogInStartingPayload } from 'lib/types/account-types';
import type { SIWEWebViewMessage } from 'lib/types/siwe-types';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import { NavContext } from '../navigation/navigation-context';
import { useSelector } from '../redux/redux-utils';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import { defaultLandingURLPrefix } from '../utils/url-utils';
import type { LoggedOutMode } from './logged-out-modal.react';
import { setNativeCredentials } from './native-credentials';

const commSIWE = `${defaultLandingURLPrefix}/siwe`;

const getSIWENonceLoadingStatusSelector = createLoadingStatusSelector(
  getSIWENonceActionTypes,
);

type Props = {
  +onClose: () => mixed,
  +nextMode: LoggedOutMode,
};
function SIWEPanel(props: Props): React.Node {
  const navContext = React.useContext(NavContext);
  const dispatchActionPromise = useDispatchActionPromise();
  const registerAction = useServerCall(register);
  const getSIWENonceCall = useServerCall(getSIWENonce);

  const logInExtraInfo = useSelector(state =>
    nativeLogInExtraInfoSelector({
      redux: state,
      navContext,
    }),
  );

  const getSIWENonceCallFailed = useSelector(
    state => getSIWENonceLoadingStatusSelector(state) === 'error',
  );

  const [nonce, setNonce] = React.useState<?string>(null);

  React.useEffect(() => {
    (async () => {
      dispatchActionPromise(
        getSIWENonceActionTypes,
        (async () => {
          const response = await getSIWENonceCall();
          setNonce(response);
        })(),
      );
    })();
  }, [dispatchActionPromise, getSIWENonceCall]);

  const [isLoading, setLoading] = React.useState(true);
  const [isWalletConnectModalOpen, setWalletConnectModalOpen] = React.useState(
    false,
  );
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

  const handleSIWE = React.useCallback(
    ({ address, signature }) => {
      // this is all mocked from register-panel
      const extraInfo = logInExtraInfo();
      dispatchActionPromise(
        registerActionTypes,
        registerAction({
          username: address,
          password: signature,
          ...extraInfo,
        }),
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
      setNativeCredentials({ username: address, password: signature });
    },
    [logInExtraInfo, dispatchActionPromise, registerAction],
  );
  const closeBottomSheet = bottomSheetRef.current?.close;
  const { onClose, nextMode } = props;
  const handleMessage = React.useCallback(
    event => {
      const data: SIWEWebViewMessage = JSON.parse(event.nativeEvent.data);
      if (data.type === 'siwe_success') {
        const { address, signature } = data;
        if (address && signature) {
          handleSIWE({ address, signature });
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
      },
    }),
    [nonce],
  );

  const onWebViewLoaded = React.useCallback(() => {
    setLoading(false);
  }, []);

  const handleStyle = React.useMemo(
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
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  let bottomSheet;
  if (nonce) {
    bottomSheet = (
      <BottomSheet
        snapPoints={snapPoints}
        backgroundStyle={handleStyle}
        handleIndicatorStyle={bottomSheetHandleIndicatorStyle}
        enablePanDownToClose={true}
        onChange={onBottomSheetChange}
        ref={bottomSheetRef}
      >
        <WebView
          source={source}
          onMessage={handleMessage}
          onLoad={onWebViewLoaded}
        />
      </BottomSheet>
    );
  }

  let activity;
  if (getSIWENonceCallFailed) {
    activity = <Text>Oops, try again later!</Text>;
  } else if (isLoading) {
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
