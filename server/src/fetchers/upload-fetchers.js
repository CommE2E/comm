// @flow

import type { Viewer } from '../session/viewer';
import type { Media } from 'lib/types/media-types';

import { dbQuery, SQL } from '../database';
import { ServerError } from 'lib/utils/errors';
import urlFacts from '../../facts/url';

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
  const [ result ] = await dbQuery(query);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const [ row ] = result;
  const { content, mime } = row;
  return { content, mime };
}

function getUploadURL(id: string, secret: string) {
  return `${baseDomain}${basePath}upload/${id}/${secret}`;
}

async function fetchMedia(
  viewer: Viewer,
  mediaIDs: $ReadOnlyArray<string>,
): Promise<$ReadOnlyArray<Media>> {
  const query = SQL`
    SELECT id, secret, type
    FROM uploads
    WHERE id IN (${mediaIDs}) AND uploader = ${viewer.id} AND container IS NULL
  `;
  const [ result ] = await dbQuery(query);
  return result.map(row => {
    const id = row.id.toString();
    return {
      id,
      uri: getUploadURL(id, row.secret),
      type: row.type,
    };
  });
}

export {
  fetchUpload,
  getUploadURL,
  fetchMedia,
};
