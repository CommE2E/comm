// @flow

import invariant from 'invariant';

import type { SIWEMessage } from '../types/siwe-types.js';
import { isDev } from './dev-utils.js';

const siweNonceRegex: RegExp = /^[a-zA-Z0-9]{17}$/;
function isValidSIWENonce(candidate: string): boolean {
  return siweNonceRegex.test(candidate);
}

const ethereumAddressRegex: RegExp = /^0x[a-fA-F0-9]{40}$/;
function isValidEthereumAddress(candidate: string): boolean {
  return ethereumAddressRegex.test(candidate);
}

const primaryIdentityPublicKeyRegex: RegExp = /^[a-zA-Z0-9+/]{43}$/;
function isValidPrimaryIdentityPublicKey(candidate: string): boolean {
  return primaryIdentityPublicKeyRegex.test(candidate);
}

const siweStatement: string =
  'By continuing, I accept the Comm Terms of Service: https://comm.app/terms';

const expectedDomain = isDev ? 'localhost:3000' : 'comm.app';
const expectedURI = isDev ? 'http://localhost:3000' : 'https://comm.app';

// Verify that the SIWEMessage is a well formed Comm SIWE Auth message.
function isValidSIWEMessage(candidate: SIWEMessage): boolean {
  return (
    candidate.statement === siweStatement &&
    candidate.version === '1' &&
    candidate.chainId === 1 &&
    candidate.domain === expectedDomain &&
    candidate.uri === expectedURI &&
    isValidSIWENonce(candidate.nonce) &&
    isValidEthereumAddress(candidate.address)
  );
}

function getSIWEStatementForPublicKey(publicKey: string): string {
  invariant(
    isValidPrimaryIdentityPublicKey(publicKey),
    'publicKey must be well formed in getSIWEStatementForPublicKey',
  );
  return `Device IdPubKey: ${publicKey} ${siweStatement}`;
}

export {
  siweStatement,
  isValidSIWENonce,
  isValidEthereumAddress,
  isValidPrimaryIdentityPublicKey,
  isValidSIWEMessage,
  getSIWEStatementForPublicKey,
};
