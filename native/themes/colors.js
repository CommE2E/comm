// @flow

import type { GlobalTheme } from '../types/themes';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { StyleSheet } from 'react-native';
import { createSelector } from 'reselect';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';

import { selectBackgroundIsDark } from '../navigation/nav-selectors';
import { NavContext } from '../navigation/navigation-context';

const light = Object.freeze({
  redButton: '#BB8888',
  greenButton: '#88BB88',
  mintButton: '#44CC99',
  redText: '#AA0000',
  greenText: 'green',
  link: '#036AFF',
  panelBackground: '#E9E9EF',
  panelBackgroundLabel: '#888888',
  panelForeground: 'white',
  panelForegroundBorder: '#CCCCCC',
  panelForegroundLabel: 'black',
  panelForegroundSecondaryLabel: '#333333',
  panelForegroundTertiaryLabel: '#888888',
  panelIosHighlightUnderlay: '#EEEEEEDD',
  panelSecondaryForeground: '#F5F5F5',
  panelSecondaryForegroundBorder: '#D1D1D6',
  modalForeground: 'white',
  modalForegroundBorder: '#CCCCCC',
  modalForegroundLabel: 'black',
  modalForegroundSecondaryLabel: '#888888',
  modalForegroundTertiaryLabel: '#AAAAAA',
  modalBackground: '#EEEEEE',
  modalBackgroundLabel: '#333333',
  modalBackgroundSecondaryLabel: '#AAAAAA',
  modalIosHighlightUnderlay: '#CCCCCCDD',
  modalSubtext: '#CCCCCC',
  modalSubtextLabel: '#555555',
  modalButton: '#BBBBBB',
  modalButtonLabel: 'black',
  modalContrastBackground: 'black',
  modalContrastForegroundLabel: 'white',
  modalContrastOpacity: 0.7,
  listForegroundLabel: 'black',
  listForegroundSecondaryLabel: '#333333',
  listForegroundTertiaryLabel: '#666666',
  listForegroundQuaternaryLabel: '#AAAAAA',
  listBackground: 'white',
  listBackgroundLabel: 'black',
  listBackgroundSecondaryLabel: '#444444',
  listBackgroundTernaryLabel: '#999999',
  listSeparator: '#EEEEEE',
  listSeparatorLabel: '#555555',
  listInputBar: '#E2E2E2',
  listInputBorder: '#AAAAAAAA',
  listInputButton: '#888888',
  listInputBackground: '#DDDDDD',
  listIosHighlightUnderlay: '#DDDDDDDD',
  listSearchBackground: '#DDDDDD',
  listSearchIcon: '#AAAAAA',
  listChatBubble: '#DDDDDDBB',
  navigationCard: '#FFFFFF',
  floatingButtonBackground: '#999999',
  floatingButtonLabel: '#EEEEEE',
  blockQuoteBackground: '#D3D3D3',
  blockQuoteBorder: '#C0C0C0',
  codeBackground: '#DCDCDC',
});
export type Colors = $Exact<typeof light>;

const colorsPropType = PropTypes.objectOf(
  PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
);

const dark: Colors = Object.freeze({
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
  panelForegroundSecondaryLabel: '#CCCCCC',
  panelForegroundTertiaryLabel: '#AAAAAA',
  panelIosHighlightUnderlay: '#444444DD',
  panelSecondaryForeground: '#333333',
  panelSecondaryForegroundBorder: '#666666',
  modalForeground: '#1C1C1E',
  modalForegroundBorder: '#1C1C1E',
  modalForegroundLabel: 'white',
  modalForegroundSecondaryLabel: '#AAAAAA',
  modalForegroundTertiaryLabel: '#666666',
  modalBackground: '#2C2C2E',
  modalBackgroundLabel: '#CCCCCC',
  modalBackgroundSecondaryLabel: '#555555',
  modalIosHighlightUnderlay: '#AAAAAA88',
  modalSubtext: '#444444',
  modalSubtextLabel: '#AAAAAA',
  modalButton: '#666666',
  modalButtonLabel: 'white',
  modalContrastBackground: 'white',
  modalContrastForegroundLabel: 'black',
  modalContrastOpacity: 0.85,
  listForegroundLabel: 'white',
  listForegroundSecondaryLabel: '#CCCCCC',
  listForegroundTertiaryLabel: '#999999',
  listForegroundQuaternaryLabel: '#555555',
  listBackground: '#1C1C1E',
  listBackgroundLabel: '#C7C7CC',
  listBackgroundSecondaryLabel: '#BBBBBB',
  listBackgroundTernaryLabel: '#888888',
  listSeparator: '#3A3A3C',
  listSeparatorLabel: '#EEEEEE',
  listInputBar: '#555555',
  listInputBorder: '#333333',
  listInputButton: '#AAAAAA',
  listInputBackground: '#38383C',
  listIosHighlightUnderlay: '#BBBBBB88',
  listSearchBackground: '#555555',
  listSearchIcon: '#AAAAAA',
  listChatBubble: '#444444DD',
  navigationCard: '#2A2A2A',
  floatingButtonBackground: '#666666',
  floatingButtonLabel: 'white',
  blockQuoteBackground: '#A9A9A9',
  blockQuoteBorder: '#808080',
  codeBackground: '#222222',
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
for (let theme in colors) {
  for (let magicString in colors[theme]) {
    magicStrings.add(magicString);
  }
}

type Styles = { [name: string]: { [field: string]: mixed } };

type ReplaceField = (input: any) => any;
type ReplaceStyleObject = <Obj: { [key: string]: mixed }>(
  Obj,
) => $ObjMap<Obj, ReplaceField>;

export type StyleSheetOf<S: Styles> = $ObjMap<S, ReplaceStyleObject>;

function stylesFromColors<IS: Styles>(
  obj: IS,
  themeColors: Colors,
): StyleSheetOf<IS> {
  const result = {};
  for (let key in obj) {
    const style = obj[key];
    const filledInStyle = { ...style };
    for (let styleKey in style) {
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
  const theme = useSelector(
    (state: AppState) => state.globalThemeInfo.activeTheme,
  );
  const explicitTheme = theme ? theme : 'light';
  return React.useMemo(() => stylesFromColors(obj, colors[explicitTheme]), [
    obj,
    explicitTheme,
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

function getStylesForTheme<IS: Styles>(
  obj: IS,
  theme: GlobalTheme,
): StyleSheetOf<IS> {
  return stylesFromColors(obj, colors[theme]);
}

export type IndicatorStyle = 'white' | 'black';
const indicatorStylePropType = PropTypes.oneOf(['white', 'black']);
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

export {
  colorsPropType,
  colors,
  colorsSelector,
  styleSelector,
  useStyles,
  useOverlayStyles,
  getStylesForTheme,
  indicatorStylePropType,
  useIndicatorStyle,
  indicatorStyleSelector,
};
