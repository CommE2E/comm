// @flow

import type { MediaMessageServerDBContent } from 'lib/types/messages/media.js';
import { getUploadIDsFromMediaMessageServerDBContents } from 'lib/types/messages/media.js';

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

async function assignMessageContainerToMedia(
  viewer: Viewer,
  mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
  containerID: string,
): Promise<void> {
  const uploadIDs = getUploadIDsFromMediaMessageServerDBContents(
    mediaMessageContents,
  );
  const query = SQL`
    UPDATE uploads
    SET container = ${containerID}
    WHERE id IN (${uploadIDs}) AND uploader = ${viewer.id} AND container IS NULL
  `;
  await dbQuery(query);
}

async function assignThreadToMedia(viewer: Viewer): Promise<void> {
  const query = SQL`
    UPDATE uploads 
    SET thread = (
      SELECT thread FROM messages 
      WHERE messages.id = uploads.container
    )
    WHERE uploader = ${viewer.id} AND thread IS NULL
  `;
  await dbQuery(query);
}

export { assignMedia, assignMessageContainerToMedia, assignThreadToMedia };
