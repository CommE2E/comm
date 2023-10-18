// @flow

import { Alert } from 'react-native';

import { store } from '../redux/redux-setup.js';
import { type GlobalTheme, defaultGlobalThemeInfo } from '../types/themes.js';

type AlertWrapper = {
  +alert: typeof Alert.alert,
  +prompt: typeof Alert.prompt,
};

const getCurrentTheme = (): GlobalTheme =>
  store.getState().globalThemeInfo.activeTheme ||
  defaultGlobalThemeInfo.activeTheme;

const alertWrapper: AlertWrapper = {
  alert(title, message, buttons, options) {
    Alert.alert(title, message, buttons, {
      userInterfaceStyle: getCurrentTheme(),
      ...options,
    });
  },
  prompt(
    title,
    message,
    callbackOrButtons,
    type,
    defaultValue,
    keyboardType,
    options,
  ) {
    Alert.prompt(
      title,
      message,
      callbackOrButtons,
      type,
      defaultValue,
      keyboardType,
      {
        userInterfaceStyle: getCurrentTheme(),
        ...options,
      },
    );
  },
};

export default alertWrapper;
