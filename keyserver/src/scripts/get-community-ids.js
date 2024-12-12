// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function fetchCommunityIDsByNames(
  communityNames: $ReadOnlyArray<string>,
): Promise<{
  communityIDs: $ReadOnlyArray<string>,
  unresolvedNames: $ReadOnlyArray<string>,
}> {
  if (communityNames.length === 0) {
    return { communityIDs: [], unresolvedNames: [] };
  }

  const query = SQL`
    SELECT t.name, c.id
    FROM communities c
    INNER JOIN threads t
      ON c.id = t.id
    WHERE t.name IN (${communityNames})
      AND c.farcaster_channel_id IS NOT NULL
  `;

  const [result] = await dbQuery(query);

  const resolvedNames = result.map(row => row.name);
  const communityIDs = result.map(row => row.id.toString());
  const unresolvedNames = communityNames.filter(
    name => !resolvedNames.includes(name),
  );

  return { communityIDs, unresolvedNames };
}

async function fetchCommunityIDsByNamesScript() {
  const communityNames: $ReadOnlyArray<string> = []; // Replace with actual community names
  const { communityIDs, unresolvedNames } =
    await fetchCommunityIDsByNames(communityNames);
  console.log('Fetched Community IDs:', communityIDs);

  if (unresolvedNames.length > 0) {
    console.log('Unresolved Community Names:', unresolvedNames);
  }
}

main([fetchCommunityIDsByNamesScript]);
