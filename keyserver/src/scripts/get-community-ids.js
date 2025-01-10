// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function fetchCommCommunityIDsByFarcasterChannelIDs(
  farcasterChannelIDs: $ReadOnlyArray<string>,
): Promise<{
  communityMappings: $ReadOnlyArray<[string, string]>,
  unresolvedFarcasterChannelIDs: $ReadOnlyArray<string>,
}> {
  if (farcasterChannelIDs.length === 0) {
    return { communityMappings: [], unresolvedFarcasterChannelIDs: [] };
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
  const communityMappings = result.map(row => [
    row.farcaster_channel_id,
    row.id.toString(),
  ]);
  const unresolvedFarcasterChannelIDs = farcasterChannelIDs.filter(
    farcasterChannelID =>
      !resolvedFarcasterChannelIDs.includes(farcasterChannelID),
  );

  return { communityMappings, unresolvedFarcasterChannelIDs };
}

async function fetchCommunityIDsByFarcasterChannelIDsScript() {
  // Replace with actual Farcaster channel IDs
  const farcasterChannelIDs: $ReadOnlyArray<string> = [];
  const { communityMappings, unresolvedFarcasterChannelIDs } =
    await fetchCommCommunityIDsByFarcasterChannelIDs(farcasterChannelIDs);

  console.log('Comm community ID mappings (FarcasterChannelID, CommunityID):');
  communityMappings.forEach(([farcasterChannelID, communityID]) =>
    console.log(`(${farcasterChannelID}, ${communityID})`),
  );

  if (unresolvedFarcasterChannelIDs.length > 0) {
    console.log(
      'Unresolved Farcaster channel IDs:',
      unresolvedFarcasterChannelIDs,
    );
  }
}

main([fetchCommunityIDsByFarcasterChannelIDsScript]);
