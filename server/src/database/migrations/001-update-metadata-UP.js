// @flow

import { dbQuery, SQL } from '../database';

async function alterName() {
  await dbQuery(SQL`
    ALTER TABLE metadata
    MODIFY name 
    VARCHAR(255)
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_bin;
  `);
}

async function alterData() {
  await dbQuery(SQL`
    ALTER TABLE metadata
    MODIFY data 
    VARCHAR(255)
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_bin;
  `);
}

export { alterName as m1, alterData as m2 };
