// @flow

import { type PerformHTTPMultipartUpload } from '../keyserver-conn/multipart-upload.js';
import type { Dimensions, UploadMultimediaResult } from '../types/media-types';
import { type BlobServiceUploadHandler } from '../utils/blob-service-upload.js';

export type MultimediaUploadCallbacks = Partial<{
  +onProgress: (percent: number) => void,
  +abortHandler: (abort: () => void) => void,
  +performHTTPMultipartUpload: PerformHTTPMultipartUpload,
  +blobServiceUploadHandler: BlobServiceUploadHandler,
  +timeout: ?number,
}>;

export type DeleteUploadInput = {
  +id: string,
  +keyserverOrThreadID: string,
};

const updateMultimediaMessageMediaActionType =
  'UPDATE_MULTIMEDIA_MESSAGE_MEDIA';

export type BlobServiceUploadFile =
  | { +type: 'file', +file: File }
  | {
      +type: 'uri',
      +uri: string,
      +filename: string,
      +mimeType: string,
    };

export type BlobServiceUploadInput = {
  +blobInput: BlobServiceUploadFile,
  +blobHash: string,
  +encryptionKey: string,
  +dimensions: ?Dimensions,
  +thumbHash?: ?string,
  +loop?: boolean,
};

export type BlobServiceUploadResult = $ReadOnly<{
  ...UploadMultimediaResult,
  +blobHolder: string,
}>;

export type BlobServiceUploadAction = (input: {
  +uploadInput: BlobServiceUploadInput,
  // use `null` to skip metadata upload to keyserver
  +keyserverOrThreadID: ?string,
  +callbacks?: MultimediaUploadCallbacks,
}) => Promise<BlobServiceUploadResult>;

export type ThickThreadMediaMetadataInput = {
  +blobHash: string,
  +encryptionKey: string,
  +mimeType: string,
  +dimensions: ?Dimensions,
  +filename?: ?string,
  +thumbHash?: ?string,
  +loop?: boolean,
};

export type MediaMetadataReassignmentAction = (input: {
  +mediaMetadataInput: ThickThreadMediaMetadataInput,
  +keyserverOrThreadID: string,
}) => Promise<UploadMultimediaResult>;

export { updateMultimediaMessageMediaActionType };
