// @flow

import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import { deleteBlob, removeBlobHolders } from '../services/blob.js';
import type { Viewer } from '../session/viewer.js';
import { blobHoldersFromUploadRows } from '../uploads/media-utils.js';

async function deleteUpload(viewer: Viewer, id: string): Promise<void> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const fetchQuery = SQL`
    SELECT uploader, container, user_container AS userContainer, extra
    FROM uploads
    WHERE id = ${id}
  `;
  const [result] = await dbQuery(fetchQuery);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const [row] = result;
  const { uploader, container, userContainer, extra } = row;

  if (
    uploader.toString() !== viewer.userID ||
    container !== null ||
    userContainer !== null
  ) {
    throw new ServerError('invalid_parameters');
  }

  const { blobHash, blobHolder } = JSON.parse(extra);
  let holderRemovalPromise;
  if (blobHash && blobHolder) {
    holderRemovalPromise = deleteBlob({
      hash: blobHash,
      holder: blobHolder,
    });
  }

  const deleteQuery = SQL`
    DELETE u, i
    FROM uploads u
    LEFT JOIN ids i ON i.id = u.id
    WHERE u.id = ${id}
  `;
  await Promise.all([dbQuery(deleteQuery), holderRemovalPromise]);
}

const maxUnassignedUploadAge = 24 * 60 * 60 * 1000;
async function deleteUnassignedUploads(): Promise<void> {
  const oldestUnassignedUploadToKeep = Date.now() - maxUnassignedUploadAge;

  const holdersQuery = SQL`
    SELECT extra
    FROM uploads
    WHERE container IS NULL
      AND user_container IS NULL
      AND creation_time < ${oldestUnassignedUploadToKeep}
  `;
  const [rows] = await dbQuery(holdersQuery);
  const blobHolders = blobHoldersFromUploadRows(rows);

  const deletionQuery = SQL`
    DELETE u, i
    FROM uploads u
    LEFT JOIN ids i ON i.id = u.id
    WHERE u.container IS NULL
      AND u.user_container IS NULL
      AND creation_time < ${oldestUnassignedUploadToKeep}
  `;
  await Promise.all([dbQuery(deletionQuery), removeBlobHolders(blobHolders)]);
}

export { deleteUpload, deleteUnassignedUploads };
