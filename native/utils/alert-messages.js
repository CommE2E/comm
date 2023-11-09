// @flow

import { Platform } from 'react-native';

type AlertDetails = {
  title: string,
  message: string,
};

export function appOutOfDateAlert(): AlertDetails {
  const app = Platform.select({
    ios: 'App Store',
    android: 'Play Store',
  });
  return {
    title: 'App out of date',
    message:
      'Your app version is pretty old, and the server doesn’t know how ' +
      `to speak to it anymore. Please use the ${app} app to update!`,
  };
}
