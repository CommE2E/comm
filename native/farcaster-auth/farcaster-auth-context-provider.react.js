// @flow

import * as React from 'react';
import WebView from 'react-native-webview';

import {
  type AuthMessageSigningInput,
  FarcasterAuthContext,
  type SignedMessage,
} from 'lib/components/farcaster-auth-context.js';
import { farcasterSignerTimeout } from 'lib/shared/timeouts.js';
import { createFarcasterDCsAuthMessage } from 'lib/utils/farcaster-utils.js';
import sleep from 'lib/utils/sleep.js';

import bundledScript from './dist/farcaster-signer.bundle.js.raw';
import type { WebViewMessageEvent } from '../types/web-view-types.js';

type WebViewMessageData =
  | {
      +result: 'success',
      +signature: string,
    }
  | { +result: 'failure', +error: string };

type Props = {
  +children: React.Node,
};

function FarcasterAuthContextProvider(props: Props): React.Node {
  const [promiseHandlers, setPromiseHandlers] = React.useState<?{
    +resolve: string => mixed,
    +reject: string => mixed,
  }>(null);
  const [loaded, setLoaded] = React.useState<boolean>(false);
  const [authParams, setAuthParams] = React.useState<?{
    +message: string,
    +mnemonic: string,
  }>(null);
  const webViewRef = React.useRef(null);

  const onLoad = React.useCallback(() => {
    setLoaded(true);
  }, []);

  const handleMessage = React.useCallback(
    (event: WebViewMessageEvent) => {
      if (!promiseHandlers) {
        return;
      }
      const data: WebViewMessageData = JSON.parse(event.nativeEvent.data);
      if (data.result === 'success') {
        promiseHandlers.resolve(data.signature);
      } else {
        promiseHandlers.reject(data.error);
      }
    },
    [promiseHandlers],
  );

  React.useEffect(() => {
    if (loaded && authParams) {
      // We have to use a timeout to work around this bug
      // https://github.com/react-native-webview/react-native-webview/issues/341
      webViewRef.current?.injectJavaScript(`
        setTimeout(
          () => window.onDataCallback(
            \`${authParams.message}\`,
            \`${authParams.mnemonic}\`
          ), 100);
      `);
    }
  }, [authParams, loaded]);

  const signAuthMessage = React.useCallback(
    async (input: AuthMessageSigningInput) => {
      if (promiseHandlers) {
        promiseHandlers.reject('Signing already in progress');
      }
      const authMessage = createFarcasterDCsAuthMessage(input.fid, input.nonce);
      const promise = new Promise<SignedMessage>((resolve, reject) => {
        setPromiseHandlers({
          resolve: (signature: string) =>
            resolve({
              message: authMessage,
              signature,
            }),
          reject,
        });
      });

      const timeoutPromise = (async () => {
        await sleep(farcasterSignerTimeout);
        throw new Error('Signing timed out');
      })();

      setAuthParams({
        message: authMessage,
        mnemonic: input.walletMnemonic,
      });

      return Promise.race([promise, timeoutPromise]);
    },
    [promiseHandlers],
  );

  const value = React.useMemo(
    () => ({
      signAuthMessage,
    }),
    [signAuthMessage],
  );
  return (
    <FarcasterAuthContext.Provider value={value}>
      <WebView
        ref={webViewRef}
        incognito={true}
        onMessage={handleMessage}
        source={htmlContent}
        containerStyle={containerStyle}
        onLoad={onLoad}
      />
      {props.children}
    </FarcasterAuthContext.Provider>
  );
}

const containerStyle = { position: 'absolute', width: 0, height: 0 };

const htmlContent = {
  html: `
    <head>
      <script type="text/javascript">${bundledScript}</script>
    </head>`,
};

export { FarcasterAuthContextProvider };
