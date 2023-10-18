// @flow

import olm from '@commapp/olm';
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

export { useGetSignedIdentityKeysBlob, useGetOrCreateCryptoStore };
