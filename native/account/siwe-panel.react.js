// @flow

import * as React from 'react';
import WebView from 'react-native-webview';

import { registerActionTypes, register } from 'lib/actions/user-actions';
import type { LogInStartingPayload } from 'lib/types/account-types';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils';

import { NavContext } from '../navigation/navigation-context';
import { useSelector } from '../redux/redux-utils';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import { defaultLandingURLPrefix } from '../utils/url-utils';
import { setNativeCredentials } from './native-credentials';

const commSIWE = `${defaultLandingURLPrefix}/siwe`;

function SIWEPanel(): React.Node {
  const navContext = React.useContext(NavContext);
  const dispatchActionPromise = useDispatchActionPromise();
  const registerAction = useServerCall(register);

  const logInExtraInfo = useSelector(state =>
    nativeLogInExtraInfoSelector({
      redux: state,
      navContext,
    }),
  );

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

export default SIWEPanel;
