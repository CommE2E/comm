// @flow

import * as ImageManipulator from 'expo-image-manipulator';

import { getImageProcessingPlan } from 'lib/media/image-utils.js';
import type {
  Dimensions,
  MediaMissionStep,
  MediaMissionFailure,
} from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { generateThumbhashStep } from './media-utils.js';

type ProcessImageInfo = {
  +uri: string,
  +filesystemURI: string,
  +dimensions: Dimensions,
  +mime: string,
  +fileSize: number,
  +orientation: ?number,
};
type ProcessImageResponse = {
  +success: true,
  +uri: string,
  +mime: string,
  +dimensions: Dimensions,
  +thumbHash: ?string,
  +shouldDisposeURI: ?string,
};
async function processImage(input: ProcessImageInfo): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | ProcessImageResponse,
}> {
  const steps: Array<MediaMissionStep> = [];
  let { uri, dimensions, mime } = input;

  const { fileSize, orientation, filesystemURI } = input;
  const plan = getImageProcessingPlan({
    inputMIME: mime,
    inputDimensions: dimensions,
    inputFileSize: fileSize,
    inputOrientation: orientation,
  });
  if (plan.action === 'none') {
    const thumbhashStep = await generateThumbhashStep(filesystemURI);
    steps.push(thumbhashStep);
    const { thumbHash } = thumbhashStep;
    return {
      steps,
      result: {
        success: true,
        uri,
        dimensions,
        mime,
        thumbHash,
        shouldDisposeURI: null,
      },
    };
  }
  const { targetMIME, compressionRatio, fitInside } = plan;

  const transforms = [];
  if (fitInside) {
    const fitInsideRatio = fitInside.width / fitInside.height;
    if (dimensions.width / dimensions.height > fitInsideRatio) {
      transforms.push({ resize: { width: fitInside.width } });
    } else {
      transforms.push({ resize: { height: fitInside.height } });
    }
  }

  const format =
    targetMIME === 'image/png'
      ? ImageManipulator.SaveFormat.PNG
      : ImageManipulator.SaveFormat.JPEG;
  const saveConfig = { format, compress: compressionRatio };

  let success = false,
    exceptionMessage,
    shouldDisposeURI;
  const start = Date.now();
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      transforms,
      saveConfig,
    );
    success = true;
    uri = result.uri;
    mime = targetMIME;
    dimensions = { width: result.width, height: result.height };
    shouldDisposeURI = result.uri;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  steps.push({
    step: 'photo_manipulation',
    manipulation: { transforms, saveConfig },
    success,
    exceptionMessage,
    time: Date.now() - start,
    newMIME: success ? mime : null,
    newDimensions: success ? dimensions : null,
    newURI: success ? uri : null,
  });

  if (!success) {
    return {
      steps,
      result: {
        success: false,
        reason: 'photo_manipulation_failed',
        size: fileSize,
      },
    };
  }

  const thumbhashStep = await generateThumbhashStep(uri);
  steps.push(thumbhashStep);
  const { thumbHash } = thumbhashStep;

  return {
    steps,
    result: {
      success: true,
      uri,
      dimensions,
      mime,
      thumbHash,
      shouldDisposeURI,
    },
  };
}

export { processImage };
