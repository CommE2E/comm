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

export type TranscodeOptions = {
  +width: number,
  +height: number,
};

type ProgressCallback = (progress: number) => void;

type TranscodeProgressEvent = {
  +progress: number,
};

type MediaModuleEvents = {
  onTranscodeProgress(event: TranscodeProgressEvent): void,
};

const MediaModule: {
  +getVideoInfo: (path: string) => Promise<VideoInfo>,
  +hasMultipleFrames: (path: string) => Promise<boolean>,
  +generateThumbnail: (inputPath: string, outputPath: string) => Promise<void>,
  +transcodeVideo: (
    inputPath: string,
    outputPath: string,
    options: TranscodeOptions,
  ) => Promise<void>,
} = requireNativeModule<MediaModuleEvents>('MediaModule');

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
  progressCallback: ProgressCallback,
): Promise<void> {
  const listener = (event: TranscodeProgressEvent) => {
    progressCallback(event.progress);
  };
  emitter.addListener('onTranscodeProgress', listener);
  try {
    await MediaModule.transcodeVideo(inputPath, outputPath, options);
  } finally {
    emitter.removeListener('onTranscodeProgress', listener);
  }
}
