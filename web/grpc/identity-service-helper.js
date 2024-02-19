// @flow

import type { SignedPrekeys } from 'lib/types/crypto-types.js';

import type { IdentityServiceClientWrapper } from './identity-service-client-wrapper.js';
import * as IdentityAuthStructs from '../protobufs/identity-auth-structs.cjs';
import { Prekey } from '../protobufs/identity-unauth-structs.cjs';

async function publishPrekeysToIdentity(
  prekeys: SignedPrekeys,
  client: IdentityServiceClientWrapper,
) {
  const authClient = client.authClient;
  if (!authClient) {
    throw new Error('Identity service client is not initialized');
  }

  const contentPrekeyUpload = new Prekey();
  contentPrekeyUpload.setPrekey(prekeys.contentPrekey);
  contentPrekeyUpload.setPrekeySignature(prekeys.contentPrekeySignature);

  const notifPrekeyUpload = new Prekey();
  notifPrekeyUpload.setPrekey(prekeys.notifPrekey);
  notifPrekeyUpload.setPrekeySignature(prekeys.notifPrekeySignature);

  const request = new IdentityAuthStructs.RefreshUserPrekeysRequest();
  request.setNewContentPrekeys(contentPrekeyUpload);
  request.setNewNotifPrekeys(notifPrekeyUpload);
  await authClient.refreshUserPrekeys(request);
}

export { publishPrekeysToIdentity };
