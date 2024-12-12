// @flow

import { main } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function fetchCommunityIDsByNames(
  communityNames: $ReadOnlyArray<string>,
): Promise<$ReadOnlyArray<string>> {
  if (communityNames.length === 0) {
    return [];
  }

  const query = SQL`
    SELECT c.id
    FROM communities c
    INNER JOIN threads t
      ON c.id = t.id
    WHERE t.name IN (${communityNames})
  `;

  const [result] = await dbQuery(query);

  const communityIDs = result.map(row => row.id.toString());

  return communityIDs;
}

async function fetchCommunityIDsByNamesScript() {
  const communityNames: $ReadOnlyArray<string> = []; // Replace with actual community names
  const communityIDs = await fetchCommunityIDsByNames(communityNames);
  console.log('Fetched Community IDs:', communityIDs);
}

main([fetchCommunityIDsByNamesScript]);
