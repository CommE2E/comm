// @flow

import ip from 'internal-ip';
import _keyBy from 'lodash/fp/keyBy.js';

import type { Media } from 'lib/types/media-types.js';
import type { MediaMessageServerDBContent } from 'lib/types/messages/media.js';
import { getUploadIDsFromMediaMessageServerDBContents } from 'lib/types/messages/media.js';
import type {
  ThreadFetchMediaResult,
  ThreadFetchMediaRequest,
} from 'lib/types/thread-types.js';
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
  const uploadPath = `${basePath}upload/${id}/${secret}`;
  if (isDev) {
    const ipV4 = ip.v4.sync() || 'localhost';
    const port = parseInt(process.env.PORT, 10) || 3000;
    return `http://${ipV4}:${port}${uploadPath}`;
  }
  return `${baseDomain}${uploadPath}`;
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

async function fetchMediaForThread(
  request: ThreadFetchMediaRequest,
): Promise<ThreadFetchMediaResult> {
  // Fetch the uploads used for the uploadsMap containing the thread media
  const query = SQL`
    SELECT id AS uploadID, secret AS uploadSecret,
      type AS uploadType, extra AS uploadExtra
    FROM uploads
    WHERE thread = ${request.threadID}
    ORDER BY creation_time DESC
  `;
  const [uploads] = await dbQuery(query);

  // These are the paginated uploads that will be returned,
  // fetched as the user scrolls to the bottom of the media gallery
  const paginatedUploadsQuery = SQL`
    SELECT id AS uploadID, secret AS uploadSecret,
      type AS uploadType, extra AS uploadExtra,
      container
    FROM uploads
    WHERE thread = ${request.threadID}
    ORDER BY creation_time DESC
    LIMIT ${request.limit * 2} OFFSET ${request.offset}
  `;
  const [paginatedUploads] = await dbQuery(paginatedUploadsQuery);

  // If there are no uploads, return early with an empty array
  if (paginatedUploads.length === 0) {
    return {
      media: [],
      adjustedOffset: request.limit + request.offset,
    };
  }

  // Retrieve all of the containers for the uploads
  const uploadContainers = paginatedUploads.map(upload => upload.container);

  // Get the messages.content for each of the uploadContainers
  const messageQuery = SQL`
    SELECT content
    FROM messages
    WHERE id IN (${uploadContainers})
    ORDER BY time DESC
  `;
  const [uploadMessages] = await dbQuery(messageQuery);

  // Potential cases of uploadMessages (results may be grouped since
  // one upload container / message id may contain multiple media):
  // 1. Videos
  //   - { content: {"type":"video",
  //                 "uploadID":"107022",
  //                 "thumbnailUploadID":"107023"}
  //     }
  //   - For multiple videos, the content will be an array of the above
  // 2. Photos
  //   - { content: '[107071]' }
  //   - { content: '[107052,107051]' }
  // 4. Mix of videos and photos
  //   - { content: '[
  //                  {"type":"video",
  //                   "uploadID":"107022",
  //                   "thumbnailUploadID":"107023"},
  //                  {"type":"photo",
  //                   "uploadID":"107025"},
  //                  {"type":"photo",
  //                   "uploadID":"107024"}
  //                 ]'
  //     }

  const mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent> = uploadMessages
    .map(message => {
      const content = JSON.parse(message.content);
      return content.map(mediaMessageContent => {
        if (mediaMessageContent.type && mediaMessageContent.uploadID) {
          return mediaMessageContent;
        }
        return {
          type: 'photo',
          uploadID: mediaMessageContent,
        };
      });
    })
    .flat();

  // We fetched request.limit * 2 media to account for the worst case scenario
  // with `limit` videos, meaning `limit` thumbnails needed to be fetched
  // alongside. Now that we can guarentee that the first `limit` media will
  // definitely have thumbnails if they are videos, we can only process what
  // is necessary. We also need to filter out
  const adjustedMediaMessageContents = mediaMessageContents
    // Filter out any media that is already rendered on the client
    .filter(mediaMessageContent => {
      return !request.currentMediaIDs.some(currentMediaID => {
        return String(currentMediaID) === String(mediaMessageContent.uploadID);
      });
    })
    .slice(0, request.limit);

  const numVideos = adjustedMediaMessageContents.filter(mediaMessageContent => {
    return mediaMessageContent.type === 'video';
  }).length;

  // Since we may have fetched additional media (i.e. the adjacent thumbnails),
  // we should return to the client the appropriate offset to use for the next
  // request, so we don't return the same media twice.
  const adjustedOffset = request.offset + request.limit + numVideos;

  const media = await constructMediaFromMediaMessageContentsAndUploadRows(
    adjustedMediaMessageContents,
    uploads,
  );

  return { media, adjustedOffset };
}

async function fetchUploadsForMessage(
  viewer: Viewer,
  mediaMessageContents: $ReadOnlyArray<MediaMessageServerDBContent>,
): Promise<$ReadOnlyArray<Object>> {
  const uploadIDs = getUploadIDsFromMediaMessageServerDBContents(
    mediaMessageContents,
  );
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

    const primaryUploadSecret = primaryUpload.uploadSecret;
    const primaryUploadURI = getUploadURL(primaryUploadID, primaryUploadSecret);

    const uploadExtra = JSON.parse(primaryUpload.uploadExtra);
    const { width, height, loop } = uploadExtra;
    const dimensions = { width, height };

    if (mediaMessageContent.type === 'photo') {
      media.push({
        type: 'photo',
        id: primaryUploadID,
        uri: primaryUploadURI,
        dimensions,
      });
      continue;
    }

    const thumbnailUploadID = mediaMessageContent.thumbnailUploadID;
    const thumbnailUpload = uploadMap[thumbnailUploadID];

    const thumbnailUploadSecret = thumbnailUpload.uploadSecret;
    const thumbnailUploadURI = getUploadURL(
      thumbnailUploadID,
      thumbnailUploadSecret,
    );

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

  return media;
}

export {
  fetchUpload,
  fetchUploadChunk,
  getUploadSize,
  getUploadURL,
  mediaFromRow,
  fetchMedia,
  fetchMediaForThread,
  fetchMediaFromMediaMessageContent,
  constructMediaFromMediaMessageContentsAndUploadRows,
};
