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
  CompleteCryptoStore,
  IdentityKeysBlob,
  OLMIdentityKeys,
  PickledOLMAccount,
} from 'lib/types/crypto-types.js';
import type { OlmSessionInitializationInfo } from 'lib/types/request-types.js';

import { NOTIFICATIONS_OLM_SESSION_KEY } from '../database/utils/constants.js';
import { initOlm } from '../olm/olm-utils.js';
import {
  setPrimaryIdentityKeys,
  setNotificationIdentityKeys,
  setPickledPrimaryAccount,
  setPickledNotificationAccount,
} from '../redux/crypto-store-reducer.js';
import { useSelector } from '../redux/redux-utils.js';

function useGetOrCreateCryptoStore(): () => Promise<CompleteCryptoStore> {
  const dispatch = useDispatch();
  const currentCryptoStore = useSelector(state => state.cryptoStore);

  return React.useCallback(async () => {
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
    const { ed25519: notificationED25519, curve25519: notificationCurve25519 } =
      JSON.parse(notificationAccount.identity_keys());

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
  }, [dispatch, currentCryptoStore]);
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

function useWebNotificationsSessionCreator(): (
  notificationsIdentityKeys: OLMIdentityKeys,
  notificationsInitializationInfo: OlmSessionInitializationInfo,
) => Promise<string> {
  const notificationsAccount = useSelector(
    state => state.cryptoStore.notificationAccount,
  );
  const dispatch = useDispatch();

  return React.useCallback(
    async (
      notificationsIdentityKeys: OLMIdentityKeys,
      notificationsInitializationInfo: OlmSessionInitializationInfo,
    ) => {
      invariant(
        notificationsAccount,
        'SignedIdentityKeysBlob must be uploaded to the keyserver.',
      );

      await initOlm();
      const account = new olm.Account();
      account.unpickle(
        notificationsAccount.picklingKey,
        notificationsAccount.pickledAccount,
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

      const updatedNotificationsAccount: PickledOLMAccount = {
        pickledAccount: account.pickle(notificationsAccount.picklingKey),
        picklingKey: notificationsAccount.picklingKey,
      };

      await dispatch({
        type: setPickledNotificationAccount,
        payload: updatedNotificationsAccount,
      });

      const pickledSession = session.pickle(notificationsAccount.picklingKey);
      await localforage.setItem(NOTIFICATIONS_OLM_SESSION_KEY, pickledSession);

      return initialNotificationsEncryptedMessage;
    },
    [notificationsAccount, dispatch],
  );
}

export {
  useGetSignedIdentityKeysBlob,
  useGetOrCreateCryptoStore,
  useWebNotificationsSessionCreator,
};
