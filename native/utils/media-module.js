// @flow

import {
  requireNativeModule,
  NativeModulesProxy,
  EventEmitter,
} from 'expo-modules-core';

type VideoInfo = {
  +duration: number, // seconds
  +width: number,
  +height: number,
  +codec: string,
  +format: string,
};

export type H264Profile = 'baseline' | 'main' | 'high';

export type TranscodeOptions = {
  +width: number,
  +height: number,
  +bitrate?: number,
  +profile?: H264Profile,
};

type ProgressCallback = (progress: number) => void;

type TranscodeProgressEvent = {
  +progress: number,
};

type TranscodeStats = {
  +size: number,
  +duration: number,
  +speed: number,
};

const MediaModule: {
  +getVideoInfo: (path: string) => Promise<VideoInfo>,
  +hasMultipleFrames: (path: string) => Promise<boolean>,
  +generateThumbnail: (inputPath: string, outputPath: string) => Promise<void>,
  +transcodeVideo: (
    inputPath: string,
    outputPath: string,
    options: TranscodeOptions,
  ) => Promise<TranscodeStats>,
} = requireNativeModule('MediaModule');

const emitter = new EventEmitter(MediaModule ?? NativeModulesProxy.MediaModule);

export function getVideoInfo(path: string): Promise<VideoInfo> {
  return MediaModule.getVideoInfo(path);
}

export function hasMultipleFrames(path: string): Promise<boolean> {
  return MediaModule.hasMultipleFrames(path);
}

export function generateThumbnail(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  return MediaModule.generateThumbnail(inputPath, outputPath);
}

export async function transcodeVideo(
  inputPath: string,
  outputPath: string,
  options: TranscodeOptions,
  progressCallback?: ProgressCallback,
): Promise<TranscodeStats> {
  const listener = (event: TranscodeProgressEvent) => {
    progressCallback?.(event.progress);
  };
  const subscription = emitter.addListener('onTranscodeProgress', listener);
  try {
    return await MediaModule.transcodeVideo(inputPath, outputPath, options);
  } finally {
    subscription.remove();
  }
}
