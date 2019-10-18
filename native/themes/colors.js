// @flow

import type { GlobalTheme } from '../types/themes';
import type { Styles } from '../types/styles';
import type { AppState } from '../redux/redux-setup';

import { StyleSheet } from 'react-native';
import { createSelector } from 'reselect';

const colors = {
  light: {
    background: '#E9E9EE',
    backgroundLabel: '#8E8E93',
    foreground: '#F2F2F7',
    foregroundBorder: '#D1D1D6',
    foregroundLabel: 'black',
    foregroundSecondaryLabel: '#888888',
    iosHighlightUnderlay: '#EEEEEEDD',
    modalBackground: '#E5E5EA',
    modalBackgroundLabel: '#333333',
    redButton: '#BB8888',
    greenButton: '#88BB88',
    redText: '#AA0000',
    greenText: 'green',
    link: '#036AFF',
  },
  dark: {
    background: '#1C1C1E',
    backgroundLabel: '#8E8E93',
    foreground: '#3A3A3C',
    foregroundBorder: '#2C2C2E',
    foregroundLabel: 'white',
    foregroundSecondaryLabel: '#AAAAAA',
    iosHighlightUnderlay: '#444444DD',
    modalBackground: '#2C2C2E',
    modalBackgroundLabel: '#CCCCCC',
    redButton: '#FF4444',
    greenButton: '#44BB44',
    redText: '#FF4444',
    greenText: '#44FF44',
    link: '#428FFF',
  },
};

const magicStrings = new Set();
for (let theme in colors) {
  for (let magicString in colors[theme]) {
    magicStrings.add(magicString);
  }
}

function styleSelector<+S: Styles>(obj: S): (state: AppState) => S {
  return createSelector(
    (state: AppState) => state.globalThemeInfo.activeTheme,
    (theme: ?GlobalTheme) => {
      const explicitTheme = theme ? theme : 'light';

      const result = {};
      for (let key in obj) {
        const style = obj[key];
        const filledInStyle = { ...style };
        for (let styleKey in style) {
          const styleValue = style[styleKey];
          if (magicStrings.has(styleValue)) {
            const mapped = colors[explicitTheme][styleValue];
            if (mapped) {
              filledInStyle[styleKey] = mapped;
            }
          }
        }
        result[key] = filledInStyle;
      }

      return StyleSheet.create(result);
    },
  );
}

export {
  colors,
  styleSelector,
};
