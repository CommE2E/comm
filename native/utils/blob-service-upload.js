// @flow

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import { pathFromURI } from 'lib/media/file-utils.js';
import type { BlobServiceUploadHandler } from 'lib/utils/blob-service-upload.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { createDefaultHTTPRequestHeaders } from 'lib/utils/services-utils.js';

const blobServiceUploadHandler: BlobServiceUploadHandler = async (
  url,
  method,
  input,
  authMetadata,
  options,
) => {
  if (input.blobInput.type !== 'uri') {
    throw new Error('Wrong blob data type');
  }

  let path = input.blobInput.uri;
  if (Platform.OS === 'android') {
    const resolvedPath = pathFromURI(path);
    if (resolvedPath) {
      path = resolvedPath;
    }
  }

  const headers = authMetadata && createDefaultHTTPRequestHeaders(authMetadata);
  let uploadOptions = {
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'blob_data',
    httpMethod: method,
    parameters: { blob_hash: input.blobHash },
    headers,
  };
  if (Platform.OS === 'android' && path.endsWith('.dat')) {
    // expo-file-system is not able to deduce the MIME type of .dat files, so we
    // specify it explicitly here. Without this, we get this error:
    //   guessContentTypeFromName(file.name) must not be null
    uploadOptions = {
      ...uploadOptions,
      mimeType: 'application/octet-stream',
    };
  }

  const uploadTask = FileSystem.createUploadTask(
    url,
    path,
    uploadOptions,
    uploadProgress => {
      if (options?.onProgress) {
        const { totalBytesSent, totalBytesExpectedToSend } = uploadProgress;
        options.onProgress(totalBytesSent / totalBytesExpectedToSend);
      }
    },
  );
  if (options?.abortHandler) {
    options.abortHandler(() => uploadTask.cancelAsync());
  }
  try {
    await uploadTask.uploadAsync();
  } catch (e) {
    throw new Error(
      `Failed to upload blob: ${getMessageForException(e) ?? 'unknown error'}`,
    );
  }
};

export default blobServiceUploadHandler;
