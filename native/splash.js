// @flow

import type { ImageStyle } from './types/styles';
import type { Dimensions } from './types/dimensions';

import { Platform, PixelRatio } from 'react-native';
import { createSelector } from 'reselect';

import { dimensionsSelector } from './selectors/dimension-selectors';

const splashStyleSelector = createSelector<*, *, *, *>(
  dimensionsSelector,
  (dimensions: Dimensions): ImageStyle => {
    if (Platform.OS !== "android") {
      return null;
    }
    const { width: windowWidth, height: windowHeight } = dimensions;
    let splashWidth = windowWidth;
    if (windowWidth > 960) {
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
    const splashHeight = windowWidth <= 480
      ? splashWidth * 2.5
      : splashWidth * 2;
    return {
      width: splashWidth,
      height: splashHeight,
      transform: [
        { translateX: -1 * (splashWidth - windowWidth) / 2 },
        { translateY: -1 * (splashHeight - windowHeight) / 2 },
      ],
    };
  },
);


export {
  splashStyleSelector,
};
