// @flow

import type {
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
      id: communityID,
    },
  };
}

export { verifyInviteLink };
