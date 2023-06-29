// @flow

import invariant from 'invariant';

import {
  FUTURE_CODE_VERSION,
  hasMinCodeVersion,
} from '../shared/version-utils.js';
import type { PlatformDetails } from '../types/device-types.js';
import type {
  EncryptedImage,
  EncryptedVideo,
  Media,
} from '../types/media-types.js';
import type {
  MultimediaMessageInfo,
  RawMultimediaMessageInfo,
} from '../types/message-types.js';
import type { RawMediaMessageInfo } from '../types/messages/media.js';
import {
  isBlobServiceURI,
  getBlobFetchableURL,
  blobHashFromBlobServiceURI,
} from '../utils/blob-service.js';

const maxDimensions = Object.freeze({ width: 1920, height: 1920 });

function contentStringForMediaArray(media: $ReadOnlyArray<Media>): string {
  if (media.length === 0) {
    return 'corrupted media';
  } else if (media.length === 1) {
    const type = media[0].type.replace('encrypted_', '');
    return `a ${type}`;
  }
  let firstType;
  for (const single of media) {
    if (!firstType) {
      firstType = single.type;
    }
    if (firstType === single.type) {
      continue;
    } else {
      return 'some media';
    }
  }
  invariant(firstType, 'there should be some media');
  firstType = firstType.replace('encrypted_', '');
  if (firstType === 'photo') {
    firstType = 'image';
  }
  return `some ${firstType}s`;
}

function isMediaBlobServiceHosted(media: Media): boolean {
  return (
    (!!media.uri && isBlobServiceURI(media.uri)) ||
    (!!media.holder && isBlobServiceURI(media.holder)) ||
    (!!media.thumbnailURI && isBlobServiceURI(media.thumbnailURI)) ||
    (!!media.thumbnailHolder && isBlobServiceURI(media.thumbnailHolder)) ||
    (!!media.blobURI && isBlobServiceURI(media.blobURI)) ||
    (!!media.thumbnailBlobURI && isBlobServiceURI(media.thumbnailBlobURI))
  );
}

/** Clients before FUTURE_CODE_VERSION understand only `holder`
 * and `thumbnailHolder` fields, while newer clients understand `blobURI`
 * and `thumbnailBlobURI`. This function formats the multimedia message
 * to be understandable by clients based on their version
 */
function versionSpecificMediaMessageFormat(
  rawMessageInfo: RawMediaMessageInfo,
  platformDetails: ?PlatformDetails,
): RawMediaMessageInfo {
  const isBlobURISupported = hasMinCodeVersion(platformDetails, {
    native: FUTURE_CODE_VERSION,
  });
  const media = rawMessageInfo.media.map(singleMedia => {
    if (singleMedia.type === 'photo' || singleMedia.type === 'video') {
      return singleMedia;
    }

    if (singleMedia.type === 'encrypted_photo') {
      const { blobURI, holder, ...photoMedia } = singleMedia;
      const mediaURI = encryptedMediaBlobURI(singleMedia);
      return isBlobURISupported
        ? { ...photoMedia, blobURI: mediaURI }
        : { ...photoMedia, holder: mediaURI };
    }

    // encrypted_video
    const {
      blobURI,
      holder,
      thumbnailBlobURI,
      thumbnailHolder,
      ...videoMedia
    } = singleMedia;
    const mediaURI = encryptedMediaBlobURI(singleMedia);
    const thumbnailURI = encryptedVideoThumbnailBlobURI(singleMedia);

    return isBlobURISupported
      ? { ...videoMedia, blobURI: mediaURI, thumbnailBlobURI: thumbnailURI }
      : { ...videoMedia, holder: mediaURI, thumbnailHolder: thumbnailURI };
  });

  return {
    ...rawMessageInfo,
    media,
  };
}

function fetchableMediaURI(uri: string): string {
  if (isBlobServiceURI(uri)) {
    const blobHash = blobHashFromBlobServiceURI(uri);
    return getBlobFetchableURL(blobHash);
  }

  return uri;
}

function multimediaMessagePreview(
  messageInfo: MultimediaMessageInfo | RawMultimediaMessageInfo,
): string {
  const mediaContentString = contentStringForMediaArray(messageInfo.media);
  return `sent ${mediaContentString}`;
}

const localUploadPrefix = 'localUpload';

function isLocalUploadID(id: string): boolean {
  return id.startsWith(localUploadPrefix);
}

let nextLocalUploadID = 0;
function getNextLocalUploadID(): string {
  return `${localUploadPrefix}${nextLocalUploadID++}`;
}

/**
 * Returns effective multimedia blob URI for encrypted image or video
 */
function encryptedMediaBlobURI(media: EncryptedImage | EncryptedVideo): string {
  const uri = media.blobURI ?? media.holder;
  invariant(uri, 'encrypted media has no blob URI');
  return uri;
}

/**
 * Returns effective thumbnail blob URI for encrypted video
 */
function encryptedVideoThumbnailBlobURI(media: EncryptedVideo): string {
  const uri = media.thumbnailBlobURI ?? media.thumbnailHolder;
  invariant(uri, 'encrypted thumbnail has no blob URI');
  return uri;
}

export {
  maxDimensions,
  contentStringForMediaArray,
  multimediaMessagePreview,
  isLocalUploadID,
  isMediaBlobServiceHosted,
  versionSpecificMediaMessageFormat,
  getNextLocalUploadID,
  fetchableMediaURI,
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
};
