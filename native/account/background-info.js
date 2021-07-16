// @flow

import { Platform } from 'react-native';

const splashBackgroundURI: ?string = Platform.select({
  ios: 'SplashBackground',
  android: 'splash_background',
  default: null,
});

export { splashBackgroundURI };
