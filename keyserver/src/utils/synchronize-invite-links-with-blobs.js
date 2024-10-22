// @flow

import uuid from 'uuid';

import { inviteLinkBlobHash } from 'lib/shared/invite-links.js';
import type { InviteLinkWithHolder } from 'lib/types/link-types.js';

import {
  getInviteLinkBlob,
  uploadInviteLinkBlob,
} from '../creators/invite-link-creator.js';
import { fetchAllPrimaryInviteLinks } from '../fetchers/link-fetchers.js';
import { setLinkHolder } from '../updaters/link-updaters.js';

async function synchronizeInviteLinksWithBlobs() {
  const links = await fetchAllPrimaryInviteLinks();
  const promises = [];
  for (const link: InviteLinkWithHolder of links) {
    promises.push(
      (async () => {
        const isHolderPresent = !!link.blobHolder;
        const holder = link.blobHolder ?? uuid.v4();
        if (isHolderPresent) {
          const blobFetchResult = await getInviteLinkBlob(
            inviteLinkBlobHash(link.name),
          );
          if (blobFetchResult.found) {
            return;
          }
        }
        const uploadResult = await uploadInviteLinkBlob(link.name, holder);
        if (uploadResult.success && !isHolderPresent) {
          await setLinkHolder(link.name, holder);
        }
      })(),
    );
  }
  try {
    await Promise.all(promises);
  } catch (e) {
    console.error('Invite links - blobs synchronization failed', e);
  }
}

export { synchronizeInviteLinksWithBlobs };
