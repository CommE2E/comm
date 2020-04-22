// @flow

import { RNFFmpeg, RNFFprobe, RNFFmpegConfig } from 'react-native-ffmpeg';

if (!__DEV__) {
  RNFFmpegConfig.disableLogs();
  RNFFmpegConfig.disableStatistics();
}

class FFmpeg {
  async getVideoFormat(path: string) {
    const info = await RNFFprobe.getMediaInformation(path);
    const codec = FFmpeg.getVideoCodec(info);
    const format = info.format.split(',');
    return { codec, format };
  }

  static getVideoCodec(info: Object): ?string {
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

  process(ffmpegCommand: string) {
    return RNFFmpeg.execute(ffmpegCommand);
  }
}

const ffmpeg = new FFmpeg();

export { ffmpeg };
