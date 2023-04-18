// @flow

import * as React from 'react';

import { uploadMultimedia } from 'lib/actions/upload-actions.js';
import type { UploadMultimediaResult } from 'lib/types/media-types.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import type { MediaResult } from '../media/media-utils.js';

function useUploadProcessedMedia(): MediaResult => Promise<UploadMultimediaResult> {
  const callUploadMultimedia = useServerCall(uploadMultimedia);
  const uploadProcessedMultimedia: MediaResult => Promise<UploadMultimediaResult> =
    React.useCallback(
      processedMedia => {
        const { uploadURI, filename, mime, dimensions } = processedMedia;
        return callUploadMultimedia(
          {
            uri: uploadURI,
            name: filename,
            type: mime,
          },
          dimensions,
        );
      },
      [callUploadMultimedia],
    );
  return uploadProcessedMultimedia;
}

export { useUploadProcessedMedia };
