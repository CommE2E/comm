// @flow

import { type PerformHTTPMultipartUpload } from '../keyserver-conn/multipart-upload.js';
import type { Dimensions, UploadMultimediaResult } from '../types/media-types';
import {
  type BlobServiceUploadHandler,
  type PlaintextMediaUploadHandler,
} from '../utils/blob-service-upload.js';

export type MultimediaUploadCallbacks = Partial<{
  +onProgress: (percent: number) => void,
  +abortHandler: (abort: () => void) => void,
  +performHTTPMultipartUpload: PerformHTTPMultipartUpload,
  +blobServiceUploadHandler: BlobServiceUploadHandler,
  +plaintextMediaUploadHandler: PlaintextMediaUploadHandler,
  +timeout: ?number,
}>;

export type DeleteUploadInput = {
  +id: string,
  +keyserverOrThreadIDForMetadata: string,
};

const updateMultimediaMessageMediaActionType =
  'UPDATE_MULTIMEDIA_MESSAGE_MEDIA' as const;

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
  +keyserverOrThreadIDForMetadata: ?string,
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
  +keyserverOrThreadIDForMetadata: string,
}) => Promise<UploadMultimediaResult>;

export type PlaintextMediaUploadInput = {
  +uploadInput: BlobServiceUploadFile,
  +dimensions: ?Dimensions,
  +loop?: boolean,
  +thumbHash?: ?string,
};

export type PlaintextMediaUploadAction = (input: {
  +mediaInput: PlaintextMediaUploadInput,
  +callbacks?: MultimediaUploadCallbacks,
}) => Promise<UploadMultimediaResult>;

export { updateMultimediaMessageMediaActionType };
