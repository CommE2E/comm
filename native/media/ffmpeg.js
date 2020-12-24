// @flow

import invariant from 'invariant';
import { RNFFmpeg, RNFFprobe, RNFFmpegConfig } from 'react-native-ffmpeg';

import { getHasMultipleFramesProbeCommand } from 'lib/media/video-utils';
import type { FFmpegStatistics } from 'lib/types/media-types';

const maxSimultaneousCalls = {
  process: 1,
  probe: 1,
};

type CallCounter = typeof maxSimultaneousCalls;
type QueuedCommandType = $Keys<CallCounter>;
type QueuedCommand = {|
  type: QueuedCommandType,
  runCommand: () => Promise<void>,
|};

class FFmpeg {
  queue: QueuedCommand[] = [];
  currentCalls: CallCounter = { process: 0, probe: 0 };

  // The length of the video that's currently being transcoded in seconds
  activeCommandInputVideoDuration: ?number;
  lastStats: ?FFmpegStatistics;

  constructor() {
    RNFFmpegConfig.enableStatisticsCallback(this.statisticsCallback);
  }

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
    for (let type in this.currentCalls) {
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
    for (let command of this.queue) {
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

  process(ffmpegCommand: string, inputVideoDuration: number) {
    const duration = inputVideoDuration > 0 ? inputVideoDuration : 0.001;
    const wrappedCommand = async () => {
      RNFFmpegConfig.resetStatistics();
      this.activeCommandInputVideoDuration = duration;
      const ffmpegResult = await RNFFmpeg.execute(ffmpegCommand);
      return { ...ffmpegResult, lastStats: this.lastStats };
    };
    return this.queueCommand('process', wrappedCommand);
  }

  getVideoInfo(path: string) {
    const wrappedCommand = () => FFmpeg.innerGetVideoInfo(path);
    return this.queueCommand('probe', wrappedCommand);
  }

  static async innerGetVideoInfo(path: string) {
    const info = await RNFFprobe.getMediaInformation(path);
    const videoStreamInfo = FFmpeg.getVideoStreamInfo(info);
    const codec = videoStreamInfo && videoStreamInfo.codec;
    const dimensions = videoStreamInfo && videoStreamInfo.dimensions;
    const format = info.format.split(',');
    const duration = info.duration / 1000;
    return { codec, format, dimensions, duration };
  }

  static getVideoStreamInfo(info: Object) {
    if (!info.streams) {
      return null;
    }
    for (let stream of info.streams) {
      if (stream.type === 'video') {
        const { codec, width, height } = stream;
        return { codec, dimensions: { width, height } };
      }
    }
    return null;
  }

  hasMultipleFrames(path: string) {
    const wrappedCommand = () => FFmpeg.innerHasMultipleFrames(path);
    return this.queueCommand('probe', wrappedCommand);
  }

  static async innerHasMultipleFrames(path: string) {
    await RNFFprobe.execute(getHasMultipleFramesProbeCommand(path));
    const probeOutput = await RNFFmpegConfig.getLastCommandOutput();
    const numFrames = parseInt(probeOutput.lastCommandOutput);
    return numFrames > 1;
  }

  statisticsCallback = (statisticsData: FFmpegStatistics) => {
    this.lastStats = statisticsData;
    const { time } = statisticsData;
    const videoDuration = this.activeCommandInputVideoDuration;
    invariant(videoDuration, 'should be set');
    console.log(time / 1000 / videoDuration);
  };
}

const ffmpeg = new FFmpeg();

export { ffmpeg };
