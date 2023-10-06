// @flow

import uuid from 'uuid';

import blobService from '../facts/blob-service.js';
import type { Shape } from '../types/core.js';
import type { UploadMultimediaResult, Dimensions } from '../types/media-types';
import { extractKeyserverIDFromID } from '../utils/action-utils.js';
import { toBase64URL } from '../utils/base64.js';
import {
  blobServiceUploadHandler,
  type BlobServiceUploadHandler,
} from '../utils/blob-service-upload.js';
import { makeBlobServiceEndpointURL } from '../utils/blob-service.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import { getMessageForException } from '../utils/errors.js';
import { useKeyserverCall } from '../utils/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../utils/keyserver-call.js';
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

export type DeleteUploadInput = {
  +id: string,
  +threadID: string,
};

const updateMultimediaMessageMediaActionType =
  'UPDATE_MULTIMEDIA_MESSAGE_MEDIA';

const deleteUpload =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: DeleteUploadInput) => Promise<void>) =>
  async input => {
    const { id, threadID } = input;
    const keyserverID = extractKeyserverIDFromID(threadID);
    const requests = { [keyserverID]: { id } };
    await callKeyserverEndpoint('delete_upload', requests);
  };

function useDeleteUpload(): (input: DeleteUploadInput) => Promise<void> {
  return useKeyserverCall(deleteUpload);
}

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

export type BlobServiceUploadAction = (input: {
  +uploadInput: BlobServiceUploadInput,
  +threadID: string,
  +callbacks?: MultimediaUploadCallbacks,
}) => Promise<{ ...UploadMultimediaResult, blobHolder: ?string }>;

const blobServiceUpload =
  (callKeyserverEndpoint: CallKeyserverEndpoint): BlobServiceUploadAction =>
  async input => {
    const { uploadInput, callbacks, threadID } = input;
    const { encryptionKey, loop, dimensions, thumbHash, blobInput } =
      uploadInput;
    const blobHolder = uuid.v4();
    const blobHash = toBase64URL(uploadInput.blobHash);

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
            blobInput,
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
    const keyserverID = extractKeyserverIDFromID(threadID);
    const requests = {
      [keyserverID]: {
        blobHash,
        blobHolder,
        encryptionKey,
        filename:
          blobInput.type === 'file' ? blobInput.file.name : blobInput.filename,
        mimeType:
          blobInput.type === 'file' ? blobInput.file.type : blobInput.mimeType,
        loop,
        thumbHash,
        ...dimensions,
      },
    };
    const responses = await callKeyserverEndpoint(
      'upload_media_metadata',
      requests,
    );
    const response = responses[keyserverID];

    return {
      id: response.id,
      uri: response.uri,
      mediaType: response.mediaType,
      dimensions: response.dimensions,
      loop: response.loop,
      blobHolder,
    };
  };

function useBlobServiceUpload(): BlobServiceUploadAction {
  return useKeyserverCall(blobServiceUpload);
}

export {
  uploadMultimedia,
  useBlobServiceUpload,
  updateMultimediaMessageMediaActionType,
  useDeleteUpload,
};
