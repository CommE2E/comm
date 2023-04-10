// @flow

import type { MediaMessageServerDBContent } from 'lib/types/messages/media.js';
import { getUploadIDsFromMediaMessageServerDBContents } from 'lib/types/messages/media.js';

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';

async function assignImages(
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

async function assignUserContainerToMedia(
  viewer: Viewer,
  mediaID: string,
): Promise<void> {
  const query = SQL`
    UPDATE uploads
    SET container = ${viewer.id}
    WHERE id = ${mediaID}
      AND uploader = ${viewer.id} 
      AND container IS NULL
  `;
  await dbQuery(query);
}

// NOTE: We AREN'T setting the `thread` column for this `uploads` entry
//       because we don't want this upload to be included in the
//       result set of `fetchMediaForThread`.
async function assignThreadContainerToMedia(
  viewer: Viewer,
  mediaID: string,
  threadID: string,
): Promise<void> {
  const query = SQL`
    UPDATE uploads
    SET container = ${threadID}
    WHERE id = ${mediaID}
      AND uploader = ${viewer.id} 
      AND container IS NULL
  `;
  await dbQuery(query);
}

export {
  assignImages,
  assignMessageContainerToMedia,
  assignUserContainerToMedia,
  assignThreadContainerToMedia,
};
