// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function fetchCommCommunityIDsByFarcasterChannelIDs(
  farcasterChannelIDs: $ReadOnlyArray<string>,
): Promise<{
  communityIDs: $ReadOnlyArray<string>,
  unresolvedFarcasterChannelIDs: $ReadOnlyArray<string>,
}> {
  if (farcasterChannelIDs.length === 0) {
    return { communityIDs: [], unresolvedFarcasterChannelIDs: [] };
  }

  const query = SQL`
    SELECT id, farcaster_channel_id
    FROM communities
    WHERE farcaster_channel_id IN (${farcasterChannelIDs})
  `;

  const [result] = await dbQuery(query);

  const resolvedFarcasterChannelIDs = result.map(
    row => row.farcaster_channel_id,
  );
  const communityIDs = result.map(row => row.id.toString());
  const unresolvedFarcasterChannelIDs = farcasterChannelIDs.filter(
    farcasterChannelID =>
      !resolvedFarcasterChannelIDs.includes(farcasterChannelID),
  );

  return { communityIDs, unresolvedFarcasterChannelIDs };
}

async function fetchCommunityIDsByFarcasterChannelIDsScript() {
  // Replace with actual community names
  const farcasterChannelIDs: $ReadOnlyArray<string> = [];
  const { communityIDs, unresolvedFarcasterChannelIDs } =
    await fetchCommCommunityIDsByFarcasterChannelIDs(farcasterChannelIDs);
  console.log('Comm community IDs:', communityIDs);

  if (unresolvedFarcasterChannelIDs.length > 0) {
    console.log(
      'Unresolved Farcaster channel IDs:',
      unresolvedFarcasterChannelIDs,
    );
  }
}

main([fetchCommunityIDsByFarcasterChannelIDsScript]);
