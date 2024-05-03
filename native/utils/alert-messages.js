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

const AppOutOfDateAlertDetails: AlertDetails = {
  title: 'App out of date',
  message:
    'Your app version is pretty old, and the server doesn’t know how ' +
    `to speak to it anymore. Please use the ${platformStore} to update!`,
};

const UsernameReservedAlertDetails: AlertDetails = {
  title: 'Username reserved',
  message:
    'This username is currently reserved. Please contact support@' +
    'comm.app if you would like to claim this account.',
};

const UsernameTakenAlertDetails: AlertDetails = {
  title: 'Username taken',
  message: 'An account with that username already exists',
};

const UserNotFoundAlertDetails: AlertDetails = {
  title: 'Incorrect username or password',
  message: "Either that user doesn't exist, or the password is incorrect",
};

const UnknownErrorAlertDetails: AlertDetails = {
  title: 'Unknown error',
  message: 'Uhh... try again?',
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
  AppOutOfDateAlertDetails,
  UsernameReservedAlertDetails,
  UsernameTakenAlertDetails,
  UserNotFoundAlertDetails,
  UnknownErrorAlertDetails,
  getFarcasterAccountAlreadyLinkedAlertDetails,
};
