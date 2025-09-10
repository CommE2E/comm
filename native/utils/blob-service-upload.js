// @flow

import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

import type {
  BlobServiceUploadFile,
  MultimediaUploadCallbacks,
} from 'lib/actions/upload-actions.js';
import { pathFromURI } from 'lib/media/file-utils.js';
import type { AuthMetadata } from 'lib/shared/identity-client-context.js';
import { uploadPlaintextMediaResponseValidator } from 'lib/types/blob-service-types.js';
import type { UploadPlaintextMediaResponse } from 'lib/types/blob-service-types.js';
import type { BlobServiceUploadHandler } from 'lib/utils/blob-service-upload.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { createDefaultHTTPRequestHeaders } from 'lib/utils/services-utils.js';
import { assertWithValidator } from 'lib/utils/validation-utils.js';

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

async function plaintextMediaUploadHandler(
  url: string,
  input: BlobServiceUploadFile,
  authMetadata: AuthMetadata,
  customMetadata: ?string,
  options: MultimediaUploadCallbacks,
): Promise<UploadPlaintextMediaResponse> {
  if (input.type !== 'uri') {
    throw new Error('Wrong blob data type');
  }

  let path = input.uri;
  if (Platform.OS === 'android') {
    const resolvedPath = pathFromURI(path);
    if (resolvedPath) {
      path = resolvedPath;
    }
  }

  const headers = authMetadata && createDefaultHTTPRequestHeaders(authMetadata);
  const optionalParams = customMetadata ? { metadata: customMetadata } : {};
  const uploadOptions = {
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: 'file',
    httpMethod: 'POST',
    parameters: {
      ...optionalParams,
      mime_type: input.mimeType,
    },
    headers,
  };

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
    const result = await uploadTask.uploadAsync();
    const response = assertWithValidator(
      JSON.parse(result.body),
      uploadPlaintextMediaResponseValidator,
    );
    return response;
  } catch (e) {
    throw new Error(
      `Failed to upload farcaster media: ${getMessageForException(e) ?? 'unknown error'}`,
    );
  }
}

export { blobServiceUploadHandler, plaintextMediaUploadHandler };
