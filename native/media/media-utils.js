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
function processMedia(
  mediaInput: MediaInput,
  config: MediaProcessConfig,
): {|
  resultPromise: Promise<MediaMissionFailure | MediaResult>,
  reportPromise: Promise<$ReadOnlyArray<MediaMissionStep>>,
|} {
  let resolveResult;
  const sendResult = result => {
    if (resolveResult) {
      resolveResult(result);
    }
  };

  const reportPromise = processMediaMission(mediaInput, config, sendResult);
  const resultPromise = new Promise(resolve => {
    resolveResult = resolve;
  });

  return { reportPromise, resultPromise };
}

async function processMediaMission(
  mediaInput: MediaInput,
  config: MediaProcessConfig,
  sendResult: (MediaMissionFailure | MediaResult) => void,
): Promise<$ReadOnlyArray<MediaMissionStep>> {
  const steps = [];
  let initialURI = null,
    uploadURI = null,
    dimensions = mediaInput.dimensions,
    mime = null,
    mediaType = mediaInput.type,
    finished = false;
  const finish = (failure?: MediaMissionFailure) => {
    invariant(!finished, 'finish called twice in processMediaMission');
    finished = true;
    if (failure) {
      sendResult(failure);
      return;
    }
    invariant(
      uploadURI && mime,
      "if we're finishing successfully we should have a URI and MIME type",
    );
    const shouldDisposePath =
      initialURI !== uploadURI ? pathFromURI(uploadURI) : null;
    const filename = readableFilename(mediaInput.filename, mime);
    invariant(filename, `could not construct filename for ${mime}`);
    sendResult({
      success: true,
      uploadURI,
      shouldDisposePath,
      filename,
      mime,
      mediaType,
      dimensions,
    });
  };

  const { steps: fileInfoSteps, result: fileInfoResult } = await fetchFileInfo(
    mediaInput.uri,
    mediaInput.type,
    mediaInput.mediaNativeID,
  );
  steps.push(...fileInfoSteps);
  if (!fileInfoResult.success) {
    finish(fileInfoResult);
    return steps;
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
      finish({
        success: false,
        reason: 'media_type_mismatch',
        reportedMediaType: mediaType,
        detectedMediaType: readFileStep.mediaType,
        detectedMIME: readFileStep.mime,
      });
      return steps;
    }
  }

  if (mediaInput.type === 'video') {
    const { steps: videoSteps, result: videoResult } = await processVideo({
      uri: initialURI,
      filename: mediaInput.filename,
    });
    steps.push(...videoSteps);
    if (!videoResult.success) {
      finish(videoResult);
      return steps;
    }
    uploadURI = videoResult.uri;
    mime = videoResult.mime;
  } else if (mediaInput.type === 'photo') {
    if (!mime) {
      finish({
        success: false,
        reason: 'mime_fetch_failed',
      });
      return steps;
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
      finish(imageResult);
      return steps;
    }
    uploadURI = imageResult.uri;
    dimensions = imageResult.dimensions;
    mime = imageResult.mime;
  } else {
    invariant(false, `unknown mediaType ${mediaInput.type}`);
  }

  if (uploadURI === initialURI) {
    finish();
    return steps;
  }

  if (!config.finalFileHeaderCheck) {
    finish();
  }

  const { steps: fileSizeSteps, result: newFileSize } = await fetchFileSize(
    uploadURI,
  );
  steps.push(...fileSizeSteps);
  if (!newFileSize) {
    if (config.finalFileHeaderCheck) {
      finish({
        success: false,
        reason: 'file_stat_failed',
        uri: uploadURI,
      });
    }
    return steps;
  }

  const readNewFileStep = await readFileHeader(uploadURI, newFileSize);
  steps.push(readNewFileStep);
  if (readNewFileStep.mime && readNewFileStep.mime !== mime) {
    if (config.finalFileHeaderCheck) {
      finish({
        success: false,
        reason: 'mime_type_mismatch',
        reportedMediaType: mediaType,
        reportedMIME: mime,
        detectedMediaType: readNewFileStep.mediaType,
        detectedMIME: readNewFileStep.mime,
      });
    }
    return steps;
  }

  if (config.finalFileHeaderCheck) {
    finish();
  }

  return steps;
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
