// @flow

import type { FetchJSON } from '../utils/fetch-json';
import type { UploadMultimediaResult } from '../types/media-types';

async function uploadMultimedia(
  fetchJSON: FetchJSON,
  multimedia: Object,
  onProgress: (percent: number) => void,
  abortHandler: (abort: () => void) => void,
): Promise<UploadMultimediaResult> {
  const response = await fetchJSON(
    'upload_multimedia',
    { multimedia },
    { blobUpload: true, onProgress, abortHandler },
  );
  return { id: response.id, uri: response.uri };
}

export {
  uploadMultimedia,
};
