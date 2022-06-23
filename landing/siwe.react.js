// @flow

import { ConnectButton } from '@rainbow-me/rainbowkit';
import * as React from 'react';
import './siwe.css';

function SIWE(): React.Node {
  return (
    <div>
      <h1>SIWE</h1>
      <ConnectButton />
    </div>
  );
}

export default SIWE;
