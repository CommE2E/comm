// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { UploadMultimediaResult, Dimensions } from '../types/media-types';
import type { UploadBlob } from '../utils/upload-blob';

export type MultimediaUploadCallbacks = $Shape<{|
  onProgress: (percent: number) => void,
  abortHandler: (abort: () => void) => void,
  uploadBlob: UploadBlob,
|}>;

async function uploadMultimedia(
  fetchJSON: FetchJSON,
  multimedia: Object,
  dimensions: Dimensions,
  callbacks?: MultimediaUploadCallbacks,
): Promise<UploadMultimediaResult> {
  const onProgress = callbacks && callbacks.onProgress;
  const abortHandler = callbacks && callbacks.abortHandler;
  const uploadBlob = callbacks && callbacks.uploadBlob;
  const response = await fetchJSON(
    'upload_multimedia',
    {
      multimedia: [multimedia],
      height: dimensions.height.toString(),
      width: dimensions.width.toString(),
    },
    {
      onProgress,
      abortHandler,
      blobUpload: uploadBlob ? uploadBlob : true,
    },
  );
  const [uploadResult] = response.results;
  return { id: uploadResult.id, uri: uploadResult.uri };
}

const updateMultimediaMessageMediaActionType =
  'UPDATE_MULTIMEDIA_MESSAGE_MEDIA';

async function deleteUpload(fetchJSON: FetchJSON, id: string): Promise<void> {
  await fetchJSON('delete_upload', { id });
}

export {
  uploadMultimedia,
  updateMultimediaMessageMediaActionType,
  deleteUpload,
};
