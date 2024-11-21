// @flow

import invariant from 'invariant';
import * as React from 'react';
import uuid from 'uuid';

import { storeEstablishedHolderActionType } from './holder-actions.js';
import blobService from '../facts/blob-service.js';
import type { CallSingleKeyserverEndpoint } from '../keyserver-conn/call-single-keyserver-endpoint.js';
import {
  extractKeyserverIDFromID,
  extractKeyserverIDFromIDOptional,
} from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { type PerformHTTPMultipartUpload } from '../keyserver-conn/multipart-upload.js';
import { mediaConfig } from '../media/file-utils.js';
import { IdentityClientContext } from '../shared/identity-client-context.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';
import type { UploadMultimediaResult, Dimensions } from '../types/media-types';
import type { Dispatch } from '../types/redux-types.js';
import { toBase64URL } from '../utils/base64.js';
import {
  blobServiceUploadHandler,
  type BlobServiceUploadHandler,
} from '../utils/blob-service-upload.js';
import {
  makeBlobServiceEndpointURL,
  makeBlobServiceURI,
  generateBlobHolder,
  assignBlobHolder,
} from '../utils/blob-service.js';
import { getMessageForException } from '../utils/errors.js';
import { useDispatch } from '../utils/redux-utils.js';
import { createDefaultHTTPRequestHeaders } from '../utils/services-utils.js';

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

const deleteUpload =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: DeleteUploadInput) => Promise<void>) =>
  async input => {
    const { id, keyserverOrThreadID } = input;
    const keyserverID: string =
      extractKeyserverIDFromIDOptional(keyserverOrThreadID) ??
      keyserverOrThreadID;
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

const blobServiceUpload =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    dispatch: Dispatch,
    authMetadata: AuthMetadata,
  ): BlobServiceUploadAction =>
  async input => {
    const { uploadInput, callbacks, keyserverOrThreadID } = input;
    const { encryptionKey, loop, dimensions, thumbHash, blobInput } =
      uploadInput;
    const blobHash = toBase64URL(uploadInput.blobHash);
    const defaultHeaders = createDefaultHTTPRequestHeaders(authMetadata);

    let maybeKeyserverID;
    if (keyserverOrThreadID) {
      maybeKeyserverID =
        extractKeyserverIDFromIDOptional(keyserverOrThreadID) ??
        keyserverOrThreadID;
    }

    // don't prefix keyserver-owned holders with deviceID
    const holderPrefix = maybeKeyserverID ? null : authMetadata.deviceID;
    const blobHolder = generateBlobHolder(holderPrefix);

    // 1. Assign new holder for blob with given blobHash
    let blobAlreadyExists: boolean;
    try {
      const assignHolderResult = await assignBlobHolder(
        { blobHash, holder: blobHolder },
        defaultHeaders,
      );
      if (!assignHolderResult.success) {
        if (assignHolderResult.reason === 'INVALID_CSAT') {
          throw new Error('invalid_csat');
        }
        const { status, statusText } = assignHolderResult;
        throw new Error(`Server responded with HTTP ${status}: ${statusText}`);
      }
      const { data_exists: dataExistsResponse } =
        await assignHolderResult.response.json();
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
          authMetadata,
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

    // 3. Optionally upload metadata to keyserver
    const mimeType =
      blobInput.type === 'file' ? blobInput.file.type : blobInput.mimeType;

    if (!maybeKeyserverID) {
      dispatch({
        type: storeEstablishedHolderActionType,
        payload: {
          blobHash,
          holder: blobHolder,
        },
      });
      if (!dimensions) {
        throw new Error('dimensions are required for non-keyserver uploads');
      }

      const mediaType = mediaConfig[mimeType]?.mediaType;
      if (mediaType !== 'photo' && mediaType !== 'video') {
        throw new Error(`mediaType for ${mimeType} should be photo or video`);
      }
      return {
        id: uuid.v4(),
        uri: makeBlobServiceURI(blobHash),
        mediaType,
        dimensions,
        loop: loop ?? false,
        blobHolder,
      };
    }

    // for Flow
    const keyserverID: string = maybeKeyserverID;
    const requests = {
      [keyserverID]: {
        blobHash,
        blobHolder,
        encryptionKey,
        filename:
          blobInput.type === 'file' ? blobInput.file.name : blobInput.filename,
        mimeType,
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
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata } = identityContext;

  const dispatch = useDispatch();

  const blobUploadAction = React.useCallback(
    (
      callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
    ): BlobServiceUploadAction =>
      async input => {
        const authMetadata = await getAuthMetadata();
        const authenticatedUploadAction = blobServiceUpload(
          callSingleKeyserverEndpoint,
          dispatch,
          authMetadata,
        );
        return authenticatedUploadAction(input);
      },
    [dispatch, getAuthMetadata],
  );
  return useKeyserverCall(blobUploadAction);
}

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

const reassignThickThreadMediaForThinThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    authMetadata: AuthMetadata,
  ): MediaMetadataReassignmentAction =>
  async input => {
    const { mediaMetadataInput, keyserverOrThreadID } = input;
    const { encryptionKey, loop, dimensions, thumbHash, mimeType } =
      mediaMetadataInput;
    const blobHolder = generateBlobHolder();
    const blobHash = toBase64URL(mediaMetadataInput.blobHash);
    const defaultHeaders = createDefaultHTTPRequestHeaders(authMetadata);

    let filename = mediaMetadataInput.filename;
    if (!filename) {
      const basename = Math.random().toString(36).slice(-10);
      const extension = mediaConfig[mimeType]?.extension;
      filename = extension ? `${basename}.${extension}` : basename;
    }

    // 1. Assign new holder for blob with given blobHash
    try {
      const assignHolderResult = await assignBlobHolder(
        { blobHash, holder: blobHolder },
        defaultHeaders,
      );
      if (!assignHolderResult.success) {
        if (assignHolderResult.reason === 'INVALID_CSAT') {
          throw new Error('invalid_csat');
        }
        const { status, statusText } = assignHolderResult;
        throw new Error(`Server responded with HTTP ${status}: ${statusText}`);
      }
    } catch (e) {
      throw new Error(
        `Failed to assign holder: ${
          getMessageForException(e) ?? 'unknown error'
        }`,
      );
    }

    // 2. Upload media metadata to keyserver
    const keyserverID = extractKeyserverIDFromID(keyserverOrThreadID);
    const requests = {
      [keyserverID]: {
        blobHash,
        blobHolder,
        encryptionKey,
        filename,
        mimeType,
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
    };
  };

function useMediaMetadataReassignment(): MediaMetadataReassignmentAction {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata } = identityContext;

  const thickThreadMediaReassignmentAction = React.useCallback(
    (
      callSingleKeyserverEndpoint: CallSingleKeyserverEndpoint,
    ): MediaMetadataReassignmentAction =>
      async input => {
        const authMetadata = await getAuthMetadata();
        const authenticatedAction = reassignThickThreadMediaForThinThread(
          callSingleKeyserverEndpoint,
          authMetadata,
        );
        return authenticatedAction(input);
      },
    [getAuthMetadata],
  );
  return useKeyserverCall(thickThreadMediaReassignmentAction);
}

export {
  useBlobServiceUpload,
  useMediaMetadataReassignment,
  updateMultimediaMessageMediaActionType,
  useDeleteUpload,
};
