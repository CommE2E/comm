// @flow

import ip from 'internal-ip';
import _keyBy from 'lodash/fp/keyBy.js';

import type { Media, Image, EncryptedImage } from 'lib/types/media-types.js';
import { messageTypes } from 'lib/types/message-types.js';
import type { MediaMessageServerDBContent } from 'lib/types/messages/media.js';
import { getUploadIDsFromMediaMessageServerDBContents } from 'lib/types/messages/media.js';
import { threadPermissions } from 'lib/types/thread-types.js';
import type {
  ThreadFetchMediaResult,
  ThreadFetchMediaRequest,
} from 'lib/types/thread-types.js';
import { makeBlobServiceURI } from 'lib/utils/blob-service.js';
import { isDev } from 'lib/utils/dev-utils.js';
import { ServerError } from 'lib/utils/errors.js';

import { dbQuery, SQL } from '../database/database.js';
import type { Viewer } from '../session/viewer.js';
import { getAndAssertCommAppURLFacts } from '../utils/urls.js';

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
    SELECT content, mime, extra
    FROM uploads
    WHERE id = ${id} AND secret = ${secret}
  `;
  const [result] = await dbQuery(query);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const [row] = result;
  const { content, mime, extra } = row;
  const { blobHolder } = JSON.parse(extra);
  if (blobHolder) {
    throw new ServerError('resource_unavailable');
  }
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
    SELECT SUBSTRING(content, ${pos + 1}, ${len}) AS content, mime, extra
    FROM uploads
    WHERE id = ${id} AND secret = ${secret}
  `;
  const [result] = await dbQuery(query);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }
  const [row] = result;
  const { content, mime, extra } = row;
  const { blobHolder } = JSON.parse(extra);
  if (blobHolder) {
    throw new ServerError('resource_unavailable');
  }
  return {
    content,
    mime,
  };
}

// Returns total size in bytes.
async function getUploadSize(id: string, secret: string): Promise<number> {
  const query = SQL`
    SELECT LENGTH(content) AS length, extra
    FROM uploads
    WHERE id = ${id} AND secret = ${secret}
  `;
  const [result] = await dbQuery(query);

  if (result.length === 0) {
    throw new ServerError('invalid_parameters');
  }

  const [row] = result;
  const { length, extra } = row;
  const { blobHolder } = JSON.parse(extra);
  if (blobHolder) {
    throw new ServerError('resource_unavailable');
  }
  return length;
}

function getUploadURL(id: string, secret: string): string {
  const { baseDomain, basePath } = getAndAssertCommAppURLFacts();
  const uploadPath = `${basePath}upload/${id}/${secret}`;
  if (isDev) {
    const ipV4 = ip.v4.sync() || 'localhost';
    const port = parseInt(process.env.PORT, 10) || 3000;
    return `http://${ipV4}:${port}${uploadPath}`;
  }
  return `${baseDomain}${uploadPath}`;
}

function makeURI(holder: ?string, id: string, secret: string): string {
  if (holder) {
    return makeBlobServiceURI(holder);
  }
  return getUploadURL(id, secret);
}

function imagesFromRow(row: Object): Image | EncryptedImage {
  const uploadExtra = JSON.parse(row.uploadExtra);
  const { width, height, blobHolder } = uploadExtra;

  const { uploadType: type, uploadSecret: secret } = row;
  const id = row.uploadID.toString();
  const dimensions = { width, height };
  const uri = makeURI(blobHolder, id, secret);
  const isEncrypted = !!uploadExtra.encryptionKey;
  if (type !== 'photo') {
    throw new ServerError('invalid_parameters');
  }
  if (!isEncrypted) {
    return { id, type: 'photo', uri, dimensions };
  }
  return {
    id,
    type: 'encrypted_photo',
    holder: uri,
    dimensions,
    encryptionKey: uploadExtra.encryptionKey,
  };
}

async function fetchImages(
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
  return result.map(imagesFromRow);
}

async function fetchMediaForThread(
  viewer: Viewer,
  request: ThreadFetchMediaRequest,
): Promise<ThreadFetchMediaResult> {
  const visibleExtractString = `$.${threadPermissions.VISIBLE}.value`;
  const query = SQL`
    SELECT content.photo AS uploadID,
      u.secret AS uploadSecret,
      u.type AS uploadType, u.extra AS uploadExtra,
      u.container, u.creation_time,
      NULL AS thumbnailID,
      NULL AS thumbnailUploadSecret,
      NULL AS thumbnailUploadExtra
    FROM messages m
    LEFT JOIN JSON_TABLE(
      m.content,
      "$[*]" COLUMNS(photo INT PATH "$")
    ) content ON 1
    LEFT JOIN uploads u ON u.id = content.photo
    LEFT JOIN memberships mm ON mm.thread = ${request.threadID} 
      AND mm.user = ${viewer.id}
    WHERE m.thread = ${request.threadID} AND m.type = ${messageTypes.IMAGES}
      AND JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE
    UNION SELECT content.media AS uploadID,
      uv.secret AS uploadSecret,
      uv.type AS uploadType, uv.extra AS uploadExtra,
      uv.container, uv.creation_time,
      content.thumbnail AS thumbnailID,
      ut.secret AS thumbnailUploadSecret,
      ut.extra AS thumbnailUploadExtra
    FROM messages m
    LEFT JOIN JSON_TABLE(
      m.content,
      "$[*]" COLUMNS(
        media INT PATH "$.uploadID",
        thumbnail INT PATH "$.thumbnailUploadID"
      )
    ) content ON 1
    LEFT JOIN uploads uv ON uv.id = content.media
    LEFT JOIN uploads ut ON ut.id = content.thumbnail
    LEFT JOIN memberships mm ON mm.thread = ${request.threadID} 
      AND mm.user = ${viewer.id}
    WHERE m.thread = ${request.threadID} 
      AND m.type = ${messageTypes.MULTIMEDIA}
      AND JSON_EXTRACT(mm.permissions, ${visibleExtractString}) IS TRUE
    ORDER BY creation_time DESC
    LIMIT ${request.limit} OFFSET ${request.offset}
  `;

  const [uploads] = await dbQuery(query);

  const media = uploads.map(upload => {
    const { uploadID, uploadType, uploadSecret, uploadExtra } = upload;
    const { width, height, encryptionKey, blobHolder } =
      JSON.parse(uploadExtra);
    const dimensions = { width, height };
    const uri = makeURI(blobHolder, uploadID, uploadSecret);

    if (uploadType === 'photo') {
      if (encryptionKey) {
        return {
          type: 'encrypted_photo',
          id: uploadID,
          holder: uri,
          encryptionKey,
          dimensions,
        };
      }
      return {
        type: 'photo',
        id: uploadID,
        uri,
        dimensions,
      };
    }

    const { thumbnailID, thumbnailUploadSecret, thumbnailUploadExtra } = upload;
    const {
      encryptionKey: thumbnailEncryptionKey,
      blobHolder: thumbnailBlobHolder,
    } = JSON.parse(thumbnailUploadExtra);
    const thumbnailURI = makeURI(
      thumbnailBlobHolder,
      thumbnailID,
      thumbnailUploadSecret,
    );

    if (encryptionKey) {
      return {
        type: 'encrypted_video',
        id: uploadID,
        holder: uri,
        encryptionKey,
        dimensions,
        thumbnailID,
        thumbnailHolder: thumbnailURI,
        thumbnailEncryptionKey,
      };
    }

    return {
      type: 'video',
      id: uploadID,
      uri,
      dimensions,
      thumbnailID,
      thumbnailURI,
    };
  });

  return { media };
}

async function fetchUploadsForMessage(
  viewer: Viewer,
  mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
): Promise<$ReadOnlyArray<Object>> {
  const uploadIDs =
    getUploadIDsFromMediaMessageServerDBContents(mediaMessageContents);
  const query = SQL`
    SELECT id AS uploadID, secret AS uploadSecret,
      type AS uploadType, extra AS uploadExtra
    FROM uploads
    WHERE id IN (${uploadIDs}) AND uploader = ${viewer.id} AND container IS NULL
  `;

  const [uploads] = await dbQuery(query);
  return uploads;
}

async function fetchMediaFromMediaMessageContent(
  viewer: Viewer,
  mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
): Promise<$ReadOnlyArray<Media>> {
  const uploads = await fetchUploadsForMessage(viewer, mediaMessageContents);

  return constructMediaFromMediaMessageContentsAndUploadRows(
    mediaMessageContents,
    uploads,
  );
}

function constructMediaFromMediaMessageContentsAndUploadRows(
  mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
  uploadRows: $ReadOnlyArray<Object>,
): $ReadOnlyArray<Media> {
  const uploadMap = _keyBy('uploadID')(uploadRows);

  const media: Media[] = [];
  for (const mediaMessageContent of mediaMessageContents) {
    const primaryUploadID = mediaMessageContent.uploadID;
    const primaryUpload = uploadMap[primaryUploadID];

    const uploadExtra = JSON.parse(primaryUpload.uploadExtra);
    const { width, height, loop, blobHolder, encryptionKey } = uploadExtra;
    const dimensions = { width, height };

    const primaryUploadURI = makeURI(
      blobHolder,
      primaryUploadID,
      primaryUpload.uploadSecret,
    );

    if (mediaMessageContent.type === 'photo') {
      if (encryptionKey) {
        media.push({
          type: 'encrypted_photo',
          id: primaryUploadID,
          holder: primaryUploadURI,
          encryptionKey,
          dimensions,
        });
      } else {
        media.push({
          type: 'photo',
          id: primaryUploadID,
          uri: primaryUploadURI,
          dimensions,
        });
      }
      continue;
    }

    const thumbnailUploadID = mediaMessageContent.thumbnailUploadID;
    const thumbnailUpload = uploadMap[thumbnailUploadID];

    const thumbnailUploadExtra = JSON.parse(thumbnailUpload.uploadExtra);
    const { blobHolder: thumbnailBlobHolder } = thumbnailUploadExtra;
    const thumbnailUploadURI = makeURI(
      thumbnailBlobHolder,
      thumbnailUploadID,
      thumbnailUpload.uploadSecret,
    );

    if (encryptionKey) {
      const video = {
        type: 'encrypted_video',
        id: primaryUploadID,
        holder: primaryUploadURI,
        encryptionKey,
        dimensions,
        thumbnailID: thumbnailUploadID,
        thumbnailHolder: thumbnailUploadURI,
        thumbnailEncryptionKey: thumbnailUploadExtra.encryptionKey,
      };
      media.push(loop ? { ...video, loop } : video);
    } else {
      const video = {
        type: 'video',
        id: primaryUploadID,
        uri: primaryUploadURI,
        dimensions,
        thumbnailID: thumbnailUploadID,
        thumbnailURI: thumbnailUploadURI,
      };
      media.push(loop ? { ...video, loop } : video);
    }
  }

  return media;
}

export {
  fetchUpload,
  fetchUploadChunk,
  getUploadSize,
  getUploadURL,
  imagesFromRow,
  fetchImages,
  fetchMediaForThread,
  fetchMediaFromMediaMessageContent,
  constructMediaFromMediaMessageContentsAndUploadRows,
};
