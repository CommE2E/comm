// @flow

import * as React from 'react';

import { uploadMultimedia } from 'lib/actions/upload-actions.js';
import type { UploadMultimediaResult } from 'lib/types/media-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import { validateFile } from '../media/media-utils.js';

function useUploadAvatarMedia(): File => Promise<UploadMultimediaResult> {
  const callUploadMultimedia = useServerCall(uploadMultimedia);
  const uploadAvatarMedia = React.useCallback(
    async (file: File): Promise<UploadMultimediaResult> => {
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
      return await callUploadMultimedia(fixedFile, uploadExtras);
    },
    [callUploadMultimedia],
  );
  return uploadAvatarMedia;
}

export { useUploadAvatarMedia };
