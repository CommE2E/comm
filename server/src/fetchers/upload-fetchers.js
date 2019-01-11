// @flow

import type { Viewer } from '../session/viewer';

import { dbQuery, SQL } from '../database';
import { ServerError } from 'lib/utils/errors';

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

export {
  fetchUpload,
};
