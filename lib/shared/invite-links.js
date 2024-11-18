// @flow

import type { AuthMetadata } from './identity-client-context.js';
import { downloadBlob } from '../utils/blob-service.js';
import { createDefaultHTTPRequestHeaders } from '../utils/services-utils.js';

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
  const headers = authMetadata
    ? createDefaultHTTPRequestHeaders(authMetadata)
    : {};

  const blobResult = await downloadBlob(inviteLinkBlobHash(secret), headers);
  if (blobResult.result !== 'success') {
    return null;
  }

  const resultText = await blobResult.response.text();
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
