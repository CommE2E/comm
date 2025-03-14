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
} = requireNativeModule('MediaModule');

export function getVideoInfo(path: string): Promise<VideoInfo> {
  return MediaModule.getVideoInfo(path);
}
