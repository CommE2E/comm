// @flow

import type {
  CreateOrUpdatePublicLinkRequest,
  InviteLink,
} from 'lib/types/link-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { ServerError } from 'lib/utils/errors.js';

import createIDs from './id-creator.js';
import {
  dbQuery,
  MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE,
  SQL,
} from '../database/database.js';
import { fetchPrimaryInviteLinks } from '../fetchers/link-fetchers.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import { Viewer } from '../session/viewer.js';

const secretRegex = /^[a-zA-Z0-9]+$/;

async function createOrUpdatePublicLink(
  viewer: Viewer,
  request: CreateOrUpdatePublicLinkRequest,
): Promise<InviteLink> {
  if (!secretRegex.test(request.name)) {
    throw new ServerError('invalid_characters');
  }

  const permissionPromise = checkThreadPermission(
    viewer,
    request.communityID,
    threadPermissions.MANAGE_INVITE_LINKS,
  );
  const existingPrimaryLinksPromise = fetchPrimaryInviteLinks(viewer);
  const fetchThreadInfoPromise = fetchServerThreadInfos({
    threadID: request.communityID,
  });
  const [hasPermission, existingPrimaryLinks, { threadInfos }] =
    await Promise.all([
      permissionPromise,
      existingPrimaryLinksPromise,
      fetchThreadInfoPromise,
    ]);
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }
  const threadInfo = threadInfos[request.communityID];
  if (!threadInfo) {
    throw new ServerError('invalid_parameters');
  }
  const defaultRoleID = Object.keys(threadInfo.roles).find(
    roleID => threadInfo.roles[roleID].isDefault,
  );
  if (!defaultRoleID) {
    throw new ServerError('invalid_parameters');
  }

  const existingPrimaryLink = existingPrimaryLinks.find(
    link => link.communityID === request.communityID && link.primary,
  );
  if (existingPrimaryLink) {
    const query = SQL`
      UPDATE invite_links
      SET name = ${request.name}
      WHERE \`primary\` = 1 AND community = ${request.communityID}
    `;
    try {
      await dbQuery(query);
    } catch (e) {
      if (e.errno === MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE) {
        throw new ServerError('already_in_use');
      }
      throw new ServerError('invalid_parameters');
    }
    return {
      name: request.name,
      primary: true,
      role: defaultRoleID,
      communityID: request.communityID,
      expirationTime: null,
      limitOfUses: null,
      numberOfUses: 0,
    };
  }

  const [id] = await createIDs('invite_links', 1);

  const row = [id, request.name, true, request.communityID, defaultRoleID];

  const createLinkQuery = SQL`
    INSERT INTO invite_links(id, name, \`primary\`, community, role)
    SELECT ${row}
    WHERE NOT EXISTS (
      SELECT i.id
      FROM invite_links i
      WHERE i.\`primary\` = 1 AND i.community = ${request.communityID}
    )
  `;
  let result = null;
  const deleteIDs = SQL`
    DELETE FROM ids
    WHERE id = ${id}
  `;
  try {
    result = (await dbQuery(createLinkQuery))[0];
  } catch (e) {
    await dbQuery(deleteIDs);
    if (e.errno === MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE) {
      throw new ServerError('already_in_use');
    }
    throw new ServerError('invalid_parameters');
  }

  if (result.affectedRows === 0) {
    await dbQuery(deleteIDs);
    throw new ServerError('invalid_parameters');
  }

  return {
    name: request.name,
    primary: true,
    role: defaultRoleID,
    communityID: request.communityID,
    expirationTime: null,
    limitOfUses: null,
    numberOfUses: 0,
  };
}

export { createOrUpdatePublicLink };
