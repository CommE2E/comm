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
import { NotificationsSessionCreatorContext } from 'lib/shared/notifications-session-creator-context.js';
import type {
  SignedIdentityKeysBlob,
  CryptoStore,
  IdentityKeysBlob,
  CryptoStoreContextType,
  OLMIdentityKeys,
  NotificationsOlmDataType,
} from 'lib/types/crypto-types.js';
import {
  ONE_TIME_KEYS_NUMBER,
  type IdentityDeviceKeyUpload,
} from 'lib/types/identity-service-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';
import { useDispatch } from 'lib/utils/redux-utils.js';

import {
  generateCryptoKey,
  encryptData,
  exportKeyToJWK,
} from '../crypto/aes-gcm-crypto-utils.js';
import { isDesktopSafari } from '../database/utils/db-utils.js';
import { initOlm } from '../olm/olm-utils.js';
import {
  getOlmDataContentKeyForCookie,
  getOlmEncryptionKeyDBLabelForCookie,
} from '../push-notif/notif-crypto-utils.js';
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

function useGetDeviceKeyUpload(): () => Promise<IdentityDeviceKeyUpload> {
  const getOrCreateCryptoStore = useGetOrCreateCryptoStore();
  // `getSignedIdentityKeysBlob()` will initialize OLM, so no need to do it
  // again
  const getSignedIdentityKeysBlob = useGetSignedIdentityKeysBlob();

  return React.useCallback(async () => {
    const signedIdentityKeysBlob = await getSignedIdentityKeysBlob();
    const { primaryAccount, notificationAccount } =
      await getOrCreateCryptoStore();

    const primaryOLMAccount = new olm.Account();
    const notificationOLMAccount = new olm.Account();
    primaryOLMAccount.unpickle(
      primaryAccount.picklingKey,
      primaryAccount.pickledAccount,
    );
    notificationOLMAccount.unpickle(
      notificationAccount.picklingKey,
      notificationAccount.pickledAccount,
    );

    const contentPrekey = primaryOLMAccount.prekey();
    const contentPrekeySignature = primaryOLMAccount.prekey_signature();

    if (!contentPrekeySignature) {
      throw new Error('invalid_prekey');
    }

    const notifPrekey = notificationOLMAccount.prekey();
    const notifPrekeySignature = notificationOLMAccount.prekey_signature();

    if (!notifPrekeySignature) {
      throw new Error('invalid_prekey');
    }

    primaryOLMAccount.generate_one_time_keys(ONE_TIME_KEYS_NUMBER);
    const contentOneTimeKeys = getOneTimeKeyValuesFromBlob(
      primaryOLMAccount.one_time_keys(),
    );

    notificationOLMAccount.generate_one_time_keys(ONE_TIME_KEYS_NUMBER);
    const notifOneTimeKeys = getOneTimeKeyValuesFromBlob(
      notificationOLMAccount.one_time_keys(),
    );

    return {
      keyPayload: signedIdentityKeysBlob.payload,
      keyPayloadSignature: signedIdentityKeysBlob.signature,
      contentPrekey,
      contentPrekeySignature,
      notifPrekey,
      notifPrekeySignature,
      contentOneTimeKeys,
      notifOneTimeKeys,
    };
  }, [getOrCreateCryptoStore, getSignedIdentityKeysBlob]);
}

function NotificationsSessionCreatorProvider(props: Props): React.Node {
  const getOrCreateCryptoStore = useGetOrCreateCryptoStore();
  const currentCryptoStore = useSelector(state => state.cryptoStore);

  const createNewNotificationsSession = React.useCallback(
    async (
      cookie: ?string,
      notificationsIdentityKeys: OLMIdentityKeys,
      notificationsInitializationInfo: OlmSessionInitializationInfo,
      keyserverID: string,
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

      const notifsOlmDataEncryptionKeyDBLabel =
        getOlmEncryptionKeyDBLabelForCookie(cookie);
      const notifsOlmDataContentKey = getOlmDataContentKeyForCookie(
        cookie,
        keyserverID,
      );

      const persistEncryptionKeyPromise = (async () => {
        let cryptoKeyPersistentForm;
        if (isDesktopSafari) {
          // Safari doesn't support structured clone algorithm in service
          // worker context so we have to store CryptoKey as JSON
          cryptoKeyPersistentForm = await exportKeyToJWK(encryptionKey);
        } else {
          cryptoKeyPersistentForm = encryptionKey;
        }

        await localforage.setItem(
          notifsOlmDataEncryptionKeyDBLabel,
          cryptoKeyPersistentForm,
        );
      })();

      await Promise.all([
        localforage.setItem(notifsOlmDataContentKey, encryptedOlmData),
        persistEncryptionKeyPromise,
      ]);

      return initialNotificationsEncryptedMessage;
    },
    [getOrCreateCryptoStore],
  );

  const notificationsSessionPromise = React.useRef<?Promise<string>>(null);
  const createNotificationsSession = React.useCallback(
    async (
      cookie: ?string,
      notificationsIdentityKeys: OLMIdentityKeys,
      notificationsInitializationInfo: OlmSessionInitializationInfo,
      keyserverID: string,
    ) => {
      if (notificationsSessionPromise.current) {
        return notificationsSessionPromise.current;
      }

      const newNotificationsSessionPromise = (async () => {
        try {
          return await createNewNotificationsSession(
            cookie,
            notificationsIdentityKeys,
            notificationsInitializationInfo,
            keyserverID,
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
    <NotificationsSessionCreatorContext.Provider value={contextValue}>
      {props.children}
    </NotificationsSessionCreatorContext.Provider>
  );
}

function useWebNotificationsSessionCreator(): (
  cookie: ?string,
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
  keyserverID: string,
) => Promise<string> {
  const context = React.useContext(NotificationsSessionCreatorContext);
  invariant(context, 'WebNotificationsSessionCreator not found.');

  return context.notificationsSessionCreator;
}

export {
  useGetSignedIdentityKeysBlob,
  useGetOrCreateCryptoStore,
  NotificationsSessionCreatorProvider,
  useWebNotificationsSessionCreator,
  GetOrCreateCryptoStoreProvider,
  useGetDeviceKeyUpload,
};
