// @flow

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import { pathFromURI } from 'lib/media/file-utils.js';
import type { BlobServiceUploadHandler } from 'lib/utils/blob-service-upload.js';
import { getMessageForException } from 'lib/utils/errors.js';

const blobServiceUploadHandler: BlobServiceUploadHandler = async (
  url,
  method,
  input,
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
  const uploadTask = FileSystem.createUploadTask(
    url,
    path,
    {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'blob_data',
      httpMethod: method,
      parameters: { blob_hash: input.blobHash },
    },
    uploadProgress => {
      if (options?.onProgress) {
        const { totalByteSent, totalBytesExpectedToSend } = uploadProgress;
        options.onProgress(totalByteSent / totalBytesExpectedToSend);
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
