// @flow

import invariant from 'invariant';
import _throttle from 'lodash/throttle.js';

import { createHTTPAuthorizationHeader } from './services-utils.js';
import type {
  MultimediaUploadCallbacks,
  BlobServiceUploadFile,
} from '../actions/upload-actions.js';
import type { AuthMetadata } from '../shared/identity-client-context.js';

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

export type BlobServiceUploadHandler = typeof blobServiceUploadHandler;

export { blobServiceUploadHandler };
