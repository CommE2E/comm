// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import { createSelector } from 'reselect';

import { selectBackgroundIsDark } from '../navigation/nav-selectors';
import { NavContext } from '../navigation/navigation-context';
import { useSelector } from '../redux/redux-utils';
import type { AppState } from '../redux/state-types';
import type { GlobalTheme } from '../types/themes';

const light = Object.freeze({
  blockQuoteBackground: '#D3D3D3',
  blockQuoteBorder: '#C0C0C0',
  codeBackground: '#DCDCDC',
  disabledButton: '#D3D3D3',
  disconnectedBarBackground: '#F5F5F5',
  editButton: '#A4A4A2',
  floatingButtonBackground: '#999999',
  floatingButtonLabel: '#EEEEEE',
  greenButton: '#6EC472',
  greenText: 'green',
  headerChevron: '#0A0A0A',
  inlineSidebarBackground: '#E0E0E0',
  inlineSidebarLabel: '#000000',
  link: '#036AFF',
  listBackground: 'white',
  listBackgroundLabel: 'black',
  listBackgroundSecondaryLabel: '#444444',
  listBackgroundTernaryLabel: '#999999',
  listChatBubble: '#F1F0F5',
  listForegroundLabel: 'black',
  listForegroundQuaternaryLabel: '#AAAAAA',
  listForegroundSecondaryLabel: '#333333',
  listForegroundTertiaryLabel: '#666666',
  listInputBackground: '#F5F5F5',
  listInputBar: '#E2E2E2',
  listInputBorder: '#AAAAAAAA',
  listInputButton: '#8E8D92',
  listIosHighlightUnderlay: '#DDDDDDDD',
  listSearchBackground: '#F5F5F5',
  listSearchIcon: '#8E8D92',
  listSeparator: '#EEEEEE',
  listSeparatorLabel: '#555555',
  markdownLink: '#000000',
  mintButton: '#44CC99',
  modalBackground: '#EEEEEE',
  modalBackgroundLabel: '#333333',
  modalBackgroundSecondaryLabel: '#AAAAAA',
  modalButton: '#BBBBBB',
  modalButtonLabel: 'black',
  modalContrastBackground: 'black',
  modalContrastForegroundLabel: 'white',
  modalContrastOpacity: 0.7,
  modalForeground: 'white',
  modalForegroundBorder: '#CCCCCC',
  modalForegroundLabel: 'black',
  modalForegroundSecondaryLabel: '#888888',
  modalForegroundTertiaryLabel: '#AAAAAA',
  modalIosHighlightUnderlay: '#CCCCCCDD',
  modalSubtext: '#CCCCCC',
  modalSubtextLabel: '#555555',
  navigationCard: '#FFFFFF',
  navigationChevron: '#BAB9BE',
  panelBackground: '#F5F5F5',
  panelBackgroundLabel: '#888888',
  panelForeground: 'white',
  panelForegroundBorder: '#CCCCCC',
  panelForegroundLabel: 'black',
  panelForegroundSecondaryLabel: '#333333',
  panelForegroundTertiaryLabel: '#888888',
  panelIosHighlightUnderlay: '#EEEEEEDD',
  panelSecondaryForeground: '#F5F5F5',
  panelSecondaryForegroundBorder: '#D1D1D6',
  redButton: '#BB8888',
  redText: '#FF4444',
  spoiler: '#33332C',
  tabBarAccent: '#7E57C2',
  tabBarBackground: '#F5F5F5',
  tabBarActiveTintColor: '#7E57C2',
  vibrantGreenButton: '#00C853',
  vibrantRedButton: '#F53100',
});
export type Colors = $Exact<typeof light>;

const dark: Colors = Object.freeze({
  blockQuoteBackground: '#A9A9A9',
  blockQuoteBorder: '#808080',
  codeBackground: '#0A0A0A',
  disabledButton: '#444444',
  disconnectedBarBackground: '#1D1D1D',
  editButton: '#5B5B5D',
  floatingButtonBackground: '#666666',
  floatingButtonLabel: 'white',
  greenButton: '#43A047',
  greenText: '#44FF44',
  headerChevron: '#FFFFFF',
  inlineSidebarBackground: '#666666',
  inlineSidebarLabel: '#FFFFFF',
  link: '#129AFF',
  listBackground: '#0A0A0A',
  listBackgroundLabel: '#C7C7CC',
  listBackgroundSecondaryLabel: '#BBBBBB',
  listBackgroundTernaryLabel: '#888888',
  listChatBubble: '#26252A',
  listForegroundLabel: 'white',
  listForegroundQuaternaryLabel: '#555555',
  listForegroundSecondaryLabel: '#CCCCCC',
  listForegroundTertiaryLabel: '#999999',
  listInputBackground: '#1D1D1D',
  listInputBar: '#555555',
  listInputBorder: '#333333',
  listInputButton: '#AAAAAA',
  listIosHighlightUnderlay: '#BBBBBB88',
  listSearchBackground: '#1D1D1D',
  listSearchIcon: '#AAAAAA',
  listSeparator: '#3A3A3C',
  listSeparatorLabel: '#EEEEEE',
  markdownLink: '#FFFFFF',
  mintButton: '#44CC99',
  modalBackground: '#0A0A0A',
  modalBackgroundLabel: '#CCCCCC',
  modalBackgroundSecondaryLabel: '#555555',
  modalButton: '#666666',
  modalButtonLabel: 'white',
  modalContrastBackground: 'white',
  modalContrastForegroundLabel: 'black',
  modalContrastOpacity: 0.85,
  modalForeground: '#1C1C1E',
  modalForegroundBorder: '#1C1C1E',
  modalForegroundLabel: 'white',
  modalForegroundSecondaryLabel: '#AAAAAA',
  modalForegroundTertiaryLabel: '#666666',
  modalIosHighlightUnderlay: '#AAAAAA88',
  modalSubtext: '#444444',
  modalSubtextLabel: '#AAAAAA',
  navigationCard: '#2A2A2A',
  navigationChevron: '#5B5B5D',
  panelBackground: '#0A0A0A',
  panelBackgroundLabel: '#C7C7CC',
  panelForeground: '#1D1D1D',
  panelForegroundBorder: '#2C2C2E',
  panelForegroundLabel: 'white',
  panelForegroundSecondaryLabel: '#CCCCCC',
  panelForegroundTertiaryLabel: '#AAAAAA',
  panelIosHighlightUnderlay: '#313035',
  panelSecondaryForeground: '#333333',
  panelSecondaryForegroundBorder: '#666666',
  redButton: '#FF4444',
  redText: '#FF4444',
  spoiler: '#33332C',
  tabBarAccent: '#AE94DB',
  tabBarBackground: '#0A0A0A',
  tabBarActiveTintColor: '#AE94DB',
  vibrantGreenButton: '#00C853',
  vibrantRedButton: '#F53100',
});
const colors = { light, dark };

const colorsSelector: (state: AppState) => Colors = createSelector(
  (state: AppState) => state.globalThemeInfo.activeTheme,
  (theme: ?GlobalTheme) => {
    const explicitTheme = theme ? theme : 'light';
    return colors[explicitTheme];
  },
);

const magicStrings = new Set();
for (const theme in colors) {
  for (const magicString in colors[theme]) {
    magicStrings.add(magicString);
  }
}

type Styles = { [name: string]: { [field: string]: mixed } };

type ReplaceField = (input: any) => any;
export type StyleSheetOf<S: Styles> = $ObjMap<S, ReplaceField>;

function stylesFromColors<IS: Styles>(
  obj: IS,
  themeColors: Colors,
): StyleSheetOf<IS> {
  const result = {};
  for (const key in obj) {
    const style = obj[key];
    const filledInStyle = { ...style };
    for (const styleKey in style) {
      const styleValue = style[styleKey];
      if (typeof styleValue !== 'string') {
        continue;
      }
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
}

function styleSelector<IS: Styles>(
  obj: IS,
): (state: AppState) => StyleSheetOf<IS> {
  return createSelector(colorsSelector, (themeColors: Colors) =>
    stylesFromColors(obj, themeColors),
  );
}

function useStyles<IS: Styles>(obj: IS): StyleSheetOf<IS> {
  const ourColors = useColors();
  return React.useMemo(() => stylesFromColors(obj, ourColors), [
    obj,
    ourColors,
  ]);
}

function useOverlayStyles<IS: Styles>(obj: IS): StyleSheetOf<IS> {
  const navContext = React.useContext(NavContext);
  const navigationState = navContext && navContext.state;

  const theme = useSelector(
    (state: AppState) => state.globalThemeInfo.activeTheme,
  );

  const backgroundIsDark = React.useMemo(
    () => selectBackgroundIsDark(navigationState, theme),
    [navigationState, theme],
  );
  const syntheticTheme = backgroundIsDark ? 'dark' : 'light';

  return React.useMemo(() => stylesFromColors(obj, colors[syntheticTheme]), [
    obj,
    syntheticTheme,
  ]);
}

function useColors(): Colors {
  return useSelector(colorsSelector);
}

function getStylesForTheme<IS: Styles>(
  obj: IS,
  theme: GlobalTheme,
): StyleSheetOf<IS> {
  return stylesFromColors(obj, colors[theme]);
}

export type IndicatorStyle = 'white' | 'black';
function useIndicatorStyle(): IndicatorStyle {
  const theme = useSelector(
    (state: AppState) => state.globalThemeInfo.activeTheme,
  );
  return theme && theme === 'dark' ? 'white' : 'black';
}
const indicatorStyleSelector: (
  state: AppState,
) => IndicatorStyle = createSelector(
  (state: AppState) => state.globalThemeInfo.activeTheme,
  (theme: ?GlobalTheme) => {
    return theme && theme === 'dark' ? 'white' : 'black';
  },
);

export type KeyboardAppearance = 'default' | 'light' | 'dark';
const keyboardAppearanceSelector: (
  state: AppState,
) => KeyboardAppearance = createSelector(
  (state: AppState) => state.globalThemeInfo.activeTheme,
  (theme: ?GlobalTheme) => {
    return theme && theme === 'dark' ? 'dark' : 'light';
  },
);

function useKeyboardAppearance(): KeyboardAppearance {
  return useSelector(keyboardAppearanceSelector);
}

export {
  colors,
  colorsSelector,
  styleSelector,
  useStyles,
  useOverlayStyles,
  useColors,
  getStylesForTheme,
  useIndicatorStyle,
  indicatorStyleSelector,
  useKeyboardAppearance,
};
