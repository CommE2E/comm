// @flow

import invariant from 'invariant';
import filesystem from 'react-native-fs';

import { mediaConfig, pathFromURI } from 'lib/media/file-utils.js';
import { getVideoProcessingPlan } from 'lib/media/video-utils.js';
import type { ProcessPlan } from 'lib/media/video-utils.js';
import type {
  MediaMissionStep,
  MediaMissionFailure,
  VideoProbeMediaMissionStep,
  TranscodeVideoMediaMissionStep,
  VideoGenerateThumbnailMediaMissionStep,
  Dimensions,
} from 'lib/types/media-types.js';
import { getMessageForException } from 'lib/utils/errors.js';

import { temporaryDirectoryPath } from './file-utils.js';
import { mediaProcessingQueue } from './media-processing-queue.js';
import { generateThumbhashStep } from './media-utils.js';

// These are some numbers I sorta kinda made up
// We should try to calculate them on a per-device basis
const uploadSpeeds = Object.freeze({
  wifi: 4096, // in KiB/s
  cellular: 512, // in KiB/s
});
const clientTranscodeSpeed = 1.15; // in seconds of video transcoded per second

const validCodecs = ['avc', 'avc1', 'h264'];
const validFormats = ['mp4'];

type ProcessVideoInfo = {
  +uri: string,
  +mime: string,
  +filename: ?string,
  +fileSize: number,
  +dimensions: Dimensions,
  +hasWiFi: boolean,
};

type VideoProcessConfig = {
  +onTranscodingProgress?: (percent: number) => void,
};

type ProcessVideoResponse = {
  +success: true,
  +uri: string,
  +thumbnailURI: string,
  +mime: string,
  +dimensions: Dimensions,
  +loop: boolean,
  +thumbHash: ?string,
};
async function processVideo(
  input: ProcessVideoInfo,
  config: VideoProcessConfig,
): Promise<{
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | ProcessVideoResponse,
}> {
  const steps: Array<MediaMissionStep> = [];

  const path = pathFromURI(input.uri);
  invariant(path, `could not extract path from ${input.uri}`);

  const initialCheckStep = await checkVideoInfo(path);
  steps.push(initialCheckStep);
  if (!initialCheckStep.success || !initialCheckStep.duration) {
    return { steps, result: { success: false, reason: 'video_probe_failed' } };
  }
  const { validFormat, duration } = initialCheckStep;

  const plan = getVideoProcessingPlan({
    inputPath: path,
    inputHasCorrectContainerAndCodec: validFormat,
    inputFileSize: input.fileSize,
    inputFilename: input.filename,
    inputMimeType: input.mime,
    inputDuration: duration,
    inputDimensions: input.dimensions,
    outputDirectory: temporaryDirectoryPath,
    clientConnectionInfo: {
      hasWiFi: input.hasWiFi,
      speed: input.hasWiFi ? uploadSpeeds.wifi : uploadSpeeds.cellular,
    },
    clientTranscodeSpeed,
  });
  if (plan.action === 'reject') {
    return { steps, result: plan.failure };
  }
  if (plan.action === 'none') {
    const thumbnailStep = await generateThumbnail(path, plan.thumbnailPath);
    steps.push(thumbnailStep);
    if (!thumbnailStep.success) {
      void unlink(plan.thumbnailPath);
      return {
        steps,
        result: { success: false, reason: 'video_generate_thumbnail_failed' },
      };
    }
    const thumbnailURI = `file://${plan.thumbnailPath}`;
    const thumbhashStep = await generateThumbhashStep(thumbnailURI);
    steps.push(thumbhashStep);
    const { thumbHash } = thumbhashStep;
    return {
      steps,
      result: {
        success: true,
        uri: input.uri,
        thumbnailURI,
        thumbHash,
        mime: 'video/mp4',
        dimensions: input.dimensions,
        loop: false,
      },
    };
  }

  const [thumbnailStep, transcodeStep] = await Promise.all([
    generateThumbnail(path, plan.thumbnailPath),
    transcodeVideo(plan, duration, config.onTranscodingProgress),
  ]);
  steps.push(thumbnailStep, transcodeStep);

  if (!thumbnailStep.success) {
    void unlink(plan.outputPath);
    void unlink(plan.thumbnailPath);
    return {
      steps,
      result: {
        success: false,
        reason: 'video_generate_thumbnail_failed',
      },
    };
  }
  if (!transcodeStep.success) {
    void unlink(plan.outputPath);
    void unlink(plan.thumbnailPath);
    return {
      steps,
      result: {
        success: false,
        reason: 'video_transcode_failed',
      },
    };
  }

  const transcodeProbeStep = await checkVideoInfo(plan.outputPath);
  steps.push(transcodeProbeStep);
  if (!transcodeProbeStep.validFormat) {
    void unlink(plan.outputPath);
    void unlink(plan.thumbnailPath);
    return {
      steps,
      result: { success: false, reason: 'video_transcode_failed' },
    };
  }

  const dimensions = transcodeProbeStep.dimensions
    ? transcodeProbeStep.dimensions
    : input.dimensions;
  const loop = !!(
    mediaConfig[input.mime] &&
    mediaConfig[input.mime].videoConfig &&
    mediaConfig[input.mime].videoConfig.loop
  );
  const thumbnailURI = `file://${plan.thumbnailPath}`;
  const thumbhashStep = await generateThumbhashStep(thumbnailURI);
  steps.push(thumbhashStep);
  const { thumbHash } = thumbhashStep;
  return {
    steps,
    result: {
      success: true,
      uri: `file://${plan.outputPath}`,
      thumbnailURI,
      thumbHash,
      mime: 'video/mp4',
      dimensions,
      loop,
    },
  };
}

async function generateThumbnail(
  path: string,
  thumbnailPath: string,
): Promise<VideoGenerateThumbnailMediaMissionStep> {
  const thumbnailStart = Date.now();
  let exceptionMessage;
  try {
    await mediaProcessingQueue.generateThumbnail(path, thumbnailPath);
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  return {
    step: 'video_generate_thumbnail',
    success: !exceptionMessage,
    time: Date.now() - thumbnailStart,
    exceptionMessage,
    thumbnailURI: thumbnailPath,
  };
}

async function transcodeVideo(
  plan: ProcessPlan,
  duration: number,
  onProgressCallback?: number => void,
): Promise<TranscodeVideoMediaMissionStep> {
  const transcodeStart = Date.now();
  let newPath, stats, exceptionMessage;
  try {
    stats = await mediaProcessingQueue.transcodeVideo(
      plan.inputPath,
      plan.outputPath,
      {
        width: plan.width,
        height: plan.height,
      },
      onProgressCallback,
    );
    newPath = plan.outputPath;
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }

  return {
    step: 'video_transcode',
    success: !exceptionMessage,
    exceptionMessage,
    time: Date.now() - transcodeStart,
    newPath,
    stats,
  };
}

async function checkVideoInfo(
  path: string,
): Promise<VideoProbeMediaMissionStep> {
  let codec,
    format,
    dimensions,
    duration,
    success = false,
    validFormat = false,
    exceptionMessage;
  const start = Date.now();
  try {
    ({ codec, format, dimensions, duration } =
      await mediaProcessingQueue.getVideoInfo(path));
    success = true;
    validFormat = validCodecs.includes(codec) && validFormats.includes(format);
  } catch (e) {
    exceptionMessage = getMessageForException(e);
  }
  return {
    step: 'video_probe',
    success,
    exceptionMessage,
    time: Date.now() - start,
    path,
    validFormat,
    duration,
    codec,
    format,
    dimensions,
  };
}

async function unlink(path: string) {
  try {
    await filesystem.unlink(path);
  } catch {}
}

function formatDuration(seconds: number): string {
  const mm = Math.floor(seconds / 60);
  const ss = (seconds % 60).toFixed(0).padStart(2, '0');
  return `${mm}:${ss}`;
}

export { processVideo, formatDuration };
