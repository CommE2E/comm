// @flow

import { dbQuery, SQL } from '../database/database.js';

async function reportLinkUsage(secret: string): Promise<void> {
  const query = SQL`
    UPDATE invite_links
    SET number_of_uses = number_of_uses + 1
    WHERE name = ${secret}
  `;
  await dbQuery(query);
}

export { reportLinkUsage };
