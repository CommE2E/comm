// @flow

import { Platform } from 'react-native';

export type AlertDetails = {
  +title: string,
  +message: string,
};

const platformStore: string = Platform.select({
  ios: 'App Store',
  android: 'Play Store',
});

const appOutOfDateAlertDetails: AlertDetails = {
  title: 'App out of date',
  message:
    'Your app version is pretty old, and the server doesn’t know how ' +
    `to speak to it anymore. Please use the ${platformStore} to update!`,
};

const usernameReservedAlertDetails: AlertDetails = {
  title: 'Username reserved',
  message:
    'This username is currently reserved. Please contact support@' +
    'comm.app if you would like to claim this account.',
};

const usernameTakenAlertDetails: AlertDetails = {
  title: 'Username taken',
  message: 'An account with that username already exists',
};

const userNotFoundAlertDetails: AlertDetails = {
  title: 'Incorrect username or password',
  message: "Either that user doesn't exist, or the password is incorrect",
};

const unknownErrorAlertDetails: AlertDetails = {
  title: 'Unknown error',
  message: 'Uhh... try again?',
};

const networkErrorAlertDetails: AlertDetails = {
  title: 'Network error',
  message:
    'Failed to contact Comm services. Please check your network connection.',
};

const backupIsNewerThanAppAlertDetails: AlertDetails = {
  title: 'App out of date',
  message:
    `Your app version is pretty old, and restoring your data is not ` +
    `possible. Please use the ${platformStore} to update, and then ` +
    `we'll restore all your data. If you don't want to do it now, ` +
    `you can still use your app.`,
};

const getFarcasterAccountAlreadyLinkedAlertDetails = (
  commUsername: ?string,
): AlertDetails => ({
  title: 'Farcaster account already linked',
  message: `That Farcaster account is already linked to ${
    commUsername ? commUsername : 'another account'
  }`,
});

export {
  appOutOfDateAlertDetails,
  usernameReservedAlertDetails,
  usernameTakenAlertDetails,
  userNotFoundAlertDetails,
  unknownErrorAlertDetails,
  networkErrorAlertDetails,
  backupIsNewerThanAppAlertDetails,
  getFarcasterAccountAlreadyLinkedAlertDetails,
};
