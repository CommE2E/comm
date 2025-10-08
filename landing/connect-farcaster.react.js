// @flow

import { AuthKitProvider, useSignIn } from '@farcaster/auth-kit';
import * as React from 'react';

import type { FarcasterWebViewMessage } from 'lib/types/farcaster-types.js';

const optimismRpcUrl = process.env.COMM_ALCHEMY_KEY
  ? `https://opt-mainnet.g.alchemy.com/v2/${process.env.COMM_ALCHEMY_KEY}`
  : 'https://mainnet.optimism.io';

const config = {
  domain: 'Comm',
  siweUri: 'https://comm.app/connect-farcaster',
  rpcUrl: optimismRpcUrl,
  relay: 'https://relay.farcaster.xyz',
  redirectUrl: 'comm://back-from-warpcast',
};

function postMessageToNativeWebView(message: FarcasterWebViewMessage) {
  window.ReactNativeWebView?.postMessage?.(JSON.stringify(message));
}

type OnSuccessCallbackArgs = {
  +fid: string,
};
function onSuccessCallback({ fid }: OnSuccessCallbackArgs) {
  postMessageToNativeWebView({
    type: 'farcaster_data',
    fid: fid.toString(),
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

  const messageSentRef = React.useRef<boolean>(false);
  const authenticated = isSuccess && validSignature;

  React.useEffect(() => {
    if (authenticated) {
      return;
    }
    if (isError) {
      messageSentRef.current = false;
      reconnect();
    } else if (!channelToken) {
      connect();
    }

    signIn();

    if (url && messageSentRef.current === false) {
      messageSentRef.current = true;

      postMessageToNativeWebView({
        type: 'farcaster_url',
        url: url.toString(),
      });
    }
  }, [authenticated, isError, reconnect, channelToken, connect, signIn, url]);

  return null;
}

function ConnectFarcasterWrapper(): React.Node {
  const connectFarcasterWrapper = React.useMemo(
    () => (
      <AuthKitProvider config={config}>
        <ConnectFarcaster />
      </AuthKitProvider>
    ),
    [],
  );

  return connectFarcasterWrapper;
}

export default ConnectFarcasterWrapper;
