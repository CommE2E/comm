// @flow

import type { Viewer } from '../session/viewer';

import { dbQuery, SQL } from '../database';
import { ServerError } from 'lib/utils/errors';

async function deleteUpload(
  viewer: Viewer,
  id: string,
): Promise<void> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const fetchQuery = SQL`
    SELECT uploader, container
    FROM uploads
    WHERE id = ${id}
  `;
  const [ result ] = await dbQuery(fetchQuery);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const [ row ] = result;
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

export {
  deleteUpload,
};
