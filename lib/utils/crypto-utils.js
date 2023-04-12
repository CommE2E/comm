// @flow

import t from 'tcomb';
import { type TInterface } from 'tcomb';

import { primaryIdentityPublicKeyRegex } from './siwe-utils.js';
import { tRegex, tShape } from './validation-utils.js';

const minimumOneTimeKeysRequired = 10;

const signedIdentityKeysBlobValidator: TInterface = tShape({
  payload: t.String,
  signature: t.String,
});

const olmIdentityKeysValidator: TInterface = tShape({
  ed25519: tRegex(primaryIdentityPublicKeyRegex),
  curve25519: tRegex(primaryIdentityPublicKeyRegex),
});

const olmPrekeyValidator: TInterface = tShape({
  curve25519: tShape({
    id: t.String,
    key: t.String,
  }),
});

const olmOneTimeKeysValidator: TInterface = tShape({
  curve25519: t.dict(t.String, t.String),
});

const olmSessionInitializationKeysValidator: TInterface = tShape({
  prekey: olmPrekeyValidator,
  oneTimeKeysBatch: olmOneTimeKeysValidator,
});

const identityKeysBlobValidator: TInterface = tShape({
  primaryIdentityPublicKeys: olmIdentityKeysValidator,
  notificationIdentityPublicKeys: olmIdentityKeysValidator,
});

export {
  minimumOneTimeKeysRequired,
  signedIdentityKeysBlobValidator,
  identityKeysBlobValidator,
  olmPrekeyValidator,
  olmOneTimeKeysValidator,
  olmSessionInitializationKeysValidator,
};
