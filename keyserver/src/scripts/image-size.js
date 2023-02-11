// @flow

import sizeOf from 'buffer-image-size';

import { endScript } from './utils.js';
import { dbQuery, SQL } from '../database/database.js';

async function main() {
  try {
    await addImageSizeToUploadsTable();
    endScript();
  } catch (e) {
    endScript();
    console.warn(e);
  }
}

async function addImageSizeToUploadsTable() {
  await dbQuery(SQL`ALTER TABLE uploads ADD extra JSON NULL AFTER secret;`);
  const [result] = await dbQuery(SQL`
    SELECT id, content
    FROM uploads
    WHERE type = "photo" AND extra IS NULL
  `);
  for (const row of result) {
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
