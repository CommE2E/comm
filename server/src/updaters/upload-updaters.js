// @flow

import { dbQuery, SQL } from '../database/database';
import type { Viewer } from '../session/viewer';
import type { MediaMessageContent } from 'lib/types/messages/media';

async function assignMedia(
  viewer: Viewer,
  messageContent: $ReadOnlyArray<MediaMessageContent>,
  containerID: string,
): Promise<void> {
  const mediaToBeAssigned = [];
  for (const mediaItem of messageContent) {
    mediaToBeAssigned.push(mediaItem.mediaID);
    mediaToBeAssigned.push(mediaItem.thumbnailID);
  }

  const query = SQL`
    UPDATE uploads
    SET container = ${containerID}
    WHERE id IN (${mediaToBeAssigned.filter(Boolean)}) AND uploader = ${
    viewer.id
  } AND container IS NULL
  `;
  await dbQuery(query);
}

export { assignMedia };
