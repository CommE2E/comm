// @flow

import { ConnectButton } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import './siwe.css';
import { SiweMessage } from 'siwe';
import { useAccount, useSigner } from 'wagmi';

const domain = window.location.host;
const origin = window.location.origin;

function createSiweMessage(address, statement) {
  const message = new SiweMessage({
    domain,
    address,
    statement,
    uri: origin,
    version: '1',
    chainId: '1',
  });
  return message.prepareMessage();
}

async function signInWithEthereum(address, signer) {
  const message = createSiweMessage(address, 'Sign in to Comm with Ethereum');
  const signedMessage = await signer.signMessage(message);
  window.postMessage?.(signedMessage);
  return signedMessage;
}

function SIWE(): React.Node {
  const { data } = useAccount();
  const { address } = data || {};
  const { data: signer } = useSigner();
  React.useEffect(() => {
    if (!address || !signer) {
      return;
    }
    signInWithEthereum(address, signer);
  }, [address, signer]);
  return (
    <div>
      <h1>SIWE</h1>
      <ConnectButton />
    </div>
  );
}

export default SIWE;
