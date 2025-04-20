// @flow

import invariant from 'invariant';
import { Image } from 'react-native';

import { pathFromURI, sanitizeFilename } from 'lib/media/file-utils.js';
import type {
  Dimensions,
  MediaMissionStep,
  MediaMissionFailure,
  NativeMediaSelection,
  GenerateThumbhashMediaMissionStep,
} from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { fetchFileInfo } from './file-utils.js';
import { processImage } from './image-utils.js';
import { saveMedia } from './save-media.js';
import { processVideo } from './video-utils.js';
import { generateThumbHash } from '../utils/thumbhash-module.js';

type MediaProcessConfig = {
  +hasWiFi: boolean,
  // Blocks return until we can confirm result has the correct MIME
  +finalFileHeaderCheck?: boolean,
  +onTranscodingProgress?: (percent: number) => void,
};
type SharedMediaResult = {
  +success: true,
  +uploadURI: string,
  +shouldDisposePath: ?string,
  +filename: string,
  +mime: string,
  +dimensions: Dimensions,
  +thumbHash: ?string,
};
export type MediaResult =
  | { +mediaType: 'photo', ...SharedMediaResult }
  | {
      +mediaType: 'video',
      ...SharedMediaResult,
      +uploadThumbnailURI: string,
      +loop: boolean,
    }
  | {
      +mediaType: 'encrypted_photo',
      ...SharedMediaResult,
      +blobHash: string,
      +encryptionKey: string,
    }
  | {
      +mediaType: 'encrypted_video',
      ...SharedMediaResult,
      +blobHash: string,
      +encryptionKey: string,
      +thumbnailBlobHash: string,
      +thumbnailEncryptionKey: string,
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
  const sendResult = (result: MediaMissionFailure | MediaResult) => {
    if (resolveResult) {
      resolveResult(result);
    }
  };

  const reportPromise = innerProcessMedia(selection, config, sendResult);
  const resultPromise = new Promise<MediaMissionFailure | MediaResult>(
    resolve => {
      resolveResult = resolve;
    },
  );

  return { reportPromise, resultPromise };
}

async function innerProcessMedia(
  selection: NativeMediaSelection,
  config: MediaProcessConfig,
  sendResult: (result: MediaMissionFailure | MediaResult) => void,
): Promise<$ReadOnlyArray<MediaMissionStep>> {
  let uploadURI = null,
    uploadThumbnailURI = null,
    dimensions = selection.dimensions,
    mediaType = null,
    mime = null,
    loop = false,
    resultReturned = false,
    thumbHash = null;
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
      selection.uri !== uploadURI ? pathFromURI(uploadURI) : null;
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
        thumbHash,
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
        thumbHash,
      });
    }
  };

  const steps: Array<MediaMissionStep> = [],
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
  // the upload logic (uploadURI) requires a filesystem uri
  ({ mime, mediaType, uri: uploadURI } = fileInfoResult);
  if (!mime || !mediaType) {
    return await finish({
      success: false,
      reason: 'media_type_fetch_failed',
      detectedMIME: mime,
    });
  }

  let uriAfterProcessing = null;
  if (mediaType === 'video') {
    const { steps: videoSteps, result: videoResult } = await processVideo(
      {
        // we pass selection.uri, because for processing videos filesystem
        // uris don't work due to permissions
        uri: selection.uri,
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
      uri: uriAfterProcessing,
      thumbnailURI: uploadThumbnailURI,
      mime,
      dimensions,
      loop,
      thumbHash,
    } = videoResult);
  } else if (mediaType === 'photo') {
    const { steps: imageSteps, result: imageResult } = await processImage({
      // we pass selection.uri for consistency with videos
      uri: selection.uri,
      dimensions,
      mime,
      fileSize,
      orientation,
    });
    steps.push(...imageSteps);
    if (!imageResult.success) {
      return await finish(imageResult);
    }
    ({ uri: uriAfterProcessing, mime, dimensions, thumbHash } = imageResult);
  } else {
    invariant(false, `unknown mediaType ${mediaType}`);
  }

  if (uriAfterProcessing === selection.uri) {
    return await finish();
  }

  // The upload logic (uploadURI) requires a filesystem URI.
  // The only case where processImage and processVideo don't return a filesystem
  // URI is when they return the URI they were passed (selection.uri). Since we
  // check that case directly above, we can safely set uploadURI here.
  uploadURI = uriAfterProcessing;

  if (!config.finalFileHeaderCheck) {
    returnResult();
  }

  const { steps: finalFileInfoSteps, result: finalFileInfoResult } =
    await fetchFileInfo(uriAfterProcessing, undefined, { mime: true });

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

async function generateThumbhashStep(
  uri: string,
): Promise<GenerateThumbhashMediaMissionStep> {
  let thumbHash, exceptionMessage;
  try {
    thumbHash = await generateThumbHash(uri);
  } catch (err) {
    exceptionMessage = getMessageForException(err);
  }

  return {
    step: 'generate_thumbhash',
    success: !!thumbHash && !exceptionMessage,
    exceptionMessage,
    thumbHash,
  };
}

export { processMedia, getDimensions, generateThumbhashStep };
