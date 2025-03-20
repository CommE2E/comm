// @flow
import { replaceExtension, sanitizeFilename } from './file-utils.js';
import { maxDimensions } from './media-utils.js';
import type { Dimensions, MediaMissionFailure } from '../types/media-types.js';
import { getUUID } from '../utils/uuid.js';

const { height: maxHeight, width: maxWidth } = maxDimensions;

const estimatedResultBitrate = 0.35; // in MiB/s

type Input = {
  +inputPath: string,
  +inputHasCorrectContainerAndCodec: boolean,
  +inputFileSize: number, // in bytes
  +inputFilename: ?string,
  +inputMimeType: string,
  +inputDuration: number,
  +inputDimensions: Dimensions,
  +outputDirectory: string,
  +clientConnectionInfo?: {
    +hasWiFi: boolean,
    +speed: number, // in kilobytes per second
  },
  +clientTranscodeSpeed?: number, // in input video seconds per second
};

export type ProcessPlan = {
  +action: 'process',
  +inputPath: string,
  +outputPath: string,
  +thumbnailPath: string,
  +width: number,
  +height: number,
};
type Plan =
  | { +action: 'none', +thumbnailPath: string }
  | { +action: 'reject', +failure: MediaMissionFailure }
  | ProcessPlan;
function getVideoProcessingPlan(input: Input): Plan {
  const {
    inputPath,
    inputHasCorrectContainerAndCodec,
    inputFileSize,
    inputFilename,
    inputMimeType,
    inputDuration,
    inputDimensions,
    outputDirectory,
    clientConnectionInfo,
    clientTranscodeSpeed,
  } = input;

  if (inputDuration > videoDurationLimit * 60) {
    return {
      action: 'reject',
      failure: {
        success: false,
        reason: 'video_too_long',
        duration: inputDuration,
      },
    };
  }

  const uuid = getUUID();
  const sanitizedFilename = sanitizeFilename(inputFilename, inputMimeType);
  const thumbnailFilename = replaceExtension(
    `thumb.${uuid}.${sanitizedFilename}`,
    'jpg',
  );
  const thumbnailPath = `${outputDirectory}${thumbnailFilename}`;
  if (inputHasCorrectContainerAndCodec) {
    if (inputFileSize < 1e7) {
      return { action: 'none', thumbnailPath };
    }
    if (clientConnectionInfo && clientTranscodeSpeed) {
      const rawUploadTime = inputFileSize / 1024 / clientConnectionInfo.speed; // in seconds
      const transcodeTime = inputDuration / clientTranscodeSpeed; // in seconds
      const estimatedResultFileSize =
        inputDuration * estimatedResultBitrate * 1024; // in KiB
      const transcodedUploadTime =
        estimatedResultFileSize / clientConnectionInfo.speed; // in seconds
      const fullProcessTime = transcodeTime + transcodedUploadTime;
      if (
        (clientConnectionInfo.hasWiFi && rawUploadTime < fullProcessTime) ||
        (inputFileSize < 1e8 && rawUploadTime * 2 < fullProcessTime)
      ) {
        return { action: 'none', thumbnailPath };
      }
    }
  }

  const outputFilename = replaceExtension(
    `transcode.${uuid}.${sanitizedFilename}`,
    'mp4',
  );
  const outputPath = `${outputDirectory}${outputFilename}`;

  const { width, height } = inputDimensions;
  let targetWidth = -1,
    targetHeight = -1;
  const exceedsDimensions = width > maxWidth || height > maxHeight;
  if (exceedsDimensions) {
    if (width / height > maxWidth / maxHeight) {
      targetWidth = maxWidth;
      targetHeight = (maxWidth * height) / width;
    } else {
      targetHeight = maxHeight;
      targetWidth = (maxHeight * width) / height;
    }
  } else {
    targetWidth = width;
    targetHeight = height;
  }

  return {
    action: 'process',
    thumbnailPath,
    inputPath,
    outputPath,
    width: targetWidth,
    height: targetHeight,
  };
}

const videoDurationLimit = 3; // in minutes

export { getVideoProcessingPlan, videoDurationLimit };
