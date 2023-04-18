// @flow

import { RNFFmpeg, RNFFprobe, RNFFmpegConfig } from 'react-native-ffmpeg';

import { getHasMultipleFramesProbeCommand } from 'lib/media/video-utils.js';
import type {
  Dimensions,
  FFmpegStatistics,
  VideoInfo,
} from 'lib/types/media-types.js';

const maxSimultaneousCalls = {
  process: 1,
  probe: 1,
};

type CallCounter = typeof maxSimultaneousCalls;
type QueuedCommandType = $Keys<CallCounter>;
type QueuedCommand = {
  type: QueuedCommandType,
  runCommand: () => Promise<void>,
};

class FFmpeg {
  queue: QueuedCommand[] = [];
  currentCalls: CallCounter = { process: 0, probe: 0 };

  queueCommand<R>(
    type: QueuedCommandType,
    wrappedCommand: () => Promise<R>,
  ): Promise<R> {
    return new Promise((resolve, reject) => {
      const runCommand = async () => {
        try {
          const result = await wrappedCommand();
          this.currentCalls[type]--;
          this.possiblyRunCommands();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      };
      this.queue.push({ type, runCommand });
      this.possiblyRunCommands();
    });
  }

  possiblyRunCommands() {
    let openSlots = {};
    for (const type in this.currentCalls) {
      const currentCalls = this.currentCalls[type];
      const maxCalls = maxSimultaneousCalls[type];
      const callsLeft = maxCalls - currentCalls;
      if (!callsLeft) {
        return;
      } else if (currentCalls) {
        openSlots = { [type]: callsLeft };
        break;
      } else {
        openSlots[type] = callsLeft;
      }
    }

    const toDefer = [],
      toRun = [];
    for (const command of this.queue) {
      const type: string = command.type;
      if (openSlots[type]) {
        openSlots = { [type]: openSlots[type] - 1 };
        this.currentCalls[type]++;
        toRun.push(command);
      } else {
        toDefer.push(command);
      }
    }

    this.queue = toDefer;
    toRun.forEach(({ runCommand }) => runCommand());
  }

  transcodeVideo(
    ffmpegCommand: string,
    inputVideoDuration: number,
    onTranscodingProgress?: (percent: number) => void,
  ): Promise<{ rc: number, lastStats: ?FFmpegStatistics }> {
    const duration = inputVideoDuration > 0 ? inputVideoDuration : 0.001;
    const wrappedCommand = async () => {
      RNFFmpegConfig.resetStatistics();
      let lastStats;
      if (onTranscodingProgress) {
        RNFFmpegConfig.enableStatisticsCallback(
          (statisticsData: FFmpegStatistics) => {
            lastStats = statisticsData;
            const { time } = statisticsData;
            onTranscodingProgress(time / 1000 / duration);
          },
        );
      }
      const ffmpegResult = await RNFFmpeg.execute(ffmpegCommand);
      return { ...ffmpegResult, lastStats };
    };
    return this.queueCommand('process', wrappedCommand);
  }

  generateThumbnail(videoPath: string, outputPath: string): Promise<number> {
    const wrappedCommand = () =>
      FFmpeg.innerGenerateThumbnail(videoPath, outputPath);
    return this.queueCommand('process', wrappedCommand);
  }

  static async innerGenerateThumbnail(
    videoPath: string,
    outputPath: string,
  ): Promise<number> {
    const thumbnailCommand = `-i ${videoPath} -frames 1 -f singlejpeg ${outputPath}`;
    const { rc } = await RNFFmpeg.execute(thumbnailCommand);
    return rc;
  }

  getVideoInfo(path: string): Promise<VideoInfo> {
    const wrappedCommand = () => FFmpeg.innerGetVideoInfo(path);
    return this.queueCommand('probe', wrappedCommand);
  }

  static async innerGetVideoInfo(path: string): Promise<VideoInfo> {
    const info = await RNFFprobe.getMediaInformation(path);
    const videoStreamInfo = FFmpeg.getVideoStreamInfo(info);
    const codec = videoStreamInfo?.codec;
    const dimensions = videoStreamInfo && videoStreamInfo.dimensions;
    const format = info.format.split(',');
    const duration = info.duration / 1000;
    return { codec, format, dimensions, duration };
  }

  static getVideoStreamInfo(
    info: Object,
  ): ?{ +codec: string, +dimensions: Dimensions } {
    if (!info.streams) {
      return null;
    }
    for (const stream of info.streams) {
      if (stream.type === 'video') {
        const codec: string = stream.codec;
        const width: number = stream.width;
        const height: number = stream.height;
        return { codec, dimensions: { width, height } };
      }
    }
    return null;
  }

  hasMultipleFrames(path: string): Promise<boolean> {
    const wrappedCommand = () => FFmpeg.innerHasMultipleFrames(path);
    return this.queueCommand('probe', wrappedCommand);
  }

  static async innerHasMultipleFrames(path: string): Promise<boolean> {
    await RNFFprobe.execute(getHasMultipleFramesProbeCommand(path));
    const probeOutput = await RNFFmpegConfig.getLastCommandOutput();
    const numFrames = parseInt(probeOutput.lastCommandOutput);
    return numFrames > 1;
  }
}

const ffmpeg: FFmpeg = new FFmpeg();

export { ffmpeg };
