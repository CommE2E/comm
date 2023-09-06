// @flow

import invariant from 'invariant';
import _throttle from 'lodash/throttle.js';

import type {
  MultimediaUploadCallbacks,
  BlobServiceUploadFile,
} from '../actions/upload-actions.js';

function blobServiceUploadHandler(
  url: string,
  method: string,
  input: {
    blobHash: string,
    blobData: BlobServiceUploadFile,
  },
  options?: ?MultimediaUploadCallbacks,
): Promise<void> {
  if (input.blobData.type !== 'file') {
    throw new Error('Use file to upload blob to blob service!');
  }
  const formData = new FormData();
  formData.append('blob_hash', input.blobHash);
  invariant(input.blobData.file, 'file should be defined');
  formData.append('blob_data', input.blobData.file);

  const xhr = new XMLHttpRequest();
  xhr.open(method, url);

  if (options && options.timeout) {
    xhr.timeout = options.timeout;
  }

  if (options && options.onProgress) {
    const { onProgress } = options;
    xhr.upload.onprogress = _throttle(
      ({ loaded, total }) => onProgress(loaded / total),
      50,
    );
  }

  let failed = false;
  const responsePromise = new Promise((resolve, reject) => {
    xhr.onload = () => {
      if (failed) {
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
    if (options && options.timeout) {
      xhr.ontimeout = event => {
        failed = true;
        reject(event);
      };
    }
    if (options && options.abortHandler) {
      options.abortHandler(() => {
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
