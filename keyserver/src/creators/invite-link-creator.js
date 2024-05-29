// @flow

import Filter from 'bad-words';
import uuid from 'uuid';

import {
  inviteLinkBlobHash,
  inviteSecretRegex,
} from 'lib/shared/invite-links.js';
import type {
  CreateOrUpdatePublicLinkRequest,
  InviteLink,
} from 'lib/types/link-types.js';
import { threadPermissions } from 'lib/types/thread-permission-types.js';
import { ServerError } from 'lib/utils/errors.js';
import { reservedUsernamesSet } from 'lib/utils/reserved-users.js';

import createIDs from './id-creator.js';
import {
  dbQuery,
  MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE,
  SQL,
} from '../database/database.js';
import { fetchPrimaryInviteLinks } from '../fetchers/link-fetchers.js';
import { fetchServerThreadInfos } from '../fetchers/thread-fetchers.js';
import { checkThreadPermission } from '../fetchers/thread-permission-fetchers.js';
import {
  download,
  type BlobDownloadResult,
  assignHolder,
  uploadBlob,
  deleteBlob,
  type BlobOperationResult,
} from '../services/blob.js';
import { Viewer } from '../session/viewer.js';
import { thisKeyserverID } from '../user/identity.js';
import { getAndAssertKeyserverURLFacts } from '../utils/urls.js';

const badWordsFilter = new Filter();

async function createOrUpdatePublicLink(
  viewer: Viewer,
  request: CreateOrUpdatePublicLinkRequest,
): Promise<InviteLink> {
  if (!inviteSecretRegex.test(request.name)) {
    throw new ServerError('invalid_characters');
  }
  if (badWordsFilter.isProfane(request.name)) {
    throw new ServerError('offensive_words');
  }
  if (reservedUsernamesSet.has(request.name)) {
    throw new ServerError('link_reserved');
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
  const blobDownloadPromise = getInviteLinkBlob(request.name);
  const [
    hasPermission,
    existingPrimaryLinks,
    { threadInfos },
    blobDownloadResult,
  ] = await Promise.all([
    permissionPromise,
    existingPrimaryLinksPromise,
    fetchThreadInfoPromise,
    blobDownloadPromise,
  ]);
  if (!hasPermission) {
    throw new ServerError('invalid_credentials');
  }
  if (blobDownloadResult.found) {
    throw new ServerError('already_in_use');
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

  const blobHolder = uuid.v4();
  const blobResult = await uploadInviteLinkBlob(request.name, blobHolder);
  if (!blobResult.success) {
    if (blobResult.reason === 'HASH_IN_USE') {
      throw new ServerError('already_in_use');
    } else {
      throw new ServerError('unknown_error');
    }
  }

  if (existingPrimaryLink) {
    const query = SQL`
      UPDATE invite_links
      SET name = ${request.name}, blob_holder = ${blobHolder}
      WHERE \`primary\` = 1 AND community = ${request.communityID}
    `;
    try {
      await dbQuery(query);
      const holder = existingPrimaryLink.blobHolder;
      if (holder) {
        await deleteBlob(
          {
            hash: inviteLinkBlobHash(existingPrimaryLink.name),
            holder,
          },
          true,
        );
      }
    } catch (e) {
      await deleteBlob(
        {
          hash: inviteLinkBlobHash(request.name),
          holder: blobHolder,
        },
        true,
      );
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

  const row = [
    id,
    request.name,
    true,
    request.communityID,
    defaultRoleID,
    blobHolder,
  ];

  const createLinkQuery = SQL`
    INSERT INTO invite_links(id, name, \`primary\`, community, role, blob_holder)
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
    await Promise.all([
      dbQuery(deleteIDs),
      deleteBlob(
        {
          hash: inviteLinkBlobHash(request.name),
          holder: blobHolder,
        },
        true,
      ),
    ]);
    if (e.errno === MYSQL_DUPLICATE_ENTRY_FOR_KEY_ERROR_CODE) {
      throw new ServerError('already_in_use');
    }
    throw new ServerError('invalid_parameters');
  }

  if (result.affectedRows === 0) {
    await Promise.all([
      dbQuery(deleteIDs),
      deleteBlob(
        {
          hash: inviteLinkBlobHash(request.name),
          holder: blobHolder,
        },
        true,
      ),
    ]);
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

function getInviteLinkBlob(secret: string): Promise<BlobDownloadResult> {
  const hash = inviteLinkBlobHash(secret);
  return download(hash);
}

async function uploadInviteLinkBlob(
  linkSecret: string,
  holder: string,
): Promise<BlobOperationResult> {
  const keyserverID = await thisKeyserverID();

  const { baseDomain, basePath } = getAndAssertKeyserverURLFacts();
  const keyserverURL = baseDomain + basePath;

  const payload = {
    keyserverID,
    keyserverURL,
  };
  const payloadString = JSON.stringify(payload);
  const key = inviteLinkBlobHash(linkSecret);
  const blob = new Blob([payloadString]);

  const uploadResult = await uploadBlob(blob, key);
  if (!uploadResult.success) {
    return uploadResult;
  }

  return await assignHolder({ holder, hash: key });
}

export { createOrUpdatePublicLink, uploadInviteLinkBlob, getInviteLinkBlob };
