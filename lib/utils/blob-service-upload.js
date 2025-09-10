// @flow

import invariant from 'invariant';
import _throttle from 'lodash/throttle.js';

import { getMessageForException } from './errors.js';
import { createHTTPAuthorizationHeader } from './services-utils.js';
import { assertWithValidator } from './validation-utils.js';
import type {
  MultimediaUploadCallbacks,
  BlobServiceUploadFile,
} from '../actions/upload-actions.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';
import type { UploadFarcasterMediaResponse } from '../types/blob-service-types.js';
import { uploadFarcasterMediaResponseValidator } from '../types/blob-service-types.js';

function blobServiceUploadHandler(
  url: string,
  method: string,
  input: {
    blobHash: string,
    blobInput: BlobServiceUploadFile,
  },
  authMetadata: AuthMetadata,
  options?: ?MultimediaUploadCallbacks,
): Promise<void> {
  if (input.blobInput.type !== 'file') {
    throw new Error('Use file to upload blob to blob service!');
  }
  const formData = new FormData();
  formData.append('blob_hash', input.blobHash);
  invariant(input.blobInput.file, 'file should be defined');
  formData.append('blob_data', input.blobInput.file);

  const xhr = new XMLHttpRequest();
  xhr.open(method, url);

  const authHeader = createHTTPAuthorizationHeader(authMetadata);
  xhr.setRequestHeader('Authorization', authHeader);

  const { timeout, onProgress, abortHandler } = options ?? {};

  if (timeout) {
    xhr.timeout = timeout;
  }

  if (onProgress) {
    xhr.upload.onprogress = _throttle(
      ({ loaded, total }) => onProgress(loaded / total),
      50,
    );
  }

  let failed = false;
  const responsePromise = new Promise<void>((resolve, reject) => {
    xhr.onload = () => {
      if (failed) {
        return;
      }
      if (xhr.status === 401 || xhr.status === 403) {
        failed = true;
        reject(new Error('invalid_csat'));
        return;
      }
      resolve();
    };
    xhr.onabort = () => {
      failed = true;
      reject(new Error('request aborted'));
    };
    xhr.onerror = event => {
      failed = true;
      reject(event);
    };
    if (timeout) {
      xhr.ontimeout = event => {
        failed = true;
        reject(event);
      };
    }
    if (abortHandler) {
      abortHandler(() => {
        failed = true;
        reject(new Error('request aborted'));
        xhr.abort();
      });
    }
  });

  if (!failed) {
    xhr.send(formData);
  }

  return responsePromise;
}

async function farcasterMediaUploadHandler(
  url: string,
  input: BlobServiceUploadFile,
  authMetadata: AuthMetadata,
  customMetadata: ?string,
  options: MultimediaUploadCallbacks,
): Promise<UploadFarcasterMediaResponse> {
  if (input.type !== 'file') {
    throw new Error('Use file to upload blob to blob service!');
  }
  invariant(input.file, 'file should be defined');

  const formData = new FormData();
  if (customMetadata) {
    formData.append('metadata', customMetadata);
  }
  formData.append('mime_type', input.file.type);
  formData.append('file', input.file);

  const xhr = new XMLHttpRequest();
  xhr.responseType = 'json';
  xhr.open('POST', url);

  const authHeader = createHTTPAuthorizationHeader(authMetadata);
  xhr.setRequestHeader('Authorization', authHeader);

  const { timeout, onProgress, abortHandler } = options ?? {};

  if (timeout) {
    xhr.timeout = timeout;
  }

  if (onProgress) {
    xhr.upload.onprogress = _throttle(
      ({ loaded, total }) => onProgress(loaded / total),
      50,
    );
  }

  let failed = false;
  const responsePromise = new Promise<UploadFarcasterMediaResponse>(
    (resolve, reject) => {
      xhr.onload = () => {
        if (failed) {
          return;
        }
        if (xhr.status === 401 || xhr.status === 403) {
          failed = true;
          reject(new Error('invalid_csat'));
          return;
        }

        try {
          const rawResponse =
            typeof xhr.response === 'string'
              ? JSON.parse(xhr.responseText)
              : xhr.response;
          const response = assertWithValidator(
            rawResponse,
            uploadFarcasterMediaResponseValidator,
          );
          resolve(response);
        } catch (e) {
          reject(
            `Invalid response: ${getMessageForException(e) ?? 'unknown error'}`,
          );
        }
      };
      xhr.onabort = () => {
        failed = true;
        reject(new Error('request aborted'));
      };
      xhr.onerror = event => {
        failed = true;
        reject(event);
      };
      if (timeout) {
        xhr.ontimeout = event => {
          failed = true;
          reject(event);
        };
      }
      if (abortHandler) {
        abortHandler(() => {
          failed = true;
          reject(new Error('request aborted'));
          xhr.abort();
        });
      }
    },
  );

  if (!failed) {
    xhr.send(formData);
  }

  return responsePromise;
}

export type BlobServiceUploadHandler = typeof blobServiceUploadHandler;
export type FarcasterMediaUploadHandler = typeof farcasterMediaUploadHandler;

export { blobServiceUploadHandler, farcasterMediaUploadHandler };
