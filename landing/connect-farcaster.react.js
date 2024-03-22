// @flow

import { AuthKitProvider, useSignIn, SignInButton } from '@farcaster/auth-kit';
import * as React from 'react';

type FarcasterWebViewMessage =
  | {
      +type: 'farcaster_url',
      +url: string,
    }
  | {
      +type: 'farcaster_data',
      +fid: string,
      +username: string,
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

function ConnectFarcaster(): React.Node {
  const onSuccessCallback = React.useCallback(
    () => console.log('hello world'),
    [],
  );

  const signInState = useSignIn({ onSuccess: onSuccessCallback });

  const {
    signIn,
    connect,
    reconnect,
    isSuccess,
    isError,
    channelToken,
    url,
    data,
    validSignature,
  } = signInState;

  React.useEffect(() => {
    if (!channelToken) {
      connect();
    }
  }, [channelToken, connect]);

  const authenticated = isSuccess && validSignature;

  React.useEffect(() => {
    if (authenticated) {
      return;
    }
    // if (isError) {
    //   reconnect();
    // }

    signIn();

    // console.log('url', url);

    if (url) {
      postMessageToNativeWebView({
        type: 'farcaster_url',
        url,
      });
    }
  }, [authenticated, isError, reconnect, signIn, url]);

  React.useEffect(() => {
    if (!authenticated) {
      return;
    }

    postMessageToNativeWebView({
      type: 'farcaster_data',
      fid: data.fid,
      username: data.username,
    });
  }, [authenticated, data]);

  console.log('authenticated', authenticated);
  console.log('isSuccess', isSuccess);
  console.log('validSignature', validSignature);

  if (authenticated) {
    return (
      <div>
        <h1>Connected Farcaster</h1>
        <p>You are now connected to Farcaster.</p>
        <div>Username: {data.username}</div>
        <div>fid: {data.fid}</div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'red' }}>
      <h1>Connect Farcaster</h1>
      <p>This is a page for connecting Farcaster.</p>
      <SignInButton
        onSuccess={({ fid, username }) =>
          console.log(`Hello, ${username}! Your fid is ${fid}.`)
        }
      />
      <div>URL: {url}</div>
    </div>
  );
}

function ConnectFarcasterWrapper(): React.Node {
  return (
    <AuthKitProvider config={config}>
      <ConnectFarcaster />
    </AuthKitProvider>
  );
}

export default ConnectFarcasterWrapper;
