// @flow

import { dbQuery, SQL } from '../database/database';
import type { Viewer } from '../session/viewer';

async function assignMedia(
  viewer: Viewer,
  mediaIDs: $ReadOnlyArray<string>,
  containerID: string,
): Promise<void> {
  const query = SQL`
    UPDATE uploads
    SET container = ${containerID}
    WHERE id IN (${mediaIDs}) AND uploader = ${viewer.id} AND container IS NULL
  `;
  await dbQuery(query);
}

export { assignMedia };
