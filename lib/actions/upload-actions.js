// @flow

import type { Shape } from '../types/core.js';
import type {
  UploadMediaMetadataRequest,
  UploadMultimediaResult,
  Dimensions,
} from '../types/media-types';
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
  encryptionKey: string,
  thumbHash: ?string,
}>;

const uploadMediaMetadata =
  (
    callServerEndpoint: CallServerEndpoint,
  ): ((input: UploadMediaMetadataRequest) => Promise<UploadMultimediaResult>) =>
  async input => {
    const response = await callServerEndpoint('upload_media_metadata', input);
    return {
      id: response.id,
      uri: response.uri,
      mediaType: response.mediaType,
      dimensions: response.dimensions,
      loop: response.loop,
    };
  };

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
    if (extras.thumbHash) {
      stringExtras.thumbHash = extras.thumbHash;
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
  uploadMediaMetadata,
  updateMultimediaMessageMediaActionType,
  deleteUpload,
};
