// @flow

import { AuthKitProvider, useSignIn } from '@farcaster/auth-kit';
import * as React from 'react';

type FarcasterWebViewMessage =
  | {
      +type: 'farcaster_url',
      +url: string,
    }
  | {
      +type: 'farcaster_data',
      +fid: string,
    };

const config = {
  domain: 'Comm',
  siweURL: 'https://comm.app/connect-farcaster',
  rpcURL: 'https://mainnet.optimism.io',
  relay: 'https://relay.farcaster.xyz',
};

function postMessageToNativeWebView(message: FarcasterWebViewMessage) {
  window.ReactNativeWebView?.postMessage?.(JSON.stringify(message));
}

type OnSuccessCallbackArgs = {
  fid: string,
};
function onSuccessCallback({ fid }: OnSuccessCallbackArgs) {
  postMessageToNativeWebView({
    type: 'farcaster_data',
    fid,
  });
}

function ConnectFarcaster(): React.Node {
  const signInState = useSignIn({ onSuccess: onSuccessCallback });

  const {
    signIn,
    connect,
    reconnect,
    isSuccess,
    isError,
    channelToken,
    url,
    validSignature,
  } = signInState;

  React.useEffect(() => {
    if (!channelToken) {
      connect();
    }
  }, [channelToken, connect]);

  const messageSentRef = React.useRef<boolean>(false);
  const authenticated = isSuccess && validSignature;

  React.useEffect(() => {
    if (authenticated) {
      return;
    }
    if (isError) {
      reconnect();
    }

    signIn();

    if (url && messageSentRef.current === false) {
      messageSentRef.current = true;

      postMessageToNativeWebView({
        type: 'farcaster_url',
        url: url.toString(),
      });
    }
  }, [authenticated, isError, reconnect, signIn, url]);

  return null;
}

function ConnectFarcasterWrapper(): React.Node {
  return (
    <AuthKitProvider config={config}>
      <ConnectFarcaster />
    </AuthKitProvider>
  );
}

export default ConnectFarcasterWrapper;
