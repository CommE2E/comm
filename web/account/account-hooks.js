// @flow

import olm from '@commapp/olm';
import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import type {
  SignedIdentityKeysBlob,
  CryptoStore,
  IdentityKeysBlob,
  CryptoStoreContextType,
} from 'lib/types/crypto-types.js';
import {
  type IdentityNewDeviceKeyUpload,
  type IdentityExistingDeviceKeyUpload,
} from 'lib/types/identity-service-types.js';
import {
  retrieveIdentityKeysAndPrekeys,
  getAccountOneTimeKeys,
} from 'lib/utils/olm-utils.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import { initOlm } from '../olm/olm-utils.js';
import { setCryptoStore } from '../redux/crypto-store-reducer.js';
import { useSelector } from '../redux/redux-utils.js';

const CryptoStoreContext: React.Context<?CryptoStoreContextType> =
  React.createContext(null);

type Props = {
  +children: React.Node,
};

function GetOrCreateCryptoStoreProvider(props: Props): React.Node {
  const dispatch = useDispatch();
  const createCryptoStore = React.useCallback(async () => {
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

    dispatch({ type: setCryptoStore, payload: newCryptoStore });
    return newCryptoStore;
  }, [dispatch]);

  const currentCryptoStore = useSelector(state => state.cryptoStore);
  const createCryptoStorePromiseRef = React.useRef<?Promise<CryptoStore>>(null);
  const getCryptoStorePromise = React.useCallback(() => {
    if (currentCryptoStore) {
      return Promise.resolve(currentCryptoStore);
    }

    const currentCreateCryptoStorePromiseRef =
      createCryptoStorePromiseRef.current;
    if (currentCreateCryptoStorePromiseRef) {
      return currentCreateCryptoStorePromiseRef;
    }

    const newCreateCryptoStorePromise = (async () => {
      try {
        return await createCryptoStore();
      } catch (e) {
        createCryptoStorePromiseRef.current = undefined;
        throw e;
      }
    })();

    createCryptoStorePromiseRef.current = newCreateCryptoStorePromise;
    return newCreateCryptoStorePromise;
  }, [createCryptoStore, currentCryptoStore]);

  const isCryptoStoreSet = !!currentCryptoStore;
  React.useEffect(() => {
    if (!isCryptoStoreSet) {
      createCryptoStorePromiseRef.current = undefined;
    }
  }, [isCryptoStoreSet]);

  const contextValue = React.useMemo(
    () => ({
      getInitializedCryptoStore: getCryptoStorePromise,
    }),
    [getCryptoStorePromise],
  );

  return (
    <CryptoStoreContext.Provider value={contextValue}>
      {props.children}
    </CryptoStoreContext.Provider>
  );
}

function useGetOrCreateCryptoStore(): () => Promise<CryptoStore> {
  const context = React.useContext(CryptoStoreContext);
  invariant(context, 'CryptoStoreContext not found');
  return context.getInitializedCryptoStore;
}

function useGetSignedIdentityKeysBlob(): () => Promise<SignedIdentityKeysBlob> {
  const getOrCreateCryptoStore = useGetOrCreateCryptoStore();

  return React.useCallback(async () => {
    const [{ primaryAccount, primaryIdentityKeys, notificationIdentityKeys }] =
      await Promise.all([getOrCreateCryptoStore(), initOlm()]);
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

function useGetNewDeviceKeyUpload(): () => Promise<IdentityNewDeviceKeyUpload> {
  const getOrCreateCryptoStore = useGetOrCreateCryptoStore();
  // `getExistingDeviceKeyUpload()` will initialize OLM, so no need to do it
  // again
  const getExistingDeviceKeyUpload = useGetExistingDeviceKeyUpload();
  const dispatch = useDispatch();

  return React.useCallback(async () => {
    const [
      {
        keyPayload,
        keyPayloadSignature,
        contentPrekey,
        contentPrekeySignature,
        notifPrekey,
        notifPrekeySignature,
      },
      cryptoStore,
    ] = await Promise.all([
      getExistingDeviceKeyUpload(),
      getOrCreateCryptoStore(),
    ]);

    const primaryOLMAccount = new olm.Account();
    const notificationOLMAccount = new olm.Account();
    primaryOLMAccount.unpickle(
      cryptoStore.primaryAccount.picklingKey,
      cryptoStore.primaryAccount.pickledAccount,
    );
    notificationOLMAccount.unpickle(
      cryptoStore.notificationAccount.picklingKey,
      cryptoStore.notificationAccount.pickledAccount,
    );

    const contentOneTimeKeys = getAccountOneTimeKeys(primaryOLMAccount);
    const notifOneTimeKeys = getAccountOneTimeKeys(notificationOLMAccount);

    const pickledPrimaryAccount = primaryOLMAccount.pickle(
      cryptoStore.primaryAccount.picklingKey,
    );
    const pickledNotificationAccount = notificationOLMAccount.pickle(
      cryptoStore.notificationAccount.picklingKey,
    );

    const updatedCryptoStore = {
      primaryAccount: {
        picklingKey: cryptoStore.primaryAccount.picklingKey,
        pickledAccount: pickledPrimaryAccount,
      },
      primaryIdentityKeys: cryptoStore.primaryIdentityKeys,
      notificationAccount: {
        picklingKey: cryptoStore.notificationAccount.picklingKey,
        pickledAccount: pickledNotificationAccount,
      },
      notificationIdentityKeys: cryptoStore.notificationIdentityKeys,
    };

    dispatch({ type: setCryptoStore, payload: updatedCryptoStore });

    return {
      keyPayload,
      keyPayloadSignature,
      contentPrekey,
      contentPrekeySignature,
      notifPrekey,
      notifPrekeySignature,
      contentOneTimeKeys,
      notifOneTimeKeys,
    };
  }, [dispatch, getOrCreateCryptoStore, getExistingDeviceKeyUpload]);
}

function useGetExistingDeviceKeyUpload(): () => Promise<IdentityExistingDeviceKeyUpload> {
  const getOrCreateCryptoStore = useGetOrCreateCryptoStore();
  // `getSignedIdentityKeysBlob()` will initialize OLM, so no need to do it
  // again
  const getSignedIdentityKeysBlob = useGetSignedIdentityKeysBlob();
  const dispatch = useDispatch();

  return React.useCallback(async () => {
    const [
      { payload: keyPayload, signature: keyPayloadSignature },
      cryptoStore,
    ] = await Promise.all([
      getSignedIdentityKeysBlob(),
      getOrCreateCryptoStore(),
    ]);

    const primaryOLMAccount = new olm.Account();
    const notificationOLMAccount = new olm.Account();
    primaryOLMAccount.unpickle(
      cryptoStore.primaryAccount.picklingKey,
      cryptoStore.primaryAccount.pickledAccount,
    );
    notificationOLMAccount.unpickle(
      cryptoStore.notificationAccount.picklingKey,
      cryptoStore.notificationAccount.pickledAccount,
    );

    const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
      retrieveIdentityKeysAndPrekeys(primaryOLMAccount);
    const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
      retrieveIdentityKeysAndPrekeys(notificationOLMAccount);

    const pickledPrimaryAccount = primaryOLMAccount.pickle(
      cryptoStore.primaryAccount.picklingKey,
    );
    const pickledNotificationAccount = notificationOLMAccount.pickle(
      cryptoStore.notificationAccount.picklingKey,
    );

    const updatedCryptoStore = {
      primaryAccount: {
        picklingKey: cryptoStore.primaryAccount.picklingKey,
        pickledAccount: pickledPrimaryAccount,
      },
      primaryIdentityKeys: cryptoStore.primaryIdentityKeys,
      notificationAccount: {
        picklingKey: cryptoStore.notificationAccount.picklingKey,
        pickledAccount: pickledNotificationAccount,
      },
      notificationIdentityKeys: cryptoStore.notificationIdentityKeys,
    };

    dispatch({ type: setCryptoStore, payload: updatedCryptoStore });

    return {
      keyPayload,
      keyPayloadSignature,
      contentPrekey,
      contentPrekeySignature,
      notifPrekey,
      notifPrekeySignature,
    };
  }, [dispatch, getOrCreateCryptoStore, getSignedIdentityKeysBlob]);
}

export {
  useGetSignedIdentityKeysBlob,
  useGetOrCreateCryptoStore,
  GetOrCreateCryptoStoreProvider,
  useGetNewDeviceKeyUpload,
  useGetExistingDeviceKeyUpload,
};
