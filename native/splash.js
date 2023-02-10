// @flow

import { Platform, PixelRatio } from 'react-native';
import { createSelector } from 'reselect';

import type { DimensionsInfo } from './redux/dimensions-updater.react.js';
import type { AppState } from './redux/state-types.js';
import type { ImageStyle } from './types/styles.js';

const splashStyleSelector: (state: AppState) => ImageStyle = createSelector(
  (state: AppState) => state.dimensions,
  (dimensions: DimensionsInfo): ImageStyle => {
    if (Platform.OS !== 'android') {
      return null;
    }
    const { width: windowWidth, height: windowHeight } = dimensions;
    let splashWidth = windowWidth;
    if (windowWidth > 960) {
      // nothing
    } else if (windowWidth > 800) {
      if (PixelRatio.get() === 1.5) {
        splashWidth = 960;
      }
    } else if (windowWidth > 720) {
      if (PixelRatio.get() <= 2) {
        splashWidth = 800;
      }
    } else if (windowWidth > 600) {
      if (PixelRatio.get() <= 2) {
        splashWidth = 720;
      }
    } else if (windowWidth > 480) {
      if (PixelRatio.get() <= 2) {
        splashWidth = 600;
      }
    } else if (windowWidth > 320) {
      splashWidth = 480;
    } else {
      splashWidth = 320;
    }
    const splashHeight =
      windowWidth <= 480 ? splashWidth * 2.5 : splashWidth * 2;
    const translateX = (-1 * (splashWidth - windowWidth)) / 2;
    const translateY = (-1 * (splashHeight - windowHeight)) / 2;
    return {
      width: splashWidth,
      height: splashHeight,
      transform: [{ translateX }, { translateY }],
    };
  },
);

export { splashStyleSelector };
