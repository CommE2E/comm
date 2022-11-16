// @flow
import * as React from 'react';
import Animated from 'react-native-reanimated';
import WebView from 'react-native-webview';

import { siweActionTypes, siwe } from 'lib/actions/user-actions';
import type {
  SIWEServerCall,
  SIWEResult,
  LogInExtraInfo,
  LogInStartingPayload,
} from 'lib/types/account-types';
import {
  useServerCall,
  useDispatchActionPromise,
  type DispatchActionPromise,
} from 'lib/utils/action-utils';

import { commCoreModule } from '../native-modules';
import { NavContext } from '../navigation/navigation-context';
import { useSelector } from '../redux/redux-utils';
import { nativeLogInExtraInfoSelector } from '../selectors/account-selectors';
import { defaultLandingURLPrefix } from '../utils/url-utils';
const commSIWE = `${defaultLandingURLPrefix}/siwe`;

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
  +siweAction: (siweInfo: SIWEServerCall) => Promise<SIWEResult>,
};

type WebViewProps = {};
type WebViewMethods = {
  +injectJavaScript: (script: string) => void,
};
type WebViewComponent = React.AbstractComponent<WebViewProps, WebViewMethods>;

function SIWEPanel({
  logInExtraInfo,
  dispatchActionPromise,
  siweAction,
}: Props) {
  const webviewRef = React.useRef<?React.ElementRef<WebViewComponent>>(null);
  async function setKey() {
    const { ed25519 } = await commCoreModule.getUserPublicKey();
    webviewRef.current?.injectJavaScript(
      `window.ReactNativeWebView.injectedPublicKey = ${ed25519}`,
    );
  }
  const handleSIWE = React.useCallback(
    async ({ address, message, signature }) => {
      const extraInfo = logInExtraInfo();
      dispatchActionPromise(
        siweActionTypes,
        siweAction({
          address,
          message,
          signature,
          ...extraInfo,
        }),
        undefined,
        ({ calendarQuery: extraInfo.calendarQuery }: LogInStartingPayload),
      );
    },
    [logInExtraInfo, dispatchActionPromise, siweAction],
  );
  const handleMessage = React.useCallback(
    event => {
      const {
        nativeEvent: { data },
      } = event;
      const { address, message, signature } = JSON.parse(data);
      if (address && signature) {
        handleSIWE({ address, message, signature });
      }
    },
    [handleSIWE],
  );
  const source = React.useMemo(() => ({ uri: commSIWE }), []);
  return (
    <WebView
      source={source}
      onMessage={handleMessage}
      ref={webviewRef}
      onLoadEnd={setKey}
    />
  );
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
    const callSiwe = useServerCall(siwe);

    return (
      <SIWEPanel
        {...props}
        logInExtraInfo={logInExtraInfo}
        dispatchActionPromise={dispatchActionPromise}
        siweAction={callSiwe}
      />
    );
  },
);

export default ConnectedSIWEPanel;
