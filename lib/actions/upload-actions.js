// @flow

import type { Shape } from '../types/core.js';
import type {
  UploadMultimediaResult,
  Dimensions,
} from '../types/media-types.js';
import type { CallServerEndpoint } from '../utils/call-server-endpoint.js';
import type { UploadBlob } from '../utils/upload-blob.js';

export type MultimediaUploadCallbacks = Shape<{
  onProgress: (percent: number) => void,
  abortHandler: (abort: () => void) => void,
  uploadBlob: UploadBlob,
}>;
export type MultimediaUploadExtras = Shape<{
  ...Dimensions,
  loop: boolean,
  encryptionKey?: string,
}>;

const uploadMultimedia =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((
    multimedia: Object,
    extras: MultimediaUploadExtras,
    callbacks?: MultimediaUploadCallbacks,
  ) => Promise<UploadMultimediaResult>) =>
  async (multimedia, extras, callbacks) => {
    const onProgress = callbacks && callbacks.onProgress;
    const abortHandler = callbacks && callbacks.abortHandler;
    const uploadBlob = callbacks && callbacks.uploadBlob;

    const stringExtras = {};
    if (extras.height !== null && extras.height !== undefined) {
      stringExtras.height = extras.height.toString();
    }
    if (extras.width !== null && extras.width !== undefined) {
      stringExtras.width = extras.width.toString();
    }
    if (extras.loop) {
      stringExtras.loop = '1';
    }
    if (extras.encryptionKey) {
      stringExtras.encryptionKey = extras.encryptionKey;
    }

    // also pass MIME type if available
    if (multimedia.type && typeof multimedia.type === 'string') {
      stringExtras.mimeType = multimedia.type;
    }

    const response = await callServerEndpoint(
      'upload_multimedia',
      {
        multimedia: [multimedia],
        ...stringExtras,
      },
      {
        onProgress,
        abortHandler,
        blobUpload: uploadBlob ? uploadBlob : true,
      },
    );
    const [uploadResult] = response.results;
    return {
      id: uploadResult.id,
      uri: uploadResult.uri,
      dimensions: uploadResult.dimensions,
      mediaType: uploadResult.mediaType,
      loop: uploadResult.loop,
    };
  };

const updateMultimediaMessageMediaActionType =
  'UPDATE_MULTIMEDIA_MESSAGE_MEDIA';

const deleteUpload =
  (callServerEndpoint: CallServerEndpoint): ((id: string) => Promise<void>) =>
  async id => {
    await callServerEndpoint('delete_upload', { id });
  };

export {
  uploadMultimedia,
  updateMultimediaMessageMediaActionType,
  deleteUpload,
};
