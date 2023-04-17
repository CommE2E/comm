// @flow

import t from 'tcomb';
import { type TInterface } from 'tcomb';

import { primaryIdentityPublicKeyRegex } from './siwe-utils.js';
import { tRegex, tShape } from './validation-utils.js';
import type {
  IdentityKeysBlob,
  OLMIdentityKeys,
  SignedIdentityKeysBlob,
} from '../types/crypto-types';

const minimumOneTimeKeysRequired = 10;

const signedIdentityKeysBlobValidator: TInterface<SignedIdentityKeysBlob> =
  tShape({
    payload: t.String,
    signature: t.String,
  });

const olmIdentityKeysValidator: TInterface<OLMIdentityKeys> = tShape({
  ed25519: tRegex(primaryIdentityPublicKeyRegex),
  curve25519: tRegex(primaryIdentityPublicKeyRegex),
});

const identityKeysBlobValidator: TInterface<IdentityKeysBlob> = tShape({
  primaryIdentityPublicKeys: olmIdentityKeysValidator,
  notificationIdentityPublicKeys: olmIdentityKeysValidator,
});

export {
  minimumOneTimeKeysRequired,
  signedIdentityKeysBlobValidator,
  identityKeysBlobValidator,
};
