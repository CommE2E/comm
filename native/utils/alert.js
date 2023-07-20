// @flow

import { Alert } from 'react-native';

import { store } from '../redux/redux-setup.js';
import { type GlobalTheme, defaultGlobalThemeInfo } from '../types/themes.js';

const optionsArgumentPosition = {
  alert: 3,
  prompt: 6,
};
const proxyHandler = {
  get(target, prop) {
    const theme: GlobalTheme =
      store.getState().globalThemeInfo.activeTheme ||
      defaultGlobalThemeInfo.activeTheme;
    const optionsPosition = optionsArgumentPosition[prop];

    if (!optionsPosition) {
      return target[prop];
    }
    return (...args) => {
      args[optionsPosition] = {
        userInterfaceStyle: theme,
        ...args[optionsPosition],
      };
      return target[prop].apply(target, args);
    };
  },
};

const NativeAlert: typeof Alert = new Proxy(Alert, proxyHandler);

export default NativeAlert;
