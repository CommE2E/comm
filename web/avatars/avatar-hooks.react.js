// @flow

import * as React from 'react';

import {
  uploadMultimedia,
  useBlobServiceUpload,
} from 'lib/actions/upload-actions.js';
import { useLegacyAshoatKeyserverCall } from 'lib/keyserver-conn/legacy-keyserver-call.js';
import type { UpdateUserAvatarRequest } from 'lib/types/avatar-types.js';

import { authoritativeKeyserverID } from '../authoritative-keyserver.js';
import { encryptFile } from '../media/encryption-utils.js';
import { generateThumbHash } from '../media/image-utils.js';
import { validateFile } from '../media/media-utils.js';

type AvatarMediaUploadOptions = {
  +uploadMetadataToKeyserver?: boolean,
};

function useUploadAvatarMedia(
  options: AvatarMediaUploadOptions = {},
): File => Promise<UpdateUserAvatarRequest> {
  const { uploadMetadataToKeyserver = true } = options;

  const callUploadMultimedia = useLegacyAshoatKeyserverCall(uploadMultimedia);
  const callBlobServiceUpload = useBlobServiceUpload();
  const uploadAvatarMedia = React.useCallback(
    async (file: File): Promise<UpdateUserAvatarRequest> => {
      const validatedFile = await validateFile(file);
      const { result } = validatedFile;
      if (!result.success) {
        throw new Error('Avatar media validation failed.');
      }
      const { file: fixedFile, dimensions } = result;
      const uploadExtras = {
        ...dimensions,
        loop: false,
      };
      if (uploadMetadataToKeyserver) {
        const { id } = await callUploadMultimedia(fixedFile, uploadExtras);
        return { type: 'image', uploadID: id };
      }

      const encryptionResponse = await encryptFile(fixedFile);
      const { result: encryptionResult } = encryptionResponse;
      if (!encryptionResult.success) {
        throw new Error('Avatar media encryption failed.');
      }
      const {
        file: encryptedFile,
        sha256Hash: blobHash,
        encryptionKey,
      } = encryptionResult;

      const { result: thumbHashResult } = await generateThumbHash(
        fixedFile,
        encryptionKey,
      );
      const thumbHash = thumbHashResult.success
        ? thumbHashResult.thumbHash
        : null;

      const { id, uri } = await callBlobServiceUpload({
        uploadInput: {
          blobInput: {
            type: 'file',
            file: encryptedFile,
          },
          blobHash,
          encryptionKey,
          dimensions,
          loop: false,
          thumbHash,
        },
        keyserverOrThreadID: uploadMetadataToKeyserver
          ? authoritativeKeyserverID
          : null,
        callbacks: {},
      });

      if (uploadMetadataToKeyserver) {
        return { type: 'encrypted_image', uploadID: id };
      }

      return {
        type: 'non_keyserver_image',
        blobURI: uri,
        thumbHash,
        encryptionKey,
      };
    },
    [callBlobServiceUpload, callUploadMultimedia, uploadMetadataToKeyserver],
  );
  return uploadAvatarMedia;
}

export { useUploadAvatarMedia };
