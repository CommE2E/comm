// @flow

import blobService from '../facts/blob-service.js';
import { getBlobFetchableURL } from '../utils/blob-service.js';

function inviteLinkBlobHash(secret: string): string {
  return `invite_${secret}`;
}

export type KeyserverOverride = {
  +keyserverID: string,
  +keyserverURL: string,
};

async function getKeyserverOverrideForAnInviteLink(
  secret: string,
): Promise<?KeyserverOverride> {
  const blobURL = getBlobFetchableURL(inviteLinkBlobHash(secret));
  const result = await fetch(blobURL, {
    method: blobService.httpEndpoints.GET_BLOB.method,
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

export { inviteLinkBlobHash, getKeyserverOverrideForAnInviteLink };
