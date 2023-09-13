// @flow

import * as uuid from 'uuid';

import blobService from '../facts/blob-service.js';
import type { Shape } from '../types/core.js';
import type {
  UploadMediaMetadataRequest,
  UploadMultimediaResult,
  Dimensions,
} from '../types/media-types';
import { toBase64URL } from '../utils/base64.js';
import {
  blobServiceUploadHandler,
  type BlobServiceUploadHandler,
} from '../utils/blob-service-upload.js';
import { makeBlobServiceEndpointURL } from '../utils/blob-service.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import { getMessageForException } from '../utils/errors.js';
import { handleHTTPResponseError } from '../utils/services-utils.js';
import { type UploadBlob } from '../utils/upload-blob.js';

export type MultimediaUploadCallbacks = Shape<{
  onProgress: (percent: number) => void,
  abortHandler: (abort: () => void) => void,
  uploadBlob: UploadBlob,
  blobServiceUploadHandler: BlobServiceUploadHandler,
  timeout: ?number,
}>;
export type MultimediaUploadExtras = Shape<{
  ...Dimensions,
  loop: boolean,
  encryptionKey: string,
  thumbHash: ?string,
}>;

const uploadMediaMetadata =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((input: UploadMediaMetadataRequest) => Promise<UploadMultimediaResult>) =>
  async input => {
    const response = await callServerEndpoint('upload_media_metadata', input);
    return {
      id: response.id,
      uri: response.uri,
      mediaType: response.mediaType,
      dimensions: response.dimensions,
      loop: response.loop,
    };
  };

const uploadMultimedia =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    multimedia: Object,
    extras: MultimediaUploadExtras,
    callbacks?: MultimediaUploadCallbacks,
  ) => Promise<UploadMultimediaResult>) =>
  async (multimedia, extras, callbacks) => {
    const onProgress = callbacks && callbacks.onProgress;
    const abortHandler = callbacks && callbacks.abortHandler;
    const uploadBlob = callbacks && callbacks.uploadBlob;

    const stringExtras = {};
    if (extras.height !== null && extras.height !== undefined) {
      stringExtras.height = extras.height.toString();
    }
    if (extras.width !== null && extras.width !== undefined) {
      stringExtras.width = extras.width.toString();
    }
    if (extras.loop) {
      stringExtras.loop = '1';
    }
    if (extras.encryptionKey) {
      stringExtras.encryptionKey = extras.encryptionKey;
    }
    if (extras.thumbHash) {
      stringExtras.thumbHash = extras.thumbHash;
    }

    // also pass MIME type if available
    if (multimedia.type && typeof multimedia.type === 'string') {
      stringExtras.mimeType = multimedia.type;
    }

    const response = await callServerEndpoint(
      'upload_multimedia',
      {
        multimedia: [multimedia],
        ...stringExtras,
      },
      {
        onProgress,
        abortHandler,
        blobUpload: uploadBlob ? uploadBlob : true,
      },
    );
    const [uploadResult] = response.results;
    return {
      id: uploadResult.id,
      uri: uploadResult.uri,
      dimensions: uploadResult.dimensions,
      mediaType: uploadResult.mediaType,
      loop: uploadResult.loop,
    };
  };

const updateMultimediaMessageMediaActionType =
  'UPDATE_MULTIMEDIA_MESSAGE_MEDIA';

const deleteUpload =
  (callServerEndpoint: CallServerEndpoint): ((id: string) => Promise<void>) =>
  async id => {
    await callServerEndpoint('delete_upload', { id });
  };

export type BlobServiceUploadFile =
  | { +type: 'file', +file: File }
  | {
      +type: 'uri',
      +uri: string,
      +filename: string,
      +mimeType: string,
    };

export type BlobServiceUploadInput = {
  +blobData: BlobServiceUploadFile,
  +blobHash: string,
  +encryptionKey: string,
  +dimensions: ?Dimensions,
  +thumbHash?: ?string,
  +loop?: boolean,
};

export type BlobServiceUploadAction = (args: {
  +input: BlobServiceUploadInput,
  +callbacks?: MultimediaUploadCallbacks,
}) => Promise<{ ...UploadMultimediaResult, blobHolder: ?string }>;

const blobServiceUpload =
  (callServerEndpoint: CallServerEndpoint): BlobServiceUploadAction =>
  async args => {
    const { input, callbacks } = args;
    const { encryptionKey, loop, dimensions, thumbHash, blobData } = input;
    const blobHolder = uuid.v4();
    const blobHash = toBase64URL(input.blobHash);

    // 1. Assign new holder for blob with given blobHash
    let blobAlreadyExists: boolean;
    try {
      const assignHolderEndpoint = blobService.httpEndpoints.ASSIGN_HOLDER;
      const assignHolderResponse = await fetch(
        makeBlobServiceEndpointURL(assignHolderEndpoint),
        {
          method: assignHolderEndpoint.method,
          body: JSON.stringify({
            holder: blobHolder,
            blob_hash: blobHash,
          }),
          headers: {
            'content-type': 'application/json',
          },
        },
      );
      handleHTTPResponseError(assignHolderResponse);
      const { data_exists: dataExistsResponse } =
        await assignHolderResponse.json();
      blobAlreadyExists = dataExistsResponse;
    } catch (e) {
      throw new Error(
        `Failed to assign holder: ${
          getMessageForException(e) ?? 'unknown error'
        }`,
      );
    }

    // 2. Upload blob contents if blob doesn't exist
    if (!blobAlreadyExists) {
      const uploadEndpoint = blobService.httpEndpoints.UPLOAD_BLOB;
      let blobServiceUploadCallback = blobServiceUploadHandler;
      if (callbacks && callbacks.blobServiceUploadHandler) {
        blobServiceUploadCallback = callbacks.blobServiceUploadHandler;
      }
      try {
        await blobServiceUploadCallback(
          makeBlobServiceEndpointURL(uploadEndpoint),
          uploadEndpoint.method,
          {
            blobHash,
            blobData,
          },
          { ...callbacks },
        );
      } catch (e) {
        throw new Error(
          `Failed to upload blob: ${
            getMessageForException(e) ?? 'unknown error'
          }`,
        );
      }
    }

    // 3. Upload metadata to keyserver
    const response = await callServerEndpoint('upload_media_metadata', {
      blobHash,
      blobHolder,
      encryptionKey,
      filename:
        blobData.type === 'file' ? blobData.file.name : blobData.filename,
      mimeType:
        blobData.type === 'file' ? blobData.file.type : blobData.mimeType,
      loop,
      thumbHash,
      ...dimensions,
    });

    return {
      id: response.id,
      uri: response.uri,
      mediaType: response.mediaType,
      dimensions: response.dimensions,
      loop: response.loop,
      blobHolder,
    };
  };

export {
  uploadMultimedia,
  blobServiceUpload,
  uploadMediaMetadata,
  updateMultimediaMessageMediaActionType,
  deleteUpload,
};
