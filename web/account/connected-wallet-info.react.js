// @flow

import * as React from 'react';
import { useAccount, useEnsName } from 'wagmi';

import css from './connected-wallet-info.css';

function ConnectedWalletInfo(): React.Node {
  const { address } = useAccount();
  const { data } = useEnsName({ address });
  return (
    <div className={css.container}>
      <p>{data ?? address}</p>
    </div>
  );
}

export default ConnectedWalletInfo;
