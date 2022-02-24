// @flow

import { dbQuery, SQL } from '../database';

async function alterName() {
  await dbQuery(SQL`
    ALTER TABLE metadata
    MODIFY name 
    VARCHAR(255)
    CHARACTER SET utf8
    COLLATE utf8_bin;
  `);
}

async function alterData() {
  await dbQuery(SQL`
    ALTER TABLE metadata
    MODIFY data 
    VARCHAR(255)
    CHARACTER SET utf8
    COLLATE utf8_bin;
  `);
}

export { alterName as m3, alterData as m4 };
