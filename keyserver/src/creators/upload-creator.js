// @flow

import crypto from 'crypto';

import type {
  MediaType,
  UploadMultimediaResult,
  Dimensions,
} from 'lib/types/media-types.js';
import { ServerError } from 'lib/utils/errors.js';

import createIDs from './id-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { getUploadURL } from '../fetchers/upload-fetchers.js';
import type { Viewer } from '../session/viewer.js';

export type UploadInput = {
  name: string,
  mime: string,
  mediaType: MediaType,
  buffer: Buffer,
  dimensions: Dimensions,
  loop: boolean,
  encryptionKey?: string,
};
async function createUploads(
  viewer: Viewer,
  uploadInfos: $ReadOnlyArray<UploadInput>,
): Promise<UploadMultimediaResult[]> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const ids = await createIDs('uploads', uploadInfos.length);
  const uploadRows = uploadInfos.map(uploadInfo => {
    const id = ids.shift();
    const secret = crypto.randomBytes(8).toString('hex');
    const { dimensions, mediaType, loop, encryptionKey } = uploadInfo;
    return {
      uploadResult: {
        id,
        uri: getUploadURL(id, secret),
        dimensions,
        mediaType,
        loop,
      },
      insert: [
        id,
        viewer.userID,
        mediaType,
        uploadInfo.name,
        uploadInfo.mime,
        uploadInfo.buffer,
        secret,
        Date.now(),
        JSON.stringify({ ...dimensions, loop, encryptionKey }),
      ],
    };
  });

  const insertQuery = SQL`
    INSERT INTO uploads(id, uploader, type, filename,
      mime, content, secret, creation_time, extra)
    VALUES ${uploadRows.map(({ insert }) => insert)}
  `;
  await dbQuery(insertQuery);

  return uploadRows.map(({ uploadResult }) => uploadResult);
}

export default createUploads;
