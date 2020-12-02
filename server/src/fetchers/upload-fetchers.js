// @flow

import type { Media } from 'lib/types/media-types';
import { ServerError } from 'lib/utils/errors';

import urlFacts from '../../facts/url';
import { dbQuery, SQL } from '../database/database';
import type { Viewer } from '../session/viewer';

const { baseDomain, basePath } = urlFacts;

type UploadInfo = {|
  content: Buffer,
  mime: string,
|};
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

function getUploadURL(id: string, secret: string) {
  return `${baseDomain}${basePath}upload/${id}/${secret}`;
}

function mediaFromRow(row: Object): Media {
  const { uploadType: type, uploadSecret: secret } = row;
  const { width, height, loop } = row.uploadExtra;
  const id = row.uploadID.toString();
  const dimensions = { width, height };
  const uri = getUploadURL(id, secret);
  if (type === 'photo') {
    return { id, type: 'photo', uri, dimensions };
  } else if (loop) {
    return { id, type: 'video', uri, dimensions, loop };
  } else {
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

export { fetchUpload, getUploadURL, mediaFromRow, fetchMedia };
