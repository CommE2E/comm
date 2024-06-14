// @flow

import type { AuthMetadata } from './identity-client-context.js';
import blobService from '../facts/blob-service.js';
import { getBlobFetchableURL } from '../utils/blob-service.js';
import { createDefaultHTTPRequestHeaders } from '../utils/services-utils.js';

const inviteLinkErrorMessages: { +[string]: string } = {
  invalid_characters: 'Link cannot contain any spaces or special characters.',
  offensive_words: 'No offensive or abusive words allowed.',
  already_in_use: 'Public link URL already in use.',
  link_reserved:
    'This public link is currently reserved. Please contact support@' +
    'comm.app if you would like to claim this link.',
};

const defaultErrorMessage = 'Unknown error.';

function inviteLinkBlobHash(secret: string): string {
  return `invite_${secret}`;
}

export type KeyserverOverride = {
  +keyserverID: string,
  +keyserverURL: string,
};

async function getKeyserverOverrideForAnInviteLink(
  secret: string,
  authMetadata?: AuthMetadata,
): Promise<?KeyserverOverride> {
  const blobURL = getBlobFetchableURL(inviteLinkBlobHash(secret));
  const headers = authMetadata
    ? createDefaultHTTPRequestHeaders(authMetadata)
    : {};
  const result = await fetch(blobURL, {
    method: blobService.httpEndpoints.GET_BLOB.method,
    headers,
  });
  if (result.status !== 200) {
    return null;
  }
  const resultText = await result.text();
  const resultObject = JSON.parse(resultText);
  if (resultObject.keyserverID && resultObject.keyserverURL) {
    const keyserverURL: string = resultObject.keyserverURL;
    return {
      keyserverID: resultObject.keyserverID,
      keyserverURL: keyserverURL.replace(/\/$/, ''),
    };
  }
  return null;
}

const inviteSecretRegexString = '[a-zA-Z0-9-]+';
const inviteSecretRegex: RegExp = new RegExp(
  `^${inviteSecretRegexString}$`,
  'i',
);

export {
  inviteLinkErrorMessages,
  defaultErrorMessage,
  inviteLinkBlobHash,
  getKeyserverOverrideForAnInviteLink,
  inviteSecretRegexString,
  inviteSecretRegex,
};
