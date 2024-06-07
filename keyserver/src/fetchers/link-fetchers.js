// @flow

import type {
  InviteLinkWithHolder,
  InviteLinkVerificationRequest,
  InviteLinkVerificationResponse,
} from 'lib/types/link-types.js';

import { dbQuery, SQL } from '../database/database.js';
import type { SQLStatementType } from '../database/types.js';
import { Viewer } from '../session/viewer.js';

async function verifyInviteLink(
  viewer: Viewer,
  request: InviteLinkVerificationRequest,
): Promise<InviteLinkVerificationResponse> {
  const query = SQL`
    SELECT c.name, i.community AS communityID, m.role
    FROM invite_links i
    INNER JOIN threads c ON c.id = i.community
    LEFT JOIN memberships m 
      ON m.thread = i.community
        AND m.user = ${viewer.loggedIn ? viewer.userID : null}
    WHERE i.name = ${request.secret}
      AND c.community IS NULL
  `;
  const [result] = await dbQuery(query);
  if (result.length === 0) {
    return {
      status: 'invalid',
    };
  }

  const { name, communityID, role } = result[0];
  const status = role > 0 ? 'already_joined' : 'valid';
  return {
    status,
    community: {
      name,
      id: communityID.toString(),
    },
  };
}

async function checkIfInviteLinkIsValid(
  secret: string,
  communityID: string,
): Promise<boolean> {
  const query = SQL`
    SELECT i.id 
    FROM invite_links i
    INNER JOIN threads c ON c.id = i.community
    WHERE i.name = ${secret}
      AND i.community = ${communityID}
      AND c.community IS NULL
  `;
  const [result] = await dbQuery(query);
  return result.length === 1;
}

async function fetchInviteLinksWithCondition(
  condition: SQLStatementType,
): Promise<$ReadOnlyArray<InviteLinkWithHolder>> {
  const query = SQL`
    SELECT i.name, i.role, i.community, i.expiration_time AS expirationTime, 
      i.limit_of_uses AS limitOfUses, i.number_of_uses AS numberOfUses, 
      i.\`primary\`, i.blob_holder AS blobHolder, i.thread, 
      i.thread_role AS threadRole
    FROM invite_links i
  `;
  query.append(condition);

  const [result] = await dbQuery(query);
  return result.map(row => {
    const link = {
      name: row.name,
      primary: row.primary === 1,
      role: row.role.toString(),
      communityID: row.community.toString(),
      expirationTime: row.expirationTime,
      limitOfUses: row.limitOfUses,
      numberOfUses: row.numberOfUses,
      blobHolder: row.blobHolder,
    };
    if (row.thread && row.threadRole) {
      return {
        ...link,
        threadID: row.thread.toString(),
        threadRole: row.threadRole.toString(),
      };
    }
    return link;
  });
}

function fetchPrimaryInviteLinks(
  viewer: Viewer,
): Promise<$ReadOnlyArray<InviteLinkWithHolder>> {
  if (!viewer.loggedIn) {
    return Promise.resolve([]);
  }

  const condition = SQL`
    INNER JOIN memberships m 
      ON i.community = m.thread AND m.user = ${viewer.userID}
    WHERE i.\`primary\` = 1 AND m.role > 0
  `;
  return fetchInviteLinksWithCondition(condition);
}

function fetchAllPrimaryInviteLinks(): Promise<
  $ReadOnlyArray<InviteLinkWithHolder>,
> {
  const condition = SQL`
    WHERE i.\`primary\` = 1
  `;
  return fetchInviteLinksWithCondition(condition);
}

export {
  verifyInviteLink,
  checkIfInviteLinkIsValid,
  fetchPrimaryInviteLinks,
  fetchAllPrimaryInviteLinks,
};
