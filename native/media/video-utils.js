// @flow

import type {
  MediaMissionStep,
  MediaMissionFailure,
  VideoProbeMediaMissionStep,
} from 'lib/types/media-types';

import filesystem from 'react-native-fs';
import { RNFFmpeg, RNFFprobe, RNFFmpegConfig } from 'react-native-ffmpeg';
import { Platform } from 'react-native';
import invariant from 'invariant';

import { pathFromURI, extensionFromFilename } from 'lib/utils/file-utils';
import { getVideoProcessingPlan } from 'lib/utils/video-utils';

if (!__DEV__) {
  RNFFmpegConfig.disableLogs();
  RNFFmpegConfig.disableStatistics();
}

type ProcessVideoInfo = {|
  uri: string,
  filename: string,
  fileSize: number,
|};
type ProcessVideoResponse = {|
  success: true,
  uri: string,
  mime: string,
|};
async function processVideo(
  input: ProcessVideoInfo,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | ProcessVideoResponse,
|}> {
  const steps = [];

  const path = pathFromURI(input.uri);
  invariant(path, `could not extract path from ${input.uri}`);

  const initialCheckStep = await checkVideoCodec(path);
  steps.push(initialCheckStep);

  const plan = getVideoProcessingPlan({
    inputPath: path,
    inputHasCorrectContainerAndCodec: initialCheckStep.success,
    inputFileSize: input.fileSize,
    inputFilename: input.filename,
    outputDirectory: Platform.select({
      ios: filesystem.TemporaryDirectoryPath,
      default: `${filesystem.TemporaryDirectoryPath}/`,
    }),
    // We want ffmpeg to use hardware-accelerated encoders. On iOS we can do
    // this using VideoToolbox, but ffmpeg on Android is still missing
    // MediaCodec encoding support: https://trac.ffmpeg.org/ticket/6407
    outputCodec: Platform.select({
      ios: 'h264_videotoolbox',
      //android: 'h264_mediacodec',
      default: 'h264',
    }),
  });
  if (!plan) {
    return {
      steps,
      result: {
        success: true,
        uri: input.uri,
        mime: 'video/mp4',
      },
    };
  }
  const { outputPath, ffmpegCommand } = plan;

  let returnCode,
    newPath,
    success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    const { rc } = await RNFFmpeg.execute(ffmpegCommand);
    success = rc === 0;
    if (success) {
      returnCode = rc;
      newPath = outputPath;
    }
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
    step: 'video_ffmpeg_transcode',
    success,
    exceptionMessage,
    time: Date.now() - start,
    returnCode,
    newPath,
  });

  if (!success) {
    return {
      steps,
      result: { success: false, reason: 'video_transcode_failed' },
    };
  }

  const transcodeProbeStep = await checkVideoCodec(outputPath);
  steps.push(transcodeProbeStep);
  if (!transcodeProbeStep.success) {
    return {
      steps,
      result: { success: false, reason: 'video_transcode_failed' },
    };
  }

  return {
    steps,
    result: {
      success: true,
      uri: `file://${outputPath}`,
      mime: 'video/mp4',
    },
  };
}

async function checkVideoCodec(
  path: string,
): Promise<VideoProbeMediaMissionStep> {
  const ext = extensionFromFilename(path);

  let codec,
    format,
    success = false,
    exceptionMessage;
  const start = Date.now();
  if (ext === 'mp4' || ext === 'mov') {
    try {
      const videoInfo = await RNFFprobe.getMediaInformation(path);
      codec = getVideoCodec(videoInfo);
      format = videoInfo.format.split(',');
      success = codec === 'h264' && format.includes('mp4');
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
  }

  return {
    step: 'video_probe',
    success,
    exceptionMessage,
    time: Date.now() - start,
    path,
    ext,
    codec,
    format,
  };
}

function getVideoCodec(info): ?string {
  if (!info.streams) {
    return null;
  }
  for (let stream of info.streams) {
    if (stream.type === 'video') {
      return stream.codec;
    }
  }
  return null;
}

export { processVideo };
