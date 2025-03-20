// @flow
import type {
  TranscodingStatistics,
  VideoInfo,
} from 'lib/types/media-types.js';

import type { TranscodeOptions } from '../utils/media-module.js';
import {
  getVideoInfo,
  hasMultipleFrames,
  generateThumbnail,
  transcodeVideo,
} from '../utils/media-module.js';

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

class MediaProcessingQueue {
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
    inputPath: string,
    outputPath: string,
    transcodeOptions: TranscodeOptions,
    onTranscodingProgress?: (percent: number) => void,
  ): Promise<TranscodingStatistics> {
    const wrappedCommand = async () => {
      const stats = await transcodeVideo(
        inputPath,
        outputPath,
        transcodeOptions,
        onTranscodingProgress,
      );
      return {
        speed: stats.speed,
        time: stats.duration,
        size: stats.size,
      };
    };
    return this.queueCommand('process', wrappedCommand);
  }

  generateThumbnail(videoPath: string, outputPath: string): Promise<void> {
    const wrappedCommand = () => generateThumbnail(videoPath, outputPath);
    return this.queueCommand('process', wrappedCommand);
  }

  getVideoInfo(path: string): Promise<VideoInfo> {
    const wrappedCommand = () => MediaProcessingQueue.innerGetVideoInfo(path);
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
    const wrappedCommand = () => hasMultipleFrames(path);
    return this.queueCommand('probe', wrappedCommand);
  }
}

const mediaProcessingQueue: MediaProcessingQueue = new MediaProcessingQueue();

export { mediaProcessingQueue };
