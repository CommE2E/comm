// @flow

import invariant from 'invariant';
import { Image } from 'react-native';

import { pathFromURI, sanitizeFilename } from 'lib/media/file-utils.js';
import type {
  Dimensions,
  MediaMissionStep,
  MediaMissionFailure,
  NativeMediaSelection,
} from 'lib/types/media-types.js';

import { fetchFileInfo } from './file-utils.js';
import { processImage } from './image-utils.js';
import { saveMedia } from './save-media.js';
import { processVideo } from './video-utils.js';

type MediaProcessConfig = {
  +hasWiFi: boolean,
  // Blocks return until we can confirm result has the correct MIME
  +finalFileHeaderCheck?: boolean,
  +onTranscodingProgress: (percent: number) => void,
};
type SharedMediaResult = {
  +success: true,
  +uploadURI: string,
  +shouldDisposePath: ?string,
  +filename: string,
  +mime: string,
  +dimensions: Dimensions,
};
type MediaResult =
  | { +mediaType: 'photo', ...SharedMediaResult }
  | {
      +mediaType: 'video',
      ...SharedMediaResult,
      +uploadThumbnailURI: string,
      +loop: boolean,
    };
function processMedia(
  selection: NativeMediaSelection,
  config: MediaProcessConfig,
): {
  resultPromise: Promise<MediaMissionFailure | MediaResult>,
  reportPromise: Promise<$ReadOnlyArray<MediaMissionStep>>,
} {
  let resolveResult;
  const sendResult = result => {
    if (resolveResult) {
      resolveResult(result);
    }
  };

  const reportPromise = innerProcessMedia(selection, config, sendResult);
  const resultPromise = new Promise(resolve => {
    resolveResult = resolve;
  });

  return { reportPromise, resultPromise };
}

async function innerProcessMedia(
  selection: NativeMediaSelection,
  config: MediaProcessConfig,
  sendResult: (result: MediaMissionFailure | MediaResult) => void,
): Promise<$ReadOnlyArray<MediaMissionStep>> {
  let initialURI = null,
    uploadURI = null,
    uploadThumbnailURI = null,
    dimensions = selection.dimensions,
    mediaType = null,
    mime = null,
    loop = false,
    resultReturned = false;
  const returnResult = (failure?: MediaMissionFailure) => {
    invariant(
      !resultReturned,
      'returnResult called twice in innerProcessMedia',
    );
    resultReturned = true;
    if (failure) {
      sendResult(failure);
      return;
    }
    invariant(
      uploadURI && mime && mediaType,
      'missing required fields in returnResult',
    );
    const shouldDisposePath =
      initialURI !== uploadURI ? pathFromURI(uploadURI) : null;
    const filename = sanitizeFilename(selection.filename, mime);
    if (mediaType === 'video') {
      invariant(uploadThumbnailURI, 'video should have uploadThumbnailURI');
      sendResult({
        success: true,
        uploadURI,
        uploadThumbnailURI,
        shouldDisposePath,
        filename,
        mime,
        mediaType,
        dimensions,
        loop,
      });
    } else {
      sendResult({
        success: true,
        uploadURI,
        shouldDisposePath,
        filename,
        mime,
        mediaType,
        dimensions,
      });
    }
  };

  const steps = [],
    completeBeforeFinish = [];
  const finish = async (failure?: MediaMissionFailure) => {
    if (!resultReturned) {
      returnResult(failure);
    }
    await Promise.all(completeBeforeFinish);
    return steps;
  };

  if (selection.captureTime && selection.retries === 0) {
    const { uri } = selection;
    invariant(
      pathFromURI(uri),
      `captured URI ${uri} should use file:// scheme`,
    );
    completeBeforeFinish.push(
      (async () => {
        const { reportPromise } = saveMedia(uri);
        const saveMediaSteps = await reportPromise;
        steps.push(...saveMediaSteps);
      })(),
    );
  }

  const possiblyPhoto = selection.step.startsWith('photo_');
  const mediaNativeID = selection.mediaNativeID
    ? selection.mediaNativeID
    : null;
  const { steps: fileInfoSteps, result: fileInfoResult } = await fetchFileInfo(
    selection.uri,
    { mediaNativeID },
    {
      orientation: possiblyPhoto,
      mime: true,
      mediaType: true,
    },
  );
  steps.push(...fileInfoSteps);
  if (!fileInfoResult.success) {
    return await finish(fileInfoResult);
  }
  const { orientation, fileSize } = fileInfoResult;
  ({ uri: initialURI, mime, mediaType } = fileInfoResult);
  if (!mime || !mediaType) {
    return await finish({
      success: false,
      reason: 'media_type_fetch_failed',
      detectedMIME: mime,
    });
  }

  if (mediaType === 'video') {
    const { steps: videoSteps, result: videoResult } = await processVideo(
      {
        uri: initialURI,
        mime,
        filename: selection.filename,
        fileSize,
        dimensions,
        hasWiFi: config.hasWiFi,
      },
      {
        onTranscodingProgress: config.onTranscodingProgress,
      },
    );
    steps.push(...videoSteps);
    if (!videoResult.success) {
      return await finish(videoResult);
    }
    ({
      uri: uploadURI,
      thumbnailURI: uploadThumbnailURI,
      mime,
      dimensions,
      loop,
    } = videoResult);
  } else if (mediaType === 'photo') {
    const { steps: imageSteps, result: imageResult } = await processImage({
      uri: initialURI,
      dimensions,
      mime,
      fileSize,
      orientation,
    });
    steps.push(...imageSteps);
    if (!imageResult.success) {
      return await finish(imageResult);
    }
    ({ uri: uploadURI, mime, dimensions } = imageResult);
  } else {
    invariant(false, `unknown mediaType ${mediaType}`);
  }

  if (uploadURI === initialURI) {
    return await finish();
  }

  if (!config.finalFileHeaderCheck) {
    returnResult();
  }

  const { steps: finalFileInfoSteps, result: finalFileInfoResult } =
    await fetchFileInfo(uploadURI, undefined, { mime: true });
  steps.push(...finalFileInfoSteps);
  if (!finalFileInfoResult.success) {
    return await finish(finalFileInfoResult);
  }

  if (finalFileInfoResult.mime && finalFileInfoResult.mime !== mime) {
    return await finish({
      success: false,
      reason: 'mime_type_mismatch',
      reportedMediaType: mediaType,
      reportedMIME: mime,
      detectedMIME: finalFileInfoResult.mime,
    });
  }

  return await finish();
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
