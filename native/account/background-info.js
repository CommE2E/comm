// @flow

import { Platform } from 'react-native';

const splashBackgroundURI = Platform.select({
  ios: "SplashBackground",
  android: "splash_background",
  default: null,
});

export {
  splashBackgroundURI,
};
