// @flow

import type { DisableInviteLinkRequest } from 'lib/types/link-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import { Viewer } from '../session/viewer.js';

async function deleteInviteLink(
  viewer: Viewer,
  request: DisableInviteLinkRequest,
) {
  const hasPermission = await checkThreadPermission(
    viewer,
    request.communityID,
    threadPermissions.MANAGE_INVITE_LINKS,
  );
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }

  const query = SQL`
    DELETE FROM invite_links
    WHERE name = ${request.name} AND community = ${request.communityID}
  `;

  await dbQuery(query);
}

export { deleteInviteLink };
