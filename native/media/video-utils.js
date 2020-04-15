// @flow

import type {
  MediaMissionStep,
  MediaMissionFailure,
  VideoProbeMediaMissionStep,
} from 'lib/types/media-types';

import filesystem from 'react-native-fs';
import { RNFFmpeg } from 'react-native-ffmpeg';
import { Platform } from 'react-native';
import invariant from 'invariant';

import {
  pathFromURI,
  stripExtension,
  extensionFromFilename,
} from 'lib/utils/file-utils';
import { getUUID } from 'lib/utils/uuid';

if (!__DEV__) {
  RNFFmpeg.disableLogs();
  RNFFmpeg.disableStatistics();
}

type ProcessVideoInfo = {|
  uri: string,
  filename: string,
|};
type ProcessVideoResponse = {|
  success: true,
  uri: string,
  mime: string,
  filename: string,
|};
async function processVideo(
  input: ProcessVideoInfo,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | ProcessVideoResponse,
|}> {
  const steps = [];

  let filename = input.filename;
  if (extensionFromFilename(filename) === 'mov') {
    // iOS uses the proprietary QuickTime container format (.mov),
    // which is generally compatible with .mp4
    filename = `${stripExtension(filename)}.mp4`;
  }

  const path = pathFromURI(input.uri);
  invariant(path, `could not extract path from ${input.uri}`);

  // Let's decide if we even need to do a transcoding step
  const initialCheckStep = await checkVideoCodec(path);
  steps.push(initialCheckStep);
  if (initialCheckStep.success) {
    return {
      steps,
      result: {
        success: true,
        uri: input.uri,
        mime: 'video/mp4',
        filename,
      },
    };
  }

  // This tells ffmpeg to use the hardware-accelerated encoders. Since we're
  // using the min-lts builds of react-native-ffmpeg we actually don't need
  // to specify this, but we would if we were using any build that provides
  // alternate encoders (for instance, min-gpl-lts)
  const codec = Platform.select({
    ios: 'h264_videotoolbox',
    android: 'h264_mediacodec',
    default: 'h264',
  });
  const ffmpegResultPath = `${
    filesystem.TemporaryDirectoryPath
  }transcode.${getUUID()}.${filename}`;

  let returnCode,
    newPath,
    success = false,
    exceptionMessage;
  const start = Date.now();
  try {
    const { rc } = await RNFFmpeg.execute(
      `-i ${path} -c:v ${codec} ${ffmpegResultPath}`,
    );
    success = rc === 0;
    if (success) {
      returnCode = rc;
      newPath = ffmpegResultPath;
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

  const transcodeProbeStep = await checkVideoCodec(ffmpegResultPath);
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
      uri: `file://${ffmpegResultPath}`,
      mime: 'video/mp4',
      filename,
    },
  };
}

async function checkVideoCodec(
  path: string,
): Promise<VideoProbeMediaMissionStep> {
  const probeStart = Date.now();
  const ext = extensionFromFilename(path);
  let success = ext === 'mp4' || ext === 'mov';
  let codec;
  if (success) {
    const videoInfo = await RNFFmpeg.getMediaInformation(path);
    codec = getVideoCodec(videoInfo);
    success = codec === 'h264';
  }
  return {
    step: 'video_probe',
    success,
    time: Date.now() - probeStart,
    path,
    ext,
    codec,
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
