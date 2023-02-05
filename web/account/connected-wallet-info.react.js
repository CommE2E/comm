// @flow

import * as React from 'react';
import { useAccount } from 'wagmi';

import { useENSName } from 'lib/hooks/ens-cache.js';

import css from './connected-wallet-info.css';

function ConnectedWalletInfo(): React.Node {
  const { address } = useAccount();
  const potentiallyENSName = useENSName(address);

  return (
    <div className={css.container}>
      <p>{potentiallyENSName}</p>
    </div>
  );
}

export default ConnectedWalletInfo;
