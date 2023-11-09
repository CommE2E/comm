// @flow

import { Platform } from 'react-native';

type AlertDetails = {
  +title: string,
  +message: string,
};

const platformStore = Platform.select({
  ios: 'App Store',
  android: 'Play Store',
});

export const AppOutOfDateAlertDetails: AlertDetails = {
  title: 'App out of date',
  message:
    'Your app version is pretty old, and the server doesn’t know how ' +
    `to speak to it anymore. Please use the ${platformStore} to update!`,
};
