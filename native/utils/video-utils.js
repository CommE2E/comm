// @flow

import filesystem from 'react-native-fs';
import { RNFFmpeg } from 'react-native-ffmpeg';
import { NativeModules, Platform } from 'react-native';
import invariant from 'invariant';

import {
  pathFromURI,
  stripExtension,
  extensionFromFilename,
} from 'lib/utils/file-utils';

const MovToMp4 = NativeModules.movToMp4;

if (!__DEV__) {
  RNFFmpeg.disableLogs();
  RNFFmpeg.disableStatistics();
}

type TranscodeVideoInfo = {
  uri: string,
  filename: string,
  ...
};
type TranscodeResult = $Shape<{|
  iosCopy: {| time: number |},
  initialProbe: {| time: number |},
  iosNativeTranscode: {| time: number, success: bool |},
  ffmpegTranscode: {| time: number, success: bool |},
|}>;
async function transcodeVideo<InputInfo: TranscodeVideoInfo>(
  input: InputInfo,
): Promise<?{| videoInfo: InputInfo, transcodeResult: TranscodeResult |}> {
  const transcodeResult: TranscodeResult = {}, createdPaths = [];
  let path = pathFromURI(input.uri), filename = input.filename;
  const finish = () => {
    for (let createdPath of createdPaths) {
      if (createdPath !== path) {
        filesystem.unlink(createdPath);
      }
    }
    if (!path) {
      return null;
    }
    return {
      videoInfo: { ...input, uri: `file://${path}`, filename },
      transcodeResult,
    };
  };

  if (extensionFromFilename(filename) === 'mov') {
    // iOS uses the proprietary QuickTime container format (.mov),
    // which is generally compatible with .mp4
    filename = `${stripExtension(filename)}.mp4`;
  }
  if (Platform.OS === "ios" && !path) {
    // iOS uses custom URI schemes like ph, assets-library, and ph-upload
    // We need a filesystem path before we can continue
    const iosCopyPath =
      `${filesystem.TemporaryDirectoryPath}copy.${Date.now()}.${filename}`;
    const copyStart = Date.now();
    try {
      await filesystem.copyAssetsVideoIOS(input.uri, iosCopyPath);
      createdPaths.push(iosCopyPath);
      path = iosCopyPath;
    } catch (e) { }
    transcodeResult.iosCopy = { time: Date.now() - copyStart };
  }
  if (!path) {
    console.log(`could not extract path from ${input.uri}`);
    return finish();
  }

  // Let's decide if we even need to do a transcoding step
  const {
    success: initialCheck,
    timing: initialCheckTiming,
  } = await checkVideoCodec(path);
  transcodeResult.initialProbe = { time: initialCheckTiming };
  if (initialCheck) {
    return finish();
  }

  // Next, if we're on iOS we'll try using native libraries to transcode
  // We special-case iOS because Android doesn't usually need to transcode
  // iOS defaults to HEVC since iOS 11
  if (Platform.OS === "ios") {
    const iosNativeTranscodeStart = Date.now();
    let iosNativeTranscodeSuccess = false;
    try {
      const [ iosNativeTranscodedURI ] = await MovToMp4.convertMovToMp4(
        path,
        `iostranscode.${Date.now()}.${filename}`,
      );
      const iosNativeTranscodedPath = pathFromURI(iosNativeTranscodedURI);
      invariant(
        iosNativeTranscodedPath,
        "react-native-mov-to-mp4 should return a file:/// uri, not " +
          iosNativeTranscodedURI,
      );
      createdPaths.push(iosNativeTranscodedPath);
      const { success: iosCheck } = await checkVideoCodec(
        iosNativeTranscodedPath,
      );
      if (iosCheck) {
        path = iosNativeTranscodedPath;
        iosNativeTranscodeSuccess = true;
      }
    } catch (e) { }
    transcodeResult.iosNativeTranscode = {
      time: Date.now() - iosNativeTranscodeStart,
      success: iosNativeTranscodeSuccess,
    };
    if (iosNativeTranscodeSuccess) {
      return finish();
    }
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
  let ffmpegTranscodeSuccess = false;
  const ffmpegTranscodedPath =
    `${filesystem.TemporaryDirectoryPath}transcode.${Date.now()}.${filename}`;
  try {
    const { rc } = await RNFFmpeg.execute(
      `-i ${path} -c:v ${codec} ${ffmpegTranscodedPath}`,
    );
    if (rc === 0) {
      createdPaths.push(ffmpegTranscodedPath);
      const { success: transcodeCheck } = await checkVideoCodec(
        ffmpegTranscodedPath,
      );
      if (transcodeCheck) {
        path = ffmpegTranscodedPath;
        ffmpegTranscodeSuccess = true;
      }
    }
  } catch (e) { }
  transcodeResult.ffmpegTranscode = {
    time: Date.now() - ffmpegTranscodeStart,
    success: ffmpegTranscodeSuccess,
  };

  if (!ffmpegTranscodeSuccess) {
    console.log(
      `failed to transcode ${input.uri}, ` +
        `result: ${JSON.stringify(transcodeResult)}`,
    );
    path = null;
  }

  return finish();
}

type CheckCodecResult = {|
  success: bool,
  timing: number,
|};
async function checkVideoCodec(path: string) {
  const probeStart = Date.now();
  const ext = extensionFromFilename(path);
  let success = ext === "mp4" || ext === "mov";
  if (success) {
    const videoInfo = await RNFFmpeg.getMediaInformation(path);
    success = getVideoCodec(videoInfo) === "h264";
  }
  return { success, timing: Date.now() - probeStart };
}

function getVideoCodec(info): ?string {
  if (!info.streams) {
    return null;
  }
  for (let stream of info.streams) {
    if (stream.type === "video") {
      return stream.codec;
    }
  }
  return null;
}

export {
  transcodeVideo,
};
