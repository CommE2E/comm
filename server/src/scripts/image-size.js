// @flow

import sizeOf from 'buffer-image-size';

import { pool, dbQuery, SQL } from '../database';

async function main() {
  try {
    await addImageSizeToUploadsTable();
    pool.end();
  } catch (e) {
    pool.end();
    console.warn(e);
  }
}

async function addImageSizeToUploadsTable() {
  await dbQuery(SQL`ALTER TABLE uploads ADD extra JSON NULL AFTER secret;`);
  const [ result ] = await dbQuery(SQL`
    SELECT id, content
    FROM uploads
    WHERE type = "photo" AND extra IS NULL
  `);
  for (let row of result) {
    const { height, width } = sizeOf(row.content);
    const dimensions = JSON.stringify({ height, width });
    await dbQuery(SQL`
      UPDATE uploads
      SET extra = ${dimensions}
      WHERE id = ${row.id}
    `);
  }
}

main();
