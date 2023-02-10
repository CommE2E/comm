// @flow

import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';

async function deleteUpload(viewer: Viewer, id: string): Promise<void> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const fetchQuery = SQL`
    SELECT uploader, container
    FROM uploads
    WHERE id = ${id}
  `;
  const [result] = await dbQuery(fetchQuery);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const [row] = result;
  const { uploader, container } = row;

  if (uploader.toString() !== viewer.userID || container !== null) {
    throw new ServerError('invalid_parameters');
  }

  const deleteQuery = SQL`
    DELETE u, i
    FROM uploads u
    LEFT JOIN ids i ON i.id = u.id
    WHERE u.id = ${id}
  `;
  await dbQuery(deleteQuery);
}

const maxUnassignedUploadAge = 24 * 60 * 60 * 1000;
async function deleteUnassignedUploads(): Promise<void> {
  const oldestUnassignedUploadToKeep = Date.now() - maxUnassignedUploadAge;
  await dbQuery(SQL`
    DELETE u, i
    FROM uploads u
    LEFT JOIN ids i ON i.id = u.id
    WHERE u.container IS NULL
      AND creation_time < ${oldestUnassignedUploadToKeep}
  `);
}

export { deleteUpload, deleteUnassignedUploads };
