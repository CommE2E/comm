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

  const prevValsRef = React.useRef<{ +[key: string]: mixed }>({
    authenticated,
    isError,
    reconnect,
    channelToken,
    connect,
    signIn,
    url,
  });
  const runRef = React.useRef(0);
  React.useEffect(() => {
    const newVals: { +[key: string]: mixed } = {
      authenticated,
      isError,
      reconnect,
      channelToken,
      connect,
      signIn,
      url,
    };
    const keysChanged = [];
    for (const key in newVals) {
      if (newVals[key] !== prevValsRef.current[key]) {
        keysChanged.push(key);
      }
    }
    prevValsRef.current = newVals;

    const effectRunReason =
      `effect #${runRef.current++} ran ` +
      `due to changes in ${JSON.stringify(keysChanged)}`;

    if (authenticated) {
      postMessageToNativeWebView({
        type: 'farcaster_log',
        log: `skipped effect because authenticated. ${effectRunReason}`,
      });
      return;
    }

    if (isError) {
      messageSentRef.current = false;
      reconnect();
      postMessageToNativeWebView({
        type: 'farcaster_log',
        log: `effect ran reconnect before signIn due to error. ${effectRunReason}`,
      });
    } else if (!channelToken) {
      connect();
      postMessageToNativeWebView({
        type: 'farcaster_log',
        log:
          'effect ran connect before signIn due to no channelToken. ' +
          effectRunReason,
      });
    } else {
      postMessageToNativeWebView({
        type: 'farcaster_log',
        log: `effect ran signIn on its own. ${effectRunReason}`,
      });
    }

    signIn();

    if (url && messageSentRef.current === false) {
      messageSentRef.current = true;

      postMessageToNativeWebView({
        type: 'farcaster_log',
        log: `effect posted ${url.toString()}. ${effectRunReason}`,
      });
      postMessageToNativeWebView({
        type: 'farcaster_url',
        url: url.toString(),
      });
    } else if (url) {
      postMessageToNativeWebView({
        type: 'farcaster_log',
        log:
          `effect skipped posting ${url.toString()} because already ` +
          `posted. ${effectRunReason}`,
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
