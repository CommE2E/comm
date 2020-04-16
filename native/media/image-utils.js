// @flow

import type {
  Dimensions,
  MediaMissionStep,
  MediaMissionFailure,
} from 'lib/types/media-types';

import * as ImageManipulator from 'expo-image-manipulator';

type ProcessImageInfo = {|
  uri: string,
  dimensions: Dimensions,
  mime: string,
  fileSize: number,
  orientation: ?number,
|};
type ProcessImageResponse = {|
  success: true,
  uri: string,
  mime: string,
  dimensions: Dimensions,
|};
async function processImage(
  input: ProcessImageInfo,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | ProcessImageResponse,
|}> {
  const steps = [];
  let { uri, dimensions, mime } = input;

  const { fileSize, orientation } = input;

  const unsupportedMIME = mime !== 'image/png' && mime !== 'image/jpeg';
  const needsProcessing = unsupportedMIME || (orientation && orientation > 1);
  const needsCompression =
    fileSize > 5e6 || (unsupportedMIME && fileSize > 3e6);
  const transforms = [];

  // The dimensions we have are actually the post-rotation dimensions
  if (fileSize > 5e5 && (dimensions.width > 3000 || dimensions.height > 2000)) {
    if (dimensions.width / dimensions.height > 1.5) {
      transforms.push({ width: 3000 });
    } else {
      transforms.push({ height: 2000 });
    }
  }

  if (!needsCompression && !needsProcessing && transforms.length === 0) {
    return {
      steps,
      result: { success: true, uri, dimensions, mime },
    };
  }

  const format =
    mime === 'image/png'
      ? ImageManipulator.SaveFormat.PNG
      : ImageManipulator.SaveFormat.JPEG;
  const compress = needsCompression ? 0.83 : 0.92;
  const saveConfig = { format, compress };

  let success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      transforms,
      saveConfig,
    );
    success = true;
    uri = result.uri;
    mime = mime === 'image/png' ? 'image/png' : 'image/jpeg';
    dimensions = { width: result.width, height: result.height };
  } catch (e) {
    if (
      e &&
      typeof e === 'object' &&
      e.message &&
      typeof e.message === 'string'
    ) {
      exceptionMessage = e.message;
    }
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

  return { steps, result: { success: true, uri, dimensions, mime } };
}

export { processImage };
