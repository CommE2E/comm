// @flow

import { Platform, PixelRatio } from 'react-native';

import { windowHeight, windowWidth } from './dimensions';

let splashStyle;
if (Platform.OS === "android") {
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
  const splashHeight = windowWidth <= 480 ? splashWidth * 2.5 : splashWidth * 2;
  splashStyle = {
    width: splashWidth,
    height: splashHeight,
		transform: [
			{ translateX: -1 * (splashWidth - windowWidth) / 2 },
			{ translateY: -1 * (splashHeight - windowHeight) / 2 },
		],
  };
}

export {
  splashStyle,
};
