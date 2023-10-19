// @flow

import olm from '@commapp/olm';
import invariant from 'invariant';
import localforage from 'localforage';
import * as React from 'react';
import { useDispatch } from 'react-redux';
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
  OLMIdentityKeys,
} from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';

import { NOTIFICATIONS_OLM_SESSION_KEY } from '../database/utils/constants.js';
import { initOlm } from '../olm/olm-utils.js';
import { setCryptoStore } from '../redux/crypto-store-reducer.js';
import { useSelector } from '../redux/redux-utils.js';

const CryptoStoreContext: React.Context<?Promise<CryptoStore>> =
  React.createContext(null);

const WebNotificationsSessionCreatorContext: React.Context<?(
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
) => Promise<string>> = React.createContext(null);

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
    const [{ primaryAccount, primaryIdentityKeys, notificationIdentityKeys }] =
      await Promise.all([cryptoStorePromise, initOlm()]);

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

function WebNotificationsSessionCreatorProvider(props: Props): React.Node {
  const cryptoStorePromise = useCryptoStore();
  const sessionCreationPromiseRef = React.useRef<?Promise<string>>(null);
  const sessionCreationFirstRunRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (sessionCreationFirstRunRef.current) {
      sessionCreationPromiseRef.current = null;
    }
  }, [cryptoStorePromise]);

  const value = React.useCallback(
    (
      notificationsIdentityKeys: OLMIdentityKeys,
      notificationsInitializationInfo: OlmSessionInitializationInfo,
    ) => {
      if (sessionCreationPromiseRef.current) {
        return sessionCreationPromiseRef.current;
      }

      const newSessionCreationPromise = (async () => {
        const [{ notificationAccount }] = await Promise.all([
          cryptoStorePromise,
          initOlm(),
        ]);

        const account = new olm.Account();
        account.unpickle(
          notificationAccount.picklingKey,
          notificationAccount.pickledAccount,
        );

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

        const pickledSession = session.pickle(notificationAccount.picklingKey);
        await localforage.setItem(
          NOTIFICATIONS_OLM_SESSION_KEY,
          pickledSession,
        );

        sessionCreationFirstRunRef.current = true;

        return initialNotificationsEncryptedMessage;
      })();

      sessionCreationPromiseRef.current = newSessionCreationPromise;
      return newSessionCreationPromise;
    },
    [cryptoStorePromise],
  );

  return (
    <WebNotificationsSessionCreatorContext.Provider value={value}>
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

  return context;
}

export {
  useGetSignedIdentityKeysBlob,
  useCryptoStore,
  WebNotificationsSessionCreatorProvider,
  useWebNotificationsSessionCreator,
  CryptoStoreProvider,
};
