// @flow

import type { Shape } from '../types/core';
import type { UploadMultimediaResult, Dimensions } from '../types/media-types';
import type { FetchJSON } from '../utils/fetch-json';
import type { UploadBlob } from '../utils/upload-blob';

export type MultimediaUploadCallbacks = Shape<{|
  onProgress: (percent: number) => void,
  abortHandler: (abort: () => void) => void,
  uploadBlob: UploadBlob,
|}>;
export type MultimediaUploadExtras = Shape<{| ...Dimensions, loop: boolean |}>;

const uploadMultimedia = (fetchJSON: FetchJSON): (
  multimedia: Object,
  extras: MultimediaUploadExtras,
  callbacks?: MultimediaUploadCallbacks,
) => Promise<UploadMultimediaResult> => async (
  multimedia,
  extras,
  callbacks
) => {
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

  const response = await fetchJSON(
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

const deleteUpload = (fetchJSON: FetchJSON): (
  id: string,
) => Promise<void> => async (id) => {
  await fetchJSON('delete_upload', { id });
};

export {
  uploadMultimedia,
  updateMultimediaMessageMediaActionType,
  deleteUpload,
};
