// @flow

import type {
  MediaType,
  UploadMultimediaResult,
  Dimensions,
} from 'lib/types/media-types';
import type { Viewer } from '../session/viewer';

import crypto from 'crypto';

import { ServerError } from 'lib/utils/errors';
import { shimUploadURI } from 'lib/shared/media-utils';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';
import { getUploadURL } from '../fetchers/upload-fetchers';

export type UploadInput = {|
  name: string,
  mime: string,
  mediaType: MediaType,
  buffer: Buffer,
  dimensions: Dimensions,
|};
async function createUploads(
  viewer: Viewer,
  uploadInfos: $ReadOnlyArray<UploadInput>,
): Promise<UploadMultimediaResult[]> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const ids = await createIDs('uploads', uploadInfos.length);
  const secret = crypto.randomBytes(8).toString('hex');
  const uploadRows = uploadInfos.map(uploadInfo => [
    ids.shift(),
    viewer.userID,
    uploadInfo.mediaType,
    uploadInfo.name,
    uploadInfo.mime,
    uploadInfo.buffer,
    secret,
    Date.now(),
    JSON.stringify(uploadInfo.dimensions),
  ]);

  const insertQuery = SQL`
    INSERT INTO uploads(id, uploader, type, filename,
      mime, content, secret, creation_time, extra)
    VALUES ${uploadRows}
  `;
  await dbQuery(insertQuery);

  return uploadRows.map(row => ({
    id: row[0],
    uri: shimUploadURI(getUploadURL(row[0], row[6]), viewer.platformDetails),
  }));
}

export default createUploads;
