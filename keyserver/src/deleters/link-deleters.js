// @flow

import { inviteLinkBlobHash } from 'lib/shared/invite-links.js';
import type { DisableInviteLinkRequest } from 'lib/types/link-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import { deleteBlob } from '../services/blob.js';
import { Viewer } from '../session/viewer.js';

type InviteLinksToDelete = {
  +id: string,
  +name: string,
  +blobHolder: string,
};
async function deleteInviteLinks(
  links: $ReadOnlyArray<InviteLinksToDelete>,
): Promise<void> {
  await Promise.all(
    links.map(({ name, blobHolder }) =>
      deleteBlob(
        {
          hash: inviteLinkBlobHash(name),
          holder: blobHolder,
        },
        true,
      ),
    ),
  );
  const ids = links.map(({ id }) => id);
  await dbQuery(
    SQL`
    START TRANSACTION;
    DELETE FROM invite_links WHERE id IN (${ids});
    DELETE FROM ids WHERE id IN (${ids});
    COMMIT;
  `,
    { multipleStatements: true },
  );
}

async function deleteInviteLink(
  viewer: Viewer,
  request: DisableInviteLinkRequest,
): Promise<void> {
  const hasPermission = await checkThreadPermission(
    viewer,
    request.communityID,
    threadPermissions.MANAGE_INVITE_LINKS,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const [[result]] = await dbQuery(SQL`
    SELECT id, name, blob_holder AS blobHolder
    FROM invite_links
    WHERE name = ${request.name} AND community = ${request.communityID}
  `);
  if (!result) {
    return;
  }
  await deleteInviteLinks([result]);
}

export { deleteInviteLink };
