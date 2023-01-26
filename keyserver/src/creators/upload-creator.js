// @flow

import crypto from 'crypto';

import { shimUploadURI } from 'lib/media/media-utils';
import type {
  MediaType,
  UploadMultimediaResult,
  Dimensions,
} from 'lib/types/media-types';
import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database/database';
import { getUploadURL } from '../fetchers/upload-fetchers';
import type { Viewer } from '../session/viewer';
import createIDs from './id-creator';

export type UploadInput = {
  name: string,
  mime: string,
  mediaType: MediaType,
  buffer: Buffer,
  dimensions: Dimensions,
  loop: boolean,
  thread: string,
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
    const { dimensions, mediaType, loop, thread } = uploadInfo;
    return {
      uploadResult: {
        id,
        thread,
        uri: shimUploadURI(getUploadURL(id, secret), viewer.platformDetails),
        dimensions,
        mediaType,
        loop,
      },
      insert: [
        id,
        thread,
        viewer.userID,
        mediaType,
        uploadInfo.name,
        uploadInfo.mime,
        uploadInfo.buffer,
        secret,
        Date.now(),
        JSON.stringify({ ...dimensions, loop }),
      ],
    };
  });

  const insertQuery = SQL`
    INSERT INTO uploads(id, thread, uploader, type, filename,
      mime, content, secret, creation_time, extra)
    VALUES ${uploadRows.map(({ insert }) => insert)}
  `;
  await dbQuery(insertQuery);

  return uploadRows.map(({ uploadResult }) => uploadResult);
}

export default createUploads;
