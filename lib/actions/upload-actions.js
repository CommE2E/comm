// @flow

import type { Shape } from '../types/core';
import type { UploadMultimediaResult, Dimensions } from '../types/media-types';
import type { CallServerEndpoint } from '../utils/call-server-endpoint';
import type { UploadBlob } from '../utils/upload-blob';

export type MultimediaUploadCallbacks = Shape<{
  onProgress: (percent: number) => void,
  abortHandler: (abort: () => void) => void,
  uploadBlob: UploadBlob,
}>;
export type MultimediaUploadExtras = Shape<{
  thread: string,
  ...Dimensions,
  loop: boolean,
}>;

const uploadMultimedia = (
  callServerEndpoint: CallServerEndpoint,
): ((
  multimedia: Object,
  extras: MultimediaUploadExtras,
  callbacks?: MultimediaUploadCallbacks,
) => Promise<UploadMultimediaResult>) => async (
  multimedia,
  extras,
  callbacks,
) => {
  const onProgress = callbacks && callbacks.onProgress;
  const abortHandler = callbacks && callbacks.abortHandler;
  const uploadBlob = callbacks && callbacks.uploadBlob;

  const stringExtras = {};
  if (extras.thread !== null && extras.thread !== undefined) {
    stringExtras.thread = extras.thread.toString();
  }
  if (extras.height !== null && extras.height !== undefined) {
    stringExtras.height = extras.height.toString();
  }
  if (extras.width !== null && extras.width !== undefined) {
    stringExtras.width = extras.width.toString();
  }
  if (extras.loop) {
    stringExtras.loop = '1';
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
    thread: uploadResult.thread,
  };
};

const updateMultimediaMessageMediaActionType =
  'UPDATE_MULTIMEDIA_MESSAGE_MEDIA';

const deleteUpload = (
  callServerEndpoint: CallServerEndpoint,
): ((id: string) => Promise<void>) => async id => {
  await callServerEndpoint('delete_upload', { id });
};

export {
  uploadMultimedia,
  updateMultimediaMessageMediaActionType,
  deleteUpload,
};
