// @flow

import olm from '@commapp/olm';
import invariant from 'invariant';
import * as React from 'react';
import { useDispatch } from 'react-redux';
import uuid from 'uuid';

import type {
  SignedIdentityKeysBlob,
  CompleteCryptoStore,
  IdentityKeysBlob,
} from 'lib/types/crypto-types.js';

import { initOlm } from '../olm/olm-utils.js';
import {
  setPrimaryIdentityKeys,
  setNotificationIdentityKeys,
  setPickledPrimaryAccount,
  setPickledNotificationAccount,
} from '../redux/crypto-store-reducer.js';
import { useSelector } from '../redux/redux-utils.js';

const GetOrCreateCryptoStoreContext: React.Context<?() => Promise<CompleteCryptoStore>> =
  React.createContext(null);

type Props = {
  +children: React.Node,
};

function GetOrCreateCryptoStoreProvider(props: Props): React.Node {
  const dispatch = useDispatch();
  const currentCryptoStore = useSelector(state => state.cryptoStore);
  const createCryptoStorePromiseRef =
    React.useRef<?Promise<CompleteCryptoStore>>(null);

  const value = React.useCallback(async () => {
    if (
      currentCryptoStore.primaryAccount &&
      currentCryptoStore.primaryIdentityKeys &&
      currentCryptoStore.notificationAccount &&
      currentCryptoStore.notificationIdentityKeys
    ) {
      return {
        primaryAccount: currentCryptoStore.primaryAccount,
        primaryIdentityKeys: currentCryptoStore.primaryIdentityKeys,
        notificationAccount: currentCryptoStore.notificationAccount,
        notificationIdentityKeys: currentCryptoStore.notificationIdentityKeys,
      };
    }

    const currentCreateCryptoStorePromiseRef =
      createCryptoStorePromiseRef.current;

    if (currentCreateCryptoStorePromiseRef) {
      return currentCreateCryptoStorePromiseRef;
    }

    const newCreateCryptoStorePromise = (async () => {
      await initOlm();

      const identityAccount = new olm.Account();
      identityAccount.create();
      const { ed25519: identityED25519, curve25519: identityCurve25519 } =
        JSON.parse(identityAccount.identity_keys());

      dispatch({
        type: setPrimaryIdentityKeys,
        payload: { ed25519: identityED25519, curve25519: identityCurve25519 },
      });

      const identityAccountPicklingKey = uuid.v4();
      const pickledIdentityAccount = identityAccount.pickle(
        identityAccountPicklingKey,
      );

      dispatch({
        type: setPickledPrimaryAccount,
        payload: {
          picklingKey: identityAccountPicklingKey,
          pickledAccount: pickledIdentityAccount,
        },
      });

      const notificationAccount = new olm.Account();
      notificationAccount.create();
      const {
        ed25519: notificationED25519,
        curve25519: notificationCurve25519,
      } = JSON.parse(notificationAccount.identity_keys());

      dispatch({
        type: setNotificationIdentityKeys,
        payload: {
          ed25519: notificationED25519,
          curve25519: notificationCurve25519,
        },
      });

      const notificationAccountPicklingKey = uuid.v4();
      const pickledNotificationAccount = notificationAccount.pickle(
        notificationAccountPicklingKey,
      );

      dispatch({
        type: setPickledNotificationAccount,
        payload: {
          picklingKey: notificationAccountPicklingKey,
          pickledAccount: pickledNotificationAccount,
        },
      });

      createCryptoStorePromiseRef.current = null;

      return {
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
    })();

    createCryptoStorePromiseRef.current = newCreateCryptoStorePromise;
    return newCreateCryptoStorePromise;
  }, [dispatch, currentCryptoStore]);

  return (
    <GetOrCreateCryptoStoreContext.Provider value={value}>
      {props.children}
    </GetOrCreateCryptoStoreContext.Provider>
  );
}

function useGetOrCreateCryptoStore(): () => Promise<CompleteCryptoStore> {
  const context = React.useContext(GetOrCreateCryptoStoreContext);
  invariant(context, 'GetOrCreateCryptoStoreContext not found');

  return context;
}

function useGetSignedIdentityKeysBlob(): () => Promise<SignedIdentityKeysBlob> {
  const getOrCreateCryptoStore = useGetOrCreateCryptoStore();

  return React.useCallback(async () => {
    const { primaryAccount, primaryIdentityKeys, notificationIdentityKeys } =
      await getOrCreateCryptoStore();

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
  }, [getOrCreateCryptoStore]);
}

export {
  useGetSignedIdentityKeysBlob,
  useGetOrCreateCryptoStore,
  GetOrCreateCryptoStoreProvider,
};
