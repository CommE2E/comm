// @flow

import type { GlobalTheme } from '../types/themes';
import type { Styles } from '../types/styles';
import type { AppState } from '../redux/redux-setup';

import { StyleSheet } from 'react-native';
import { createSelector } from 'reselect';

const colors = {
  light: {
    redButton: '#BB8888',
    greenButton: '#88BB88',
    redText: '#AA0000',
    greenText: 'green',
    link: '#036AFF',
    panelBackground: '#E0E0E5',
    panelBackgroundLabel: '#8E8E93',
    panelForeground: '#F2F2F7',
    panelForegroundBorder: '#D1D1D6',
    panelForegroundLabel: 'black',
    panelForegroundSecondaryLabel: '#888888',
    panelIosHighlightUnderlay: '#EEEEEEDD',
    modalForegroundLabel: 'black',
    modalBackground: '#E5E5EA',
    modalBackgroundLabel: '#333333',
    modalIosHighlightUnderlay: '#CCCCCCDD',
  },
  dark: {
    redButton: '#FF4444',
    greenButton: '#44BB44',
    redText: '#FF4444',
    greenText: '#44FF44',
    link: '#129AFF',
    panelBackground: '#1C1C1E',
    panelBackgroundLabel: '#8E8E93',
    panelForeground: '#3A3A3C',
    panelForegroundBorder: '#2C2C2E',
    panelForegroundLabel: 'white',
    panelForegroundSecondaryLabel: '#AAAAAA',
    panelIosHighlightUnderlay: '#444444DD',
    modalForegroundLabel: 'white',
    modalBackground: '#2C2C2E',
    modalBackgroundLabel: '#CCCCCC',
    modalIosHighlightUnderlay: '#AAAAAA88',
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
