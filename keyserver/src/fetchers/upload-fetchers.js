// @flow

import type { Media } from 'lib/types/media-types';
import { ServerError } from 'lib/utils/errors';

import { dbQuery, SQL } from '../database/database';
import type { Viewer } from '../session/viewer';
import { getAndAssertCommAppURLFacts } from '../utils/urls';

type UploadInfo = {
  content: Buffer,
  mime: string,
};
async function fetchUpload(
  viewer: Viewer,
  id: string,
  secret: string,
): Promise<UploadInfo> {
  const query = SQL`
    SELECT content, mime
    FROM uploads
    WHERE id = ${id} AND secret = ${secret}
  `;
  const [result] = await dbQuery(query);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const [row] = result;
  const { content, mime } = row;
  return { content, mime };
}

async function fetchUploadChunk(
  id: string,
  secret: string,
  pos: number,
  len: number,
): Promise<UploadInfo> {
  // We use pos + 1 because SQL is 1-indexed whereas js is 0-indexed
  const query = SQL`
    SELECT SUBSTRING(content, ${pos + 1}, ${len}) AS content, mime
    FROM uploads
    WHERE id = ${id} AND secret = ${secret}
  `;
  const [result] = await dbQuery(query);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const [row] = result;
  const { content, mime } = row;
  return {
    content,
    mime,
  };
}

// Returns total size in bytes.
async function getUploadSize(id: string, secret: string): Promise<number> {
  const query = SQL`
    SELECT LENGTH(content) AS length
    FROM uploads
    WHERE id = ${id} AND secret = ${secret}
  `;
  const [result] = await dbQuery(query);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }

  const [row] = result;
  const { length } = row;
  return length;
}

function getUploadURL(id: string, secret: string): string {
  const { baseDomain, basePath } = getAndAssertCommAppURLFacts();
  return `${baseDomain}${basePath}upload/${id}/${secret}`;
}

function mediaFromRow(row: Object): Media {
  const uploadExtra = JSON.parse(row.uploadExtra);
  const { width, height, loop } = uploadExtra;

  const { uploadType: type, uploadSecret: secret } = row;
  const id = row.uploadID.toString();
  const dimensions = { width, height };
  const uri = getUploadURL(id, secret);
  if (type === 'photo') {
    return { id, type: 'photo', uri, dimensions };
  } else if (loop) {
    // $FlowFixMe add thumbnailID, thumbnailURI once they're in DB
    return { id, type: 'video', uri, dimensions, loop };
  } else {
    // $FlowFixMe add thumbnailID, thumbnailURI once they're in DB
    return { id, type: 'video', uri, dimensions };
  }
}

async function fetchMedia(
  viewer: Viewer,
  mediaIDs: $ReadOnlyArray<string>,
): Promise<$ReadOnlyArray<Media>> {
  const query = SQL`
    SELECT id AS uploadID, secret AS uploadSecret,
      type AS uploadType, extra AS uploadExtra
    FROM uploads
    WHERE id IN (${mediaIDs}) AND uploader = ${viewer.id} AND container IS NULL
  `;
  const [result] = await dbQuery(query);
  return result.map(mediaFromRow);
}

export {
  fetchUpload,
  fetchUploadChunk,
  getUploadSize,
  getUploadURL,
  mediaFromRow,
  fetchMedia,
};
