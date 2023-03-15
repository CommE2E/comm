// @flow

import * as React from 'react';

import type { SignedIdentityKeysBlob } from 'lib/types/crypto-types.js';

import { useSelector } from '../redux/redux-utils.js';
import { getSignedIdentityKeysBlobSelector } from '../selectors/socket-selectors.js';

function useSignedIdentityKeysBlob(): ?SignedIdentityKeysBlob {
  const getSignedIdentityKeysBlob: ?() => Promise<SignedIdentityKeysBlob> =
    useSelector(getSignedIdentityKeysBlobSelector);

  const [signedIdentityKeysBlob, setSignedIdentityKeysBlob] =
    React.useState<?SignedIdentityKeysBlob>(null);

  React.useEffect(() => {
    (async () => {
      if (
        getSignedIdentityKeysBlob === null ||
        getSignedIdentityKeysBlob === undefined
      ) {
        setSignedIdentityKeysBlob(null);
        return;
      }
      const resolvedSignedIdentityKeysBlob: SignedIdentityKeysBlob =
        await getSignedIdentityKeysBlob();
      setSignedIdentityKeysBlob(resolvedSignedIdentityKeysBlob);
    })();
  }, [getSignedIdentityKeysBlob]);

  return signedIdentityKeysBlob;
}

export { useSignedIdentityKeysBlob };
