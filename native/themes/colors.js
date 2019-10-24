// @flow

import type { GlobalTheme } from '../types/themes';
import type { Styles } from '../types/styles';
import type { AppState } from '../redux/redux-setup';

import { StyleSheet } from 'react-native';
import { createSelector } from 'reselect';

const light = Object.freeze({
  redButton: '#BB8888',
  greenButton: '#88BB88',
  mintButton: '#44CC99',
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
  modalForeground: 'white',
  modalForegroundBorder: '#CCCCCC',
  modalForegroundLabel: 'black',
  modalForegroundSecondaryLabel: '#888888',
  modalBackground: '#EEEEEE',
  modalBackgroundLabel: '#333333',
  modalBackgroundSecondaryLabel: '#AAAAAA',
  modalIosHighlightUnderlay: '#CCCCCCDD',
  modalSubtext: '#CCCCCC',
  modalSubtextLabel: '#555555',
  listForegroundLabel: 'black',
  listForegroundSecondaryLabel: '#333333',
  listForegroundTertiaryLabel: '#666666',
  listForegroundQuaternaryLabel: '#AAAAAA',
  listBackground: 'white',
  listBackgroundLabel: 'black',
  listBackgroundSecondaryLabel: '#777777',
  listSeparator: '#EEEEEE',
  listSeparatorLabel: '#555555',
  listInputBar: '#E2E2E2',
  listInputBorder: '#AAAAAAAA',
  listInputButton: '#888888',
  listInputBackground: '#DDDDDD',
  listIosHighlightUnderlay: '#DDDDDDDD',
  listSearchBackground: '#DDDDDD',
  listSearchIcon: '#AAAAAA',
});
export type Colors = $Exact<typeof light>;

const dark: Colors = {
  redButton: '#FF4444',
  greenButton: '#44BB44',
  mintButton: '#44CC99',
  redText: '#FF4444',
  greenText: '#44FF44',
  link: '#129AFF',
  panelBackground: '#1C1C1E',
  panelBackgroundLabel: '#C7C7CC',
  panelForeground: '#3A3A3C',
  panelForegroundBorder: '#2C2C2E',
  panelForegroundLabel: 'white',
  panelForegroundSecondaryLabel: '#AAAAAA',
  panelIosHighlightUnderlay: '#444444DD',
  modalForeground: '#1C1C1E',
  modalForegroundBorder: '#1C1C1E',
  modalForegroundLabel: 'white',
  modalForegroundSecondaryLabel: '#AAAAAA',
  modalBackground: '#2C2C2E',
  modalBackgroundLabel: '#CCCCCC',
  modalBackgroundSecondaryLabel: '#555555',
  modalIosHighlightUnderlay: '#AAAAAA88',
  modalSubtext: '#444444',
  modalSubtextLabel: '#AAAAAA',
  listForegroundLabel: 'white',
  listForegroundSecondaryLabel: '#CCCCCC',
  listForegroundTertiaryLabel: '#999999',
  listForegroundQuaternaryLabel: '#555555',
  listBackground: '#1C1C1E',
  listBackgroundLabel: '#C7C7CC',
  listBackgroundSecondaryLabel: '#BBBBBB',
  listSeparator: '#3A3A3C',
  listSeparatorLabel: '#EEEEEE',
  listInputBar: '#555555',
  listInputBorder: '#333333',
  listInputButton: '#AAAAAA',
  listInputBackground: '#38383C',
  listIosHighlightUnderlay: '#BBBBBB88',
  listSearchBackground: '#555555',
  listSearchIcon: '#AAAAAA',
};
const colors = { light, dark };

const colorsSelector: (state: AppState) => Colors = createSelector(
  (state: AppState) => state.globalThemeInfo.activeTheme,
  (theme: ?GlobalTheme) => {
    const explicitTheme = theme ? theme : 'light';
    return colors[explicitTheme];
  },
);

const magicStrings = new Set();
for (let theme in colors) {
  for (let magicString in colors[theme]) {
    magicStrings.add(magicString);
  }
}

function styleSelector<+S: Styles>(obj: S): (state: AppState) => S {
  return createSelector(
    colorsSelector,
    (themeColors: Colors) => {
      const result = {};
      for (let key in obj) {
        const style = obj[key];
        const filledInStyle = { ...style };
        for (let styleKey in style) {
          const styleValue = style[styleKey];
          if (magicStrings.has(styleValue)) {
            const mapped = themeColors[styleValue];
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
  colorsSelector,
  styleSelector,
};
