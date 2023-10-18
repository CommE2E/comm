// @flow

import olm from '@commapp/olm';
import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import uuid from 'uuid';

import type {
  SignedIdentityKeysBlob,
  CryptoStore,
  IdentityKeysBlob,
} from 'lib/types/crypto-types.js';

import { initOlm } from '../olm/olm-utils.js';
import { setCryptoStore } from '../redux/crypto-store-reducer.js';
import { useSelector } from '../redux/redux-utils.js';

const CryptoStoreContext: React.Context<?Promise<CryptoStore>> =
  React.createContext(null);

type Props = {
  +children: React.Node,
};

function CryptoStoreProvider(props: Props): React.Node {
  const dispatch = useDispatch();
  const currentCryptoStore = useSelector(state => state.cryptoStore);

  const cryptoStoreValue = React.useMemo(async () => {
    if (currentCryptoStore) {
      return currentCryptoStore;
    }

    await initOlm();

    const identityAccount = new olm.Account();
    identityAccount.create();
    const { ed25519: identityED25519, curve25519: identityCurve25519 } =
      JSON.parse(identityAccount.identity_keys());

    const identityAccountPicklingKey = uuid.v4();
    const pickledIdentityAccount = identityAccount.pickle(
      identityAccountPicklingKey,
    );

    const notificationAccount = new olm.Account();
    notificationAccount.create();
    const { ed25519: notificationED25519, curve25519: notificationCurve25519 } =
      JSON.parse(notificationAccount.identity_keys());

    const notificationAccountPicklingKey = uuid.v4();
    const pickledNotificationAccount = notificationAccount.pickle(
      notificationAccountPicklingKey,
    );

    const newCryptoStore = {
      primaryAccount: {
        picklingKey: identityAccountPicklingKey,
        pickledAccount: pickledIdentityAccount,
      },
      primaryIdentityKeys: {
        ed25519: identityED25519,
        curve25519: identityCurve25519,
      },
      notificationAccount: {
        picklingKey: notificationAccountPicklingKey,
        pickledAccount: pickledNotificationAccount,
      },
      notificationIdentityKeys: {
        ed25519: notificationED25519,
        curve25519: notificationCurve25519,
      },
    };

    dispatch({
      type: setCryptoStore,
      payload: newCryptoStore,
    });

    return newCryptoStore;
  }, [currentCryptoStore, dispatch]);

  return (
    <CryptoStoreContext.Provider value={cryptoStoreValue}>
      {props.children}
    </CryptoStoreContext.Provider>
  );
}

function useCryptoStore(): Promise<CryptoStore> {
  const context = React.useContext(CryptoStoreContext);
  invariant(context, 'GetOrCreateCryptoStoreContext not found');

  return context;
}

function useGetSignedIdentityKeysBlob(): () => Promise<SignedIdentityKeysBlob> {
  const cryptoStorePromise = useCryptoStore();

  return React.useCallback(async () => {
    const { primaryAccount, primaryIdentityKeys, notificationIdentityKeys } =
      await cryptoStorePromise;

    await initOlm();
    const primaryOLMAccount = new olm.Account();
    primaryOLMAccount.unpickle(
      primaryAccount.picklingKey,
      primaryAccount.pickledAccount,
    );

    const identityKeysBlob: IdentityKeysBlob = {
      primaryIdentityPublicKeys: primaryIdentityKeys,
      notificationIdentityPublicKeys: notificationIdentityKeys,
    };

    const payloadToBeSigned: string = JSON.stringify(identityKeysBlob);
    const signedIdentityKeysBlob: SignedIdentityKeysBlob = {
      payload: payloadToBeSigned,
      signature: primaryOLMAccount.sign(payloadToBeSigned),
    };

    return signedIdentityKeysBlob;
  }, [cryptoStorePromise]);
}

export { useGetSignedIdentityKeysBlob, useCryptoStore, CryptoStoreProvider };
