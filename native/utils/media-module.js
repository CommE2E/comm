// @flow

import { requireNativeModule } from 'expo-modules-core';

type VideoInfo = {
  +duration: number, // seconds
  +width: number,
  +height: number,
  +codec: string,
  +format: string,
};

const MediaModule: {
  +getVideoInfo: (path: string) => Promise<VideoInfo>,
  +hasMultipleFrames: (path: string) => Promise<boolean>,
} = requireNativeModule('MediaModule');

export function getVideoInfo(path: string): Promise<VideoInfo> {
  return MediaModule.getVideoInfo(path);
}

export function hasMultipleFrames(path: string): Promise<boolean> {
  return MediaModule.hasMultipleFrames(path);
}
