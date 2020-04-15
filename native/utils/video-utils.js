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

if (!__DEV__) {
  RNFFmpeg.disableLogs();
  RNFFmpeg.disableStatistics();
}

type TranscodeVideoInfo = {
  uri: string,
  filename: string,
  ...
};
async function transcodeVideo<InputInfo: TranscodeVideoInfo>(
  input: InputInfo,
): Promise<{|
  steps: $ReadOnlyArray<MediaMissionStep>,
  result: MediaMissionFailure | (InputInfo & { success: true, ... }),
|}> {
  const steps = [],
    createdPaths = [];
  let path = pathFromURI(input.uri),
    filename = input.filename;
  const finish = (failure?: MediaMissionFailure) => {
    for (let createdPath of createdPaths) {
      if (failure || createdPath !== path) {
        filesystem.unlink(createdPath);
      }
    }
    if (failure) {
      return { steps, result: failure };
    }
    invariant(
      path,
      "if we're finishing successfully we should have a final path",
    );
    return {
      steps,
      result: {
        ...input,
        uri: `file://${path}`,
        filename,
        success: true,
      },
    };
  };

  if (extensionFromFilename(filename) === 'mov') {
    // iOS uses the proprietary QuickTime container format (.mov),
    // which is generally compatible with .mp4
    filename = `${stripExtension(filename)}.mp4`;
  }
  if (Platform.OS === 'ios' && !path) {
    // iOS uses custom URI schemes like ph, assets-library, and ph-upload
    // We need a filesystem path before we can continue
    const iosCopyPath = `${
      filesystem.TemporaryDirectoryPath
    }copy.${Date.now()}.${filename}`;
    const copyStart = Date.now();
    try {
      await filesystem.copyAssetsVideoIOS(input.uri, iosCopyPath);
      createdPaths.push(iosCopyPath);
      path = iosCopyPath;
    } catch (e) {}
    steps.push({
      step: 'video_copy',
      success: !!path,
      time: Date.now() - copyStart,
      newPath: path,
    });
    if (!path) {
      return finish({
        success: false,
        reason: 'video_ios_asset_copy_failed',
        inputURI: input.uri,
        destinationPath: iosCopyPath,
      });
    }
  } else if (!path) {
    return finish({
      success: false,
      reason: 'video_path_extraction_failed',
      uri: input.uri,
    });
  }

  // Let's decide if we even need to do a transcoding step
  const initialCheckStep = await checkVideoCodec(path);
  steps.push(initialCheckStep);
  if (initialCheckStep.success) {
    return finish();
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
  const ffmpegTranscodeStart = Date.now();
  const ffmpegTranscodedPath = `${
    filesystem.TemporaryDirectoryPath
  }transcode.${Date.now()}.${filename}`;
  try {
    const { rc } = await RNFFmpeg.execute(
      `-i ${path} -c:v ${codec} ${ffmpegTranscodedPath}`,
    );
    if (rc === 0) {
      createdPaths.push(ffmpegTranscodedPath);
      const transcodeProbeStep = await checkVideoCodec(ffmpegTranscodedPath);
      steps.push({
        step: 'video_ffmpeg_transcode',
        success: transcodeProbeStep.success,
        time: Date.now() - ffmpegTranscodeStart,
        returnCode: rc,
        newPath: ffmpegTranscodedPath,
      });
      steps.push(transcodeProbeStep);
      if (transcodeProbeStep.success) {
        path = ffmpegTranscodedPath;
      } else {
        return finish({
          success: false,
          reason: 'video_transcode_failed',
        });
      }
    } else {
      steps.push({
        step: 'video_ffmpeg_transcode',
        success: false,
        time: Date.now() - ffmpegTranscodeStart,
        returnCode: rc,
        newPath: null,
      });
      return finish({
        success: false,
        reason: 'video_transcode_failed',
      });
    }
  } catch (e) {
    steps.push({
      step: 'video_ffmpeg_transcode',
      success: false,
      time: Date.now() - ffmpegTranscodeStart,
      returnCode: null,
      newPath: null,
    });
    return finish({
      success: false,
      reason: 'video_transcode_failed',
    });
  }

  return finish();
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

export { transcodeVideo };
