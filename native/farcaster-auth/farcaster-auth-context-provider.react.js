// @flow

import * as React from 'react';
import WebView from 'react-native-webview';

import {
  type AuthMessageSigningInput,
  FarcasterAuthContext,
  type SignedMessage,
} from 'lib/components/farcaster-auth-context.js';

import bundledScript from './dist/farcaster-signer.bundle.js.raw';
import type { WebViewMessageEvent } from '../types/web-view-types.js';

type WebViewMessageData =
  | {
      +result: 'success',
      +signature: string,
    }
  | { +result: 'failure' };

type Props = {
  +children: React.Node,
};

function FarcasterAuthContextProvider(props: Props): React.Node {
  const [promiseHandlers, setPromiseHandlers] = React.useState<?{
    +resolve: string => mixed,
    +reject: () => mixed,
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
        promiseHandlers.reject();
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

  const htmlContent = React.useMemo(
    () => ({
      html: `
        <head>
          <script type="text/javascript">${bundledScript}</script>
        </head>`,
    }),
    [],
  );

  const signAuthMessage = React.useCallback(
    async (input: AuthMessageSigningInput) => {
      if (promiseHandlers) {
        promiseHandlers.reject();
      }
      const authMessage = `This signature grants access to read and write your Farcaster Direct Casts.

In most cases, this message should get signed invisibly, without your interaction.

If you are seeing this text from a signing prompt in your wallet, tread very carefully.

Direct cast authorization for Farcaster FID ${input.fid}

URI: https://client.farcaster.xyz/v2/get-dc-auth-token
Version: 1
Chain ID: 1
Nonce: ${input.nonce}
Issued At: ${new Date().toISOString()}`;
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
      setAuthParams({
        message: authMessage,
        mnemonic: input.walletMnemonic,
      });
      return promise;
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

export { FarcasterAuthContextProvider };
