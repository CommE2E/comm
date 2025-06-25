// @flow

import crypto from 'crypto';
import invariant from 'invariant';

import type {
  MediaType,
  UploadMultimediaResult,
  Dimensions,
} from 'lib/types/media-types.js';
import { ServerError } from 'lib/utils/errors.js';

import createIDs from './id-creator.js';
import { dbQuery, SQL } from '../database/database.js';
import { makeUploadURI } from '../fetchers/upload-fetchers.js';
import type { Viewer } from '../session/viewer.js';

type UploadContent =
  | {
      +storage: 'keyserver',
      +buffer: Buffer,
    }
  | {
      +storage: 'blob_service',
      +blobHolder: string,
      +blobHash: string,
    };

export type UploadInput = {
  +name: string,
  +mime: string,
  +mediaType: MediaType,
  +content: UploadContent,
  +dimensions: Dimensions,
  +loop: boolean,
  +encryptionKey?: string,
  +thumbHash?: string,
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
    invariant(id !== undefined, 'no role id created');
    const secret = crypto.randomBytes(8).toString('hex');
    const { content, dimensions, mediaType, loop, encryptionKey, thumbHash } =
      uploadInfo;
    const buffer =
      content.storage === 'keyserver' ? content.buffer : Buffer.alloc(0);
    const blobHolder =
      content.storage === 'blob_service' ? content.blobHolder : undefined;
    const blobHash =
      content.storage === 'blob_service' ? content.blobHash : undefined;
    if ((blobHolder && !blobHash) || (!blobHolder && blobHash)) {
      throw new ServerError('invalid_parameters');
    }
    const uri = makeUploadURI(blobHash, id, secret);

    return {
      uploadResult: {
        id,
        uri,
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
        buffer,
        secret,
        Date.now(),
        JSON.stringify({
          ...dimensions,
          loop,
          blobHolder,
          blobHash,
          encryptionKey,
          thumbHash,
        }),
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
