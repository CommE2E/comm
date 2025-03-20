// @flow

import {
  FFmpegKit,
  FFprobeKit,
  FFmpegKitConfig,
} from 'ffmpeg-kit-react-native';

import { getHasMultipleFramesProbeCommand } from 'lib/media/video-utils.js';
import type { FFmpegStatistics, VideoInfo } from 'lib/types/media-types.js';

import { getVideoInfo } from '../utils/media-module.js';

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
    let openSlots: { [string]: number } = {};
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
      const { type } = command;
      if (openSlots[type]) {
        openSlots = { [(type: string)]: openSlots[type] - 1 };
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
      let lastStats;
      if (onTranscodingProgress) {
        FFmpegKitConfig.enableStatisticsCallback(statisticsObject => {
          const time = statisticsObject.getTime();
          onTranscodingProgress(time / 1000 / duration);
          lastStats = {
            speed: statisticsObject.getSpeed(),
            time,
            size: statisticsObject.getSize(),
            videoQuality: statisticsObject.getVideoQuality(),
            videoFrameNumber: statisticsObject.getVideoFrameNumber(),
            videoFps: statisticsObject.getVideoFps(),
            bitrate: statisticsObject.getBitrate(),
          };
        });
      }
      const session = await FFmpegKit.execute(ffmpegCommand);
      const returnCode = await session.getReturnCode();
      const rc = returnCode.getValue();
      return { rc, lastStats };
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
    const thumbnailCommand = `-i ${videoPath} -frames 1 -f mjpeg ${outputPath}`;
    const session = await FFmpegKit.execute(thumbnailCommand);
    const returnCode = await session.getReturnCode();
    return returnCode.getValue();
  }

  getVideoInfo(path: string): Promise<VideoInfo> {
    const wrappedCommand = () => FFmpeg.innerGetVideoInfo(path);
    return this.queueCommand('probe', wrappedCommand);
  }

  static async innerGetVideoInfo(path: string): Promise<VideoInfo> {
    const info = await getVideoInfo(path);

    return {
      codec: info.codec,
      format: info.format,
      dimensions: { width: info.width, height: info.height },
      duration: info.duration,
    };
  }

  hasMultipleFrames(path: string): Promise<boolean> {
    const wrappedCommand = () => FFmpeg.innerHasMultipleFrames(path);
    return this.queueCommand('probe', wrappedCommand);
  }

  static async innerHasMultipleFrames(path: string): Promise<boolean> {
    const session = await FFprobeKit.execute(
      getHasMultipleFramesProbeCommand(path),
    );
    const probeOutput = await session.getOutput();
    const numFrames = parseInt(probeOutput);
    return numFrames > 1;
  }
}

const ffmpeg: FFmpeg = new FFmpeg();

export { ffmpeg };
