// @flow

import type { MediaType, UploadMultimediaResult } from 'lib/types/media-types';
import type { Viewer } from '../session/viewer';

import crypto from 'crypto';

import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database';
import createIDs from './id-creator';
import urlFacts from '../../facts/url';

const { baseDomain, basePath } = urlFacts;

type UploadInput = {|
  name: string,
  mime: string,
  mediaType: MediaType,
  buffer: Buffer,
|};
async function createUploads(
  viewer: Viewer,
  uploadInfos: $ReadOnlyArray<UploadInput>,
): Promise<UploadMultimediaResult[]> {
  if (!viewer.loggedIn) {
    throw new ServerError('not_logged_in');
  }

  const ids = await createIDs("uploads", uploadInfos.length);
  const secret = crypto.randomBytes(8).toString('hex');
  const uploadRows = uploadInfos.map(uploadInfo => [
    ids.shift(),
    viewer.userID,
    uploadInfo.mediaType,
    uploadInfo.name,
    uploadInfo.mime,
    uploadInfo.buffer,
    secret,
  ]);

  const insertQuery = SQL`
    INSERT INTO uploads(id, uploader, type, filename, mime, content, secret)
    VALUES ${uploadRows}
  `;
  await dbQuery(insertQuery);

  return uploadRows.map(row => ({
    id: row[0],
    uri: getUploadURL(row[0], row[6]),
  }));
}

function getUploadURL(id: string, secret: string) {
  return `${baseDomain}${basePath}upload/${id}/${secret}`;
}

export default createUploads;
