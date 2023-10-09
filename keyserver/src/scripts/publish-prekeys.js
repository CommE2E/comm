// @flow

import type { Account as OlmAccount } from '@commapp/olm';
import { getRustAPI } from 'rust-node-addon';

import { main } from './utils.js';
import { fetchCallUpdateOlmAccount } from '../updaters/olm-account-updater.js';
import { fetchIdentityInfo } from '../user/identity.js';
import { getAccountPrekeysSet } from '../utils/olm-utils.js';

async function publishPrekeysToIdentity(
  contentAccount: OlmAccount,
  notifAccount: OlmAccount,
): Promise<void> {
  const rustAPIPromise = getRustAPI();
  const fetchIdentityInfoPromise = fetchIdentityInfo();
  const deviceID = JSON.parse(contentAccount.identity_keys()).ed25519;

  const { prekey: contentPrekey, prekeySignature: contentPrekeySignature } =
    getAccountPrekeysSet(contentAccount);
  const { prekey: notifPrekey, prekeySignature: notifPrekeySignature } =
    getAccountPrekeysSet(notifAccount);

  if (!contentPrekeySignature || !notifPrekeySignature) {
    console.warn('Unable to create valid signature for a prekey');
    return;
  }

  const [rustAPI, identityInfo] = await Promise.all([
    rustAPIPromise,
    fetchIdentityInfoPromise,
  ]);

  if (!identityInfo) {
    console.warn(
      'Attempted to refresh prekeys before registering with Identity service',
    );
    return;
  }

  await rustAPI.publishPrekeys(
    identityInfo.userId,
    deviceID,
    identityInfo.accessToken,
    contentPrekey,
    contentPrekeySignature,
    notifPrekey,
    notifPrekeySignature,
  );

  console.log('Prekeys published successfully');
}

async function publishPrekeys() {
  await fetchCallUpdateOlmAccount('content', (contentAccount: OlmAccount) =>
    fetchCallUpdateOlmAccount('notifications', (notifAccount: OlmAccount) =>
      publishPrekeysToIdentity(contentAccount, notifAccount),
    ),
  );
}

main([publishPrekeys]);
