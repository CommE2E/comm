// @flow

import type { MediaMessageServerDBContent } from 'lib/types/messages/media.js';
import { getUploadIDsFromMediaMessageServerDBContents } from 'lib/types/messages/media.js';

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';

async function assignMedia(
  viewer: Viewer,
  mediaIDs: $ReadOnlyArray<string>,
  containerID: string,
  threadID: string,
): Promise<void> {
  const query = SQL`
    UPDATE uploads
    SET container = ${containerID}, thread = ${threadID}
    WHERE id IN (${mediaIDs}) AND uploader = ${viewer.id} 
      AND container IS NULL AND thread IS NULL
  `;
  await dbQuery(query);
}

async function assignMessageContainerToMedia(
  viewer: Viewer,
  mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
  containerID: string,
  threadID: string,
): Promise<void> {
  const uploadIDs =
    getUploadIDsFromMediaMessageServerDBContents(mediaMessageContents);
  const query = SQL`
    UPDATE uploads
    SET container = ${containerID}, thread = ${threadID}
    WHERE id IN (${uploadIDs}) AND uploader = ${viewer.id} 
      AND container IS NULL AND thread IS NULL
  `;
  await dbQuery(query);
}

export { assignMedia, assignMessageContainerToMedia };
