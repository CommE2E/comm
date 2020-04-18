// @flow

import type {
  Dimensions,
  MediaType,
  MediaMissionStep,
  MediaMissionFailure,
} from 'lib/types/media-types';

import { Image } from 'react-native';
import invariant from 'invariant';

import { pathFromURI, readableFilename } from 'lib/utils/file-utils';

import { fetchFileSize, fetchFileInfo, readFileHeader } from './file-utils';
import { processVideo } from './video-utils';
import { processImage } from './image-utils';

type MediaInput = {|
  type: MediaType,
  uri: string,
  dimensions: Dimensions,
  filename: string,
  mediaNativeID?: string,
|};
type MediaProcessConfig = $Shape<{|
  initialFileHeaderCheck: boolean,
  finalFileHeaderCheck: boolean,
|}>;
type MediaResult = {|
  success: true,
  uploadURI: string,
  shouldDisposePath: ?string,
  filename: string,
  mime: string,
  mediaType: MediaType,
  dimensions: Dimensions,
|};
async function processMedia(
  mediaInput: MediaInput,
  config: MediaProcessConfig,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | MediaResult,
|}> {
  const steps = [];
  let initialURI = null,
    uploadURI = null,
    dimensions = mediaInput.dimensions,
    mime = null,
    mediaType = mediaInput.type;
  const finish = (failure?: MediaMissionFailure) => {
    if (failure) {
      return { steps, result: failure };
    }
    invariant(
      uploadURI && mime,
      "if we're finishing successfully we should have a URI and MIME type",
    );
    const shouldDisposePath =
      initialURI !== uploadURI ? pathFromURI(uploadURI) : null;
    const filename = readableFilename(mediaInput.filename, mime);
    invariant(filename, `could not construct filename for ${mime}`);
    return {
      steps,
      result: {
        success: true,
        uploadURI,
        shouldDisposePath,
        filename,
        mime,
        mediaType,
        dimensions,
      },
    };
  };

  const { steps: fileInfoSteps, result: fileInfoResult } = await fetchFileInfo(
    mediaInput.uri,
    mediaInput.type,
    mediaInput.mediaNativeID,
  );
  steps.push(...fileInfoSteps);
  if (!fileInfoResult.success) {
    return finish(fileInfoResult);
  }
  const { orientation, fileSize } = fileInfoResult;
  initialURI = fileInfoResult.uri;

  if (mediaInput.type === 'photo' || config.initialFileHeaderCheck) {
    const readFileStep = await readFileHeader(initialURI, fileSize);
    steps.push(readFileStep);
    if (readFileStep.mime) {
      mime = readFileStep.mime;
    }
    if (readFileStep.mediaType && readFileStep.mediaType !== mediaType) {
      return finish({
        success: false,
        reason: 'media_type_mismatch',
        reportedMediaType: mediaType,
        detectedMediaType: readFileStep.mediaType,
        detectedMIME: readFileStep.mime,
      });
    }
  }

  if (mediaInput.type === 'video') {
    const { steps: videoSteps, result: videoResult } = await processVideo({
      uri: initialURI,
      filename: mediaInput.filename,
    });
    steps.push(...videoSteps);
    if (!videoResult.success) {
      return finish(videoResult);
    }
    uploadURI = videoResult.uri;
    mime = videoResult.mime;
  } else if (mediaInput.type === 'photo') {
    if (!mime) {
      return finish({
        success: false,
        reason: 'mime_fetch_failed',
      });
    }
    const { steps: imageSteps, result: imageResult } = await processImage({
      uri: initialURI,
      dimensions,
      mime,
      fileSize,
      orientation,
    });
    steps.push(...imageSteps);
    if (!imageResult.success) {
      return finish(imageResult);
    }
    uploadURI = imageResult.uri;
    dimensions = imageResult.dimensions;
    mime = imageResult.mime;
  } else {
    invariant(false, `unknown mediaType ${mediaInput.type}`);
  }

  if (uploadURI !== initialURI && config.finalFileHeaderCheck) {
    const { steps: fileSizeSteps, result: newFileSize } = await fetchFileSize(
      uploadURI,
    );
    steps.push(...fileSizeSteps);
    if (!newFileSize) {
      return finish({
        success: false,
        reason: 'file_stat_failed',
        uri: uploadURI,
      });
    }

    const readNewFileStep = await readFileHeader(uploadURI, newFileSize);
    steps.push(readNewFileStep);
    if (readNewFileStep.mime && readNewFileStep.mime !== mime) {
      return finish({
        success: false,
        reason: 'mime_type_mismatch',
        reportedMediaType: mediaType,
        reportedMIME: mime,
        detectedMediaType: readNewFileStep.mediaType,
        detectedMIME: readNewFileStep.mime,
      });
    }
  }

  return finish();
}

function getDimensions(uri: string): Promise<Dimensions> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width: number, height: number) => resolve({ height, width }),
      reject,
    );
  });
}

export { processMedia, getDimensions };
