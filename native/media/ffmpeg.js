// @flow

import { RNFFmpeg, RNFFprobe, RNFFmpegConfig } from 'react-native-ffmpeg';

if (!__DEV__) {
  RNFFmpegConfig.disableLogs();
  RNFFmpegConfig.disableStatistics();
}

const maxSimultaneousCalls = {
  process: 4,
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
    let openSlots: $Shape<CallCounter> = {};
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
      const { type } = command;
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

  process(ffmpegCommand: string) {
    const wrappedCommand = () => RNFFmpeg.execute(ffmpegCommand);
    return this.queueCommand('process', wrappedCommand);
  }

  getVideoFormat(path: string) {
    const wrappedCommand = () => FFmpeg.innerGetVideoFormat(path);
    return this.queueCommand('probe', wrappedCommand);
  }

  static async innerGetVideoFormat(path: string) {
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
}

const ffmpeg = new FFmpeg();

export { ffmpeg };
