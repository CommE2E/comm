// @flow

import type {
  InviteLink,
  InviteLinkVerificationRequest,
  InviteLinkVerificationResponse,
} from 'lib/types/link-types.js';

import { dbQuery, SQL } from '../database/database.js';
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
      ON m.thread = i.community AND m.user = ${viewer.userID}
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

async function fetchPrimaryInviteLinks(): Promise<$ReadOnlyArray<InviteLink>> {
  const query = SQL`
    SELECT name, role, community, expiration_time AS expirationTime, 
      limit_of_uses AS limitOfUses, number_of_uses AS numberOfUses
    FROM invite_links
    WHERE \`primary\` = 1
  `;
  const [result] = await dbQuery(query);
  return result.map(row => ({
    name: row.name,
    primary: row.primary,
    role: row.role.toString(),
    communityID: row.community.toString(),
    expirationTime: row.expirationTime,
    limitOfUses: row.limitOfUses,
    numberOfUses: row.numberOfUses,
  }));
}

export { verifyInviteLink, checkIfInviteLinkIsValid, fetchPrimaryInviteLinks };
