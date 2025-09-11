// @flow

import invariant from 'invariant';
import React from 'react';
import uuid from 'uuid';

import { storeEstablishedHolderActionType } from '../actions/holder-actions.js';
import type {
  BlobServiceUploadAction,
  DeleteUploadInput,
  MediaMetadataReassignmentAction,
  FarcasterMediaUploadAction,
} from '../actions/upload-actions.js';
import blobService from '../facts/blob-service.js';
import type { CallSingleKeyserverEndpoint } from '../keyserver-conn/call-single-keyserver-endpoint.js';
import {
  extractKeyserverIDFromID,
  extractKeyserverIDFromIDOptional,
} from '../keyserver-conn/keyserver-call-utils.js';
import { useKeyserverCall } from '../keyserver-conn/keyserver-call.js';
import type { CallKeyserverEndpoint } from '../keyserver-conn/keyserver-conn-types.js';
import { mediaConfig } from '../media/file-utils.js';
import {
  type AuthMetadata,
  IdentityClientContext,
} from '../shared/identity-client-context.js';
import type { UploadMultimediaResult } from '../types/media-types.js';
import type { Dispatch } from '../types/redux-types.js';
import { toBase64URL } from '../utils/base64.js';
import {
  blobServiceUploadHandler,
  farcasterMediaUploadHandler,
} from '../utils/blob-service-upload.js';
import {
  assignBlobHolder,
  generateBlobHolder,
  makeBlobServiceEndpointURL,
  makeFarcasterBlobMediaURI,
  makeBlobServiceURI,
} from '../utils/blob-service.js';
import { getMessageForException } from '../utils/errors.js';
import { useDispatch } from '../utils/redux-utils.js';
import {
  createDefaultHTTPRequestHeaders,
  errorMessageIsInvalidCSAT,
} from '../utils/services-utils.js';

const deleteUpload =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
  ): ((input: DeleteUploadInput) => Promise<void>) =>
  async input => {
    const { id, keyserverOrThreadIDForMetadata } = input;
    const keyserverID: string =
      extractKeyserverIDFromIDOptional(keyserverOrThreadIDForMetadata) ??
      keyserverOrThreadIDForMetadata;
    const requests = { [keyserverID]: { id } };
    await callKeyserverEndpoint('delete_upload', requests);
  };

function useDeleteUpload(): (input: DeleteUploadInput) => Promise<void> {
  return useKeyserverCall(deleteUpload);
}

const blobServiceUpload =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    dispatch: Dispatch,
    authMetadata: AuthMetadata,
  ): BlobServiceUploadAction =>
  async input => {
    const { uploadInput, callbacks, keyserverOrThreadIDForMetadata } = input;
    const { encryptionKey, loop, dimensions, thumbHash, blobInput } =
      uploadInput;
    const blobHash = toBase64URL(uploadInput.blobHash);
    const defaultHeaders = createDefaultHTTPRequestHeaders(authMetadata);

    let maybeKeyserverID;
    if (keyserverOrThreadIDForMetadata) {
      maybeKeyserverID =
        extractKeyserverIDFromIDOptional(keyserverOrThreadIDForMetadata) ??
        keyserverOrThreadIDForMetadata;
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
      if (errorMessageIsInvalidCSAT(e)) {
        throw e;
      }
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
        if (errorMessageIsInvalidCSAT(e)) {
          throw e;
        }
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

function useFarcasterMediaUpload(): FarcasterMediaUploadAction {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata } = identityContext;

  return React.useCallback(
    async (input): Promise<UploadMultimediaResult> => {
      const { mediaInput, callbacks } = input;
      const { uploadInput, dimensions, thumbHash, loop } = mediaInput;

      const authMetadata = await getAuthMetadata();
      const uploadEndpoint = blobService.httpEndpoints.UPLOAD_MEDIA;

      let mediaUploadCallback = farcasterMediaUploadHandler;
      if (callbacks && callbacks.farcasterMediaUploadHandler) {
        mediaUploadCallback = callbacks.farcasterMediaUploadHandler;
      }

      try {
        const customMetadata = JSON.stringify({
          dimensions,
          thumbHash,
          loop,
        });
        const response = await mediaUploadCallback(
          makeBlobServiceEndpointURL(uploadEndpoint),
          uploadInput,
          authMetadata,
          customMetadata,
          { ...callbacks },
        );

        const mimeType =
          uploadInput.type === 'file'
            ? uploadInput.file.type
            : uploadInput.mimeType;
        const mediaType =
          mediaConfig[response.contentType ?? mimeType]?.mediaType;
        if (mediaType !== 'photo' && mediaType !== 'video') {
          throw new Error(
            `mediaType for ${mediaType} should be photo or video`,
          );
        }

        if (!dimensions) {
          throw new Error('dimensions are required for farcaster uploads');
        }
        return {
          id: response.mediaID,
          uri: makeFarcasterBlobMediaURI(response.mediaID, { thumbHash }),
          mediaType,
          dimensions,
          loop: loop ?? false,
        };
      } catch (e) {
        if (errorMessageIsInvalidCSAT(e)) {
          throw e;
        }
        throw new Error(
          `Failed to upload Farcaster media: ${
            getMessageForException(e) ?? 'unknown error'
          }`,
        );
      }
    },
    [getAuthMetadata],
  );
}

const reassignThickThreadMediaForThinThread =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    authMetadata: AuthMetadata,
  ): MediaMetadataReassignmentAction =>
  async input => {
    const { mediaMetadataInput, keyserverOrThreadIDForMetadata } = input;
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
      if (errorMessageIsInvalidCSAT(e)) {
        throw e;
      }
      throw new Error(
        `Failed to assign holder: ${
          getMessageForException(e) ?? 'unknown error'
        }`,
      );
    }

    // 2. Upload media metadata to keyserver
    const keyserverID = extractKeyserverIDFromID(
      keyserverOrThreadIDForMetadata,
    );
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
  useMediaMetadataReassignment,
  useBlobServiceUpload,
  useDeleteUpload,
  useFarcasterMediaUpload,
};
