// @flow

import invariant from 'invariant';
import { SiweMessage } from 'siwe';
import t, { type TEnums } from 'tcomb';

import { isDev } from './dev-utils.js';
import {
  type SIWEMessage,
  SIWEMessageTypes,
  type SIWEMessageType,
} from '../types/siwe-types.js';
import { values } from '../utils/objects.js';

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

const siweMessageTypeValidator: TEnums = t.enums.of(values(SIWEMessageTypes));
function isValidSIWEMessageType(candidate: string): boolean {
  return siweMessageTypeValidator.is(candidate);
}

const siweMessageIssuedAtRegex: RegExp =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)((-(\d{2}):(\d{2})|Z)?)$/;
function isValidSIWEIssuedAt(candidate: string): boolean {
  return siweMessageIssuedAtRegex.test(candidate);
}

const siweStatementLegalAgreement: string =
  'By continuing, I accept the Comm Terms of Service: https://comm.app/terms';

function createSIWEMessage(
  address: string,
  statement: string,
  nonce: string,
  issuedAt: ?string,
): string {
  invariant(nonce, 'nonce must be present in createSiweMessage');
  const domain = window.location.host;
  const origin = window.location.origin;
  const message = new SiweMessage({
    domain,
    address,
    statement,
    issuedAt,
    uri: origin,
    version: '1',
    chainId: '1',
    nonce,
  });
  return message.prepareMessage();
}

function isValidSIWEDomain(candidate: string): boolean {
  return isDev
    ? candidate === 'localhost:3000'
    : candidate === 'comm.app' || candidate === 'web.comm.app';
}

function isValidSIWEURI(candidate: string): boolean {
  return isDev
    ? candidate === 'http://localhost:3000'
    : candidate === 'https://comm.app' || candidate === 'https://web.comm.app';
}

// Verify that the SIWEMessage is a well formed Comm SIWE Auth message.
function isValidSIWEMessage(candidate: SIWEMessage): boolean {
  return (
    candidate.statement !== null &&
    candidate.statement !== undefined &&
    isValidSIWEStatementWithPublicKey(candidate.statement) &&
    candidate.version === '1' &&
    candidate.chainId === 1 &&
    isValidSIWEDomain(candidate.domain) &&
    isValidSIWEURI(candidate.uri) &&
    isValidSIWENonce(candidate.nonce) &&
    isValidEthereumAddress(candidate.address)
  );
}

function getSIWEStatementForPublicKey(
  publicKey: string,
  messageType: SIWEMessageType,
): string {
  invariant(
    isValidPrimaryIdentityPublicKey(publicKey),
    'publicKey must be well formed in getSIWEStatementForPublicKey',
  );
  if (messageType === SIWEMessageTypes.MSG_AUTH) {
    return `Primary device IdPubKey: ${publicKey} ${siweStatementLegalAgreement}`;
  }
  return (
    `Backup message for primary device IdPubKey: ` +
    `${publicKey} ${siweStatementLegalAgreement}`
  );
}

const siweStatementWithPublicKeyRegex =
  /^(Primary device|Backup message for primary device) IdPubKey: [a-zA-Z0-9+/]{43} By continuing, I accept the Comm Terms of Service: https:\/\/comm.app\/terms$/;
function isValidSIWEStatementWithPublicKey(candidate: string): boolean {
  return siweStatementWithPublicKeyRegex.test(candidate);
}

const publicKeyFromSIWEStatementRegex: RegExp = /[a-zA-Z0-9+/]{43}/;
function getPublicKeyFromSIWEStatement(statement: string): string {
  invariant(
    isValidSIWEStatementWithPublicKey(statement),
    'candidate must be well formed SIWE statement with public key',
  );
  const publicKeyMatchArray = statement.match(publicKeyFromSIWEStatementRegex);
  invariant(
    publicKeyMatchArray !== null &&
      publicKeyMatchArray !== undefined &&
      publicKeyMatchArray.length === 1,
    'publicKeyMatchArray should have one and only one element',
  );
  return publicKeyMatchArray[0];
}

// These are shown in the `SIWE` components on both `landing` and `web`.
const siweMessageSigningExplanationStatements: string =
  `To complete the login process, you’ll now be ` +
  `asked to sign a message using your wallet. ` +
  `This signature will attest that your Ethereum ` +
  `identity is represented by your new Comm identity.`;

const siweMessageSigningButtonStatement = 'Sign in using this wallet';

const siweBackupMessageSigningExplanationStatements: string =
  `Your signature on this message will be used to derive ` +
  `a secret key that will encrypt your Comm backup.`;

const siweBackupRestoreMessageSigningExplanationStatements: string =
  `Your signature on this message will be used to derive ` +
  `a secret key that will decrypt your Comm backup.`;

const siweBackupMessageSigningButtonStatement = 'Create a backup key';
const siweBackupRestoreMessageSigningButtonStatement = 'Retrieve backup key';

const userTextsForSIWEMessageTypes: {
  +[signatureRequestType: string]: {
    +explanationStatement: string,
    +showTermsAgreement: boolean,
    +buttonStatement: string,
  },
} = {
  [SIWEMessageTypes.MSG_AUTH]: {
    explanationStatement: siweMessageSigningExplanationStatements,
    showTermsAgreement: true,
    buttonStatement: siweMessageSigningButtonStatement,
  },
  [SIWEMessageTypes.MSG_BACKUP]: {
    explanationStatement: siweBackupMessageSigningExplanationStatements,
    showTermsAgreement: false,
    buttonStatement: siweBackupMessageSigningButtonStatement,
  },
  [SIWEMessageTypes.MSG_BACKUP_RESTORE]: {
    explanationStatement: siweBackupRestoreMessageSigningExplanationStatements,
    showTermsAgreement: false,
    buttonStatement: siweBackupRestoreMessageSigningButtonStatement,
  },
};

export {
  isValidSIWENonce,
  isValidEthereumAddress,
  isValidSIWEMessageType,
  isValidSIWEIssuedAt,
  primaryIdentityPublicKeyRegex,
  isValidPrimaryIdentityPublicKey,
  createSIWEMessage,
  isValidSIWEMessage,
  getSIWEStatementForPublicKey,
  isValidSIWEStatementWithPublicKey,
  getPublicKeyFromSIWEStatement,
  siweMessageSigningExplanationStatements,
  siweBackupMessageSigningExplanationStatements,
  siweBackupMessageSigningButtonStatement,
  siweMessageSigningButtonStatement,
  userTextsForSIWEMessageTypes,
};
