// @flow
import * as React from 'react';
import Animated from 'react-native-reanimated';
import WebView from 'react-native-webview';

import { registerActionTypes, register } from 'lib/actions/user-actions';
import type {
  RegisterInfo,
  LogInExtraInfo,
  RegisterResult,
  LogInStartingPayload,
} from 'lib/types/account-types';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils';

import { NavContext } from '../navigation/navigation-context';
import { useSelector } from '../redux/redux-utils';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import { setNativeCredentials } from './native-credentials';
const commSIWE = __DEV__
  ? 'http://localhost/commlanding/siwe'
  : 'https://comm.app/siwe';

type BaseProps = {
  +setActiveAlert: (activeAlert: boolean) => void,
  +opacityValue: Animated.Node,
};
type Props = {
  ...BaseProps,
  // Redux state
  +logInExtraInfo: () => LogInExtraInfo,
  // Redux dispatch functions
  +dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  +registerAction: (registerInfo: RegisterInfo) => Promise<RegisterResult>,
};

function SIWEPanel({
  logInExtraInfo,
  dispatchActionPromise,
  registerAction,
}: Props) {
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
  const handleMessage = React.useCallback(
    event => {
      const {
        nativeEvent: { data },
      } = event;
      const { address, signature } = JSON.parse(data);
      if (address && signature) {
        handleSIWE({ address, signature });
      }
    },
    [handleSIWE],
  );
  const source = React.useMemo(() => ({ uri: commSIWE }), []);
  return <WebView source={source} onMessage={handleMessage} />;
}
const ConnectedSIWEPanel: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedRegisterPanel(props: BaseProps) {
    const navContext = React.useContext(NavContext);
    const logInExtraInfo = useSelector(state =>
      nativeLogInExtraInfoSelector({
        redux: state,
        navContext,
      }),
    );

    const dispatchActionPromise = useDispatchActionPromise();
    const callRegister = useServerCall(register);

    return (
      <SIWEPanel
        {...props}
        logInExtraInfo={logInExtraInfo}
        dispatchActionPromise={dispatchActionPromise}
        registerAction={callRegister}
      />
    );
  },
);

export default ConnectedSIWEPanel;
