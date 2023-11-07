// @flow

import olm from '@commapp/olm';
import invariant from 'invariant';
import localforage from 'localforage';
import * as React from 'react';
import uuid from 'uuid';

import {
  initialEncryptedMessageContent,
  getOneTimeKeyValuesFromBlob,
  getPrekeyValueFromBlob,
} from 'lib/shared/crypto-utils.js';
import type {
  SignedIdentityKeysBlob,
  CryptoStore,
  IdentityKeysBlob,
  CryptoStoreContextType,
  OLMIdentityKeys,
  NotificationsSessionCreatorContextType,
  NotificationsOlmDataType,
} from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import {
  generateCryptoKey,
  encryptData,
  exportKeyToJWK,
} from '../crypto/aes-gcm-crypto-utils.js';
import {
  NOTIFICATIONS_OLM_DATA_CONTENT,
  NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY,
} from '../database/utils/constants.js';
import { isDesktopSafari } from '../database/utils/db-utils.js';
import { initOlm } from '../olm/olm-utils.js';
import { setCryptoStore } from '../redux/crypto-store-reducer.js';
import { useSelector } from '../redux/redux-utils.js';

const CryptoStoreContext: React.Context<?CryptoStoreContextType> =
  React.createContext(null);

const WebNotificationsSessionCreatorContext: React.Context<?NotificationsSessionCreatorContextType> =
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

function WebNotificationsSessionCreatorProvider(props: Props): React.Node {
  const getOrCreateCryptoStore = useGetOrCreateCryptoStore();
  const currentCryptoStore = useSelector(state => state.cryptoStore);

  const createNewNotificationsSession = React.useCallback(
    async (
      notificationsIdentityKeys: OLMIdentityKeys,
      notificationsInitializationInfo: OlmSessionInitializationInfo,
    ) => {
      const [{ notificationAccount }, encryptionKey] = await Promise.all([
        getOrCreateCryptoStore(),
        generateCryptoKey({ extractable: isDesktopSafari }),
        initOlm(),
      ]);

      const account = new olm.Account();
      const { picklingKey, pickledAccount } = notificationAccount;
      account.unpickle(picklingKey, pickledAccount);

      const notificationsPrekey = getPrekeyValueFromBlob(
        notificationsInitializationInfo.prekey,
      );
      const [notificationsOneTimeKey] = getOneTimeKeyValuesFromBlob(
        notificationsInitializationInfo.oneTimeKey,
      );

      const session = new olm.Session();
      session.create_outbound(
        account,
        notificationsIdentityKeys.curve25519,
        notificationsIdentityKeys.ed25519,
        notificationsPrekey,
        notificationsInitializationInfo.prekeySignature,
        notificationsOneTimeKey,
      );
      const { body: initialNotificationsEncryptedMessage } = session.encrypt(
        JSON.stringify(initialEncryptedMessageContent),
      );

      const mainSession = session.pickle(picklingKey);
      const notificationsOlmData: NotificationsOlmDataType = {
        mainSession,
        pendingSessionUpdate: mainSession,
        updateCreationTimestamp: Date.now(),
        picklingKey,
      };
      const encryptedOlmData = await encryptData(
        new TextEncoder().encode(JSON.stringify(notificationsOlmData)),
        encryptionKey,
      );

      const persistEncryptionKeyPromise = (async () => {
        let cryptoKeyPersistentForm = encryptionKey;
        if (isDesktopSafari) {
          // Safari doesn't support structured clone algorithm in service
          // worker context so we have to store CryptoKey as JSON
          cryptoKeyPersistentForm = await exportKeyToJWK(encryptionKey);
        }

        await localforage.setItem(
          NOTIFICATIONS_OLM_DATA_ENCRYPTION_KEY,
          cryptoKeyPersistentForm,
        );
      })();

      await Promise.all([
        localforage.setItem(NOTIFICATIONS_OLM_DATA_CONTENT, encryptedOlmData),
        persistEncryptionKeyPromise,
      ]);

      return initialNotificationsEncryptedMessage;
    },
    [getOrCreateCryptoStore],
  );

  const notificationsSessionPromise = React.useRef<?Promise<string>>(null);
  const createNotificationsSession = React.useCallback(
    async (
      notificationsIdentityKeys: OLMIdentityKeys,
      notificationsInitializationInfo: OlmSessionInitializationInfo,
    ) => {
      if (notificationsSessionPromise.current) {
        return notificationsSessionPromise.current;
      }

      const newNotificationsSessionPromise = (async () => {
        try {
          return await createNewNotificationsSession(
            notificationsIdentityKeys,
            notificationsInitializationInfo,
          );
        } catch (e) {
          notificationsSessionPromise.current = undefined;
          throw e;
        }
      })();

      notificationsSessionPromise.current = newNotificationsSessionPromise;
      return newNotificationsSessionPromise;
    },
    [createNewNotificationsSession],
  );

  const isCryptoStoreSet = !!currentCryptoStore;
  React.useEffect(() => {
    if (!isCryptoStoreSet) {
      notificationsSessionPromise.current = undefined;
    }
  }, [isCryptoStoreSet]);

  const contextValue = React.useMemo(
    () => ({
      notificationsSessionCreator: createNotificationsSession,
    }),
    [createNotificationsSession],
  );

  return (
    <WebNotificationsSessionCreatorContext.Provider value={contextValue}>
      {props.children}
    </WebNotificationsSessionCreatorContext.Provider>
  );
}

function useWebNotificationsSessionCreator(): (
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
) => Promise<string> {
  const context = React.useContext(WebNotificationsSessionCreatorContext);
  invariant(context, 'WebNotificationsSessionCreator not found.');

  return context.notificationsSessionCreator;
}

export {
  useGetSignedIdentityKeysBlob,
  useGetOrCreateCryptoStore,
  WebNotificationsSessionCreatorProvider,
  useWebNotificationsSessionCreator,
  GetOrCreateCryptoStoreProvider,
};
