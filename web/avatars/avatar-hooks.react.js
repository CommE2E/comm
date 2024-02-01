// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  uploadMultimedia,
  useBlobServiceUpload,
} from 'lib/actions/upload-actions.js';
import { IdentityClientContext } from 'lib/shared/identity-client-context.js';
import type { UpdateUserAvatarRequest } from 'lib/types/avatar-types.js';
import { useLegacyAshoatKeyserverCall } from 'lib/utils/action-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import { encryptFile } from '../media/encryption-utils.js';
import { generateThumbHash } from '../media/image-utils.js';
import { validateFile } from '../media/media-utils.js';

// TODO: flip the switch
const useBlobServiceUploads = false;

function useUploadAvatarMedia(): File => Promise<UpdateUserAvatarRequest> {
  const identityContext = React.useContext(IdentityClientContext);
  invariant(identityContext, 'Identity context should be set');
  const { getAuthMetadata } = identityContext;

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
      if (!useBlobServiceUploads) {
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

      const authMetadata = await getAuthMetadata();
      const { id } = await callBlobServiceUpload({
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
        authMetadata,
        keyserverOrThreadID: ashoatKeyserverID,
        callbacks: {},
      });

      return { type: 'encrypted_image', uploadID: id };
    },
    [callBlobServiceUpload, callUploadMultimedia, getAuthMetadata],
  );
  return uploadAvatarMedia;
}

export { useUploadAvatarMedia };
