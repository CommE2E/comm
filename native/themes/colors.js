// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import { createSelector } from 'reselect';

import { selectBackgroundIsDark } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';
import type { AppState } from '../redux/state-types.js';
import type { GlobalTheme } from '../types/themes.js';

const light = Object.freeze({
  blockQuoteBackground: '#E0E0E0',
  blockQuoteBorder: '#CCCCCC',
  codeBackground: '#E0E0E0',
  disabledButton: '#E0E0E0',
  disconnectedBarBackground: '#F5F5F5',
  editButton: '#A4A4A2',
  floatingButtonBackground: '#999999',
  floatingButtonLabel: '#EBEBEB',
  headerChevron: '#0A0A0A',
  inlineEngagementBackground: '#E0E0E0',
  inlineEngagementLabel: '#0A0A0A',
  link: '#7E57C2',
  listBackground: '#FFFFFF',
  listBackgroundLabel: '#0A0A0A',
  listBackgroundSecondaryLabel: '#444444',
  listBackgroundTernaryLabel: '#999999',
  listChatBubble: '#F1F0F5',
  listForegroundLabel: '#0A0A0A',
  listForegroundSecondaryLabel: '#333333',
  listForegroundTertiaryLabel: '#666666',
  listInputBackground: '#F5F5F5',
  listInputBar: '#E2E2E2',
  listInputButton: '#8E8D92',
  listIosHighlightUnderlay: '#DDDDDDDD',
  listSearchBackground: '#F5F5F5',
  listSearchIcon: '#8E8D92',
  listSeparatorLabel: '#666666',
  modalBackground: '#EBEBEB',
  modalBackgroundLabel: '#333333',
  modalBackgroundSecondaryLabel: '#AAAAAA',
  modalButton: '#BBBBBB',
  modalButtonLabel: '#0A0A0A',
  modalContrastBackground: '#0A0A0A',
  modalContrastForegroundLabel: '#FFFFFF',
  modalContrastOpacity: 0.7,
  modalForeground: '#FFFFFF',
  modalForegroundBorder: '#CCCCCC',
  modalForegroundLabel: '#0A0A0A',
  modalForegroundSecondaryLabel: '#888888',
  modalForegroundTertiaryLabel: '#AAAAAA',
  modalIosHighlightUnderlay: '#CCCCCCDD',
  modalSubtext: '#CCCCCC',
  modalSubtextLabel: '#666666',
  navigationCard: '#FFFFFF',
  navigationChevron: '#CCCCCC',
  panelBackground: '#F5F5F5',
  panelBackgroundLabel: '#888888',
  panelForeground: '#FFFFFF',
  panelForegroundBorder: '#CCCCCC',
  panelForegroundLabel: '#0A0A0A',
  panelForegroundSecondaryLabel: '#333333',
  panelForegroundTertiaryLabel: '#888888',
  panelIosHighlightUnderlay: '#EBEBEBDD',
  panelSecondaryForeground: '#F5F5F5',
  panelSecondaryForegroundBorder: '#CCCCCC',
  purpleLink: '#7E57C2',
  purpleButton: '#7E57C2',
  reactionSelectionPopoverItemBackground: '#404040',
  redText: '#F53100',
  spoiler: '#33332C',
  tabBarAccent: '#7E57C2',
  tabBarBackground: '#F5F5F5',
  tabBarActiveTintColor: '#7E57C2',
  vibrantGreenButton: '#00C853',
  vibrantRedButton: '#F53100',
  tooltipBackground: '#E0E0E0',
  logInSpacer: '#FFFFFF33',
  logInText: '#FFFFFF',
  siweButton: '#FFFFFF',
  siweButtonText: '#1F1F1F',
  drawerExpandButton: '#808080',
  drawerExpandButtonDisabled: '#CCCCCC',
  drawerItemLabelLevel0: '#0A0A0A',
  drawerItemLabelLevel1: '#0A0A0A',
  drawerItemLabelLevel2: '#1F1F1F',
  drawerOpenCommunityBackground: '#F5F5F5',
  drawerBackground: '#FFFFFF',
  subthreadsModalClose: '#808080',
  subthreadsModalBackground: '#EBEBEB',
  subthreadsModalSearch: '#00000008',
  messageLabel: '#0A0A0A',
  editEmojiText: '#7E57C2',
  saveAvatarButton: '#7E57C2',
  saveAvatarButtonText: '#FFFFFF',
  resetAvatarButtonText: '#B62602',
});
export type Colors = $Exact<typeof light>;

const dark: Colors = Object.freeze({
  blockQuoteBackground: '#A9A9A9',
  blockQuoteBorder: '#808080',
  codeBackground: '#0A0A0A',
  disabledButton: '#404040',
  disconnectedBarBackground: '#1F1F1F',
  editButton: '#666666',
  floatingButtonBackground: '#666666',
  floatingButtonLabel: '#FFFFFF',
  headerChevron: '#FFFFFF',
  inlineEngagementBackground: '#666666',
  inlineEngagementLabel: '#FFFFFF',
  link: '#AE94DB',
  listBackground: '#0A0A0A',
  listBackgroundLabel: '#CCCCCC',
  listBackgroundSecondaryLabel: '#BBBBBB',
  listBackgroundTernaryLabel: '#808080',
  listChatBubble: '#26252A',
  listForegroundLabel: '#FFFFFF',
  listForegroundSecondaryLabel: '#CCCCCC',
  listForegroundTertiaryLabel: '#808080',
  listInputBackground: '#1F1F1F',
  listInputBar: '#666666',
  listInputButton: '#CCCCCC',
  listIosHighlightUnderlay: '#BBBBBB88',
  listSearchBackground: '#1F1F1F',
  listSearchIcon: '#CCCCCC',
  listSeparatorLabel: '#EBEBEB',
  modalBackground: '#0A0A0A',
  modalBackgroundLabel: '#CCCCCC',
  modalBackgroundSecondaryLabel: '#666666',
  modalButton: '#666666',
  modalButtonLabel: '#FFFFFF',
  modalContrastBackground: '#FFFFFF',
  modalContrastForegroundLabel: '#0A0A0A',
  modalContrastOpacity: 0.85,
  modalForeground: '#1F1F1F',
  modalForegroundBorder: '#1F1F1F',
  modalForegroundLabel: '#FFFFFF',
  modalForegroundSecondaryLabel: '#AAAAAA',
  modalForegroundTertiaryLabel: '#666666',
  modalIosHighlightUnderlay: '#AAAAAA88',
  modalSubtext: '#404040',
  modalSubtextLabel: '#AAAAAA',
  navigationCard: '#2A2A2A',
  navigationChevron: '#666666',
  panelBackground: '#0A0A0A',
  panelBackgroundLabel: '#CCCCCC',
  panelForeground: '#1F1F1F',
  panelForegroundBorder: '#2C2C2E',
  panelForegroundLabel: '#FFFFFF',
  panelForegroundSecondaryLabel: '#CCCCCC',
  panelForegroundTertiaryLabel: '#AAAAAA',
  panelIosHighlightUnderlay: '#313035',
  panelSecondaryForeground: '#333333',
  panelSecondaryForegroundBorder: '#666666',
  purpleLink: '#AE94DB',
  purpleButton: '#7E57C2',
  reactionSelectionPopoverItemBackground: '#404040',
  redText: '#F53100',
  spoiler: '#33332C',
  tabBarAccent: '#AE94DB',
  tabBarBackground: '#0A0A0A',
  tabBarActiveTintColor: '#AE94DB',
  vibrantGreenButton: '#00C853',
  vibrantRedButton: '#F53100',
  tooltipBackground: '#1F1F1F',
  logInSpacer: '#FFFFFF33',
  logInText: '#FFFFFF',
  siweButton: '#FFFFFF',
  siweButtonText: '#1F1F1F',
  drawerExpandButton: '#808080',
  drawerExpandButtonDisabled: '#404040',
  drawerItemLabelLevel0: '#CCCCCC',
  drawerItemLabelLevel1: '#CCCCCC',
  drawerItemLabelLevel2: '#F5F5F5',
  drawerOpenCommunityBackground: '#191919',
  drawerBackground: '#1F1F1F',
  subthreadsModalClose: '#808080',
  subthreadsModalBackground: '#1F1F1F',
  subthreadsModalSearch: '#FFFFFF04',
  typeaheadTooltipBackground: '#1F1F1f',
  typeaheadTooltipBorder: '#404040',
  typeaheadTooltipText: 'white',
  messageLabel: '#CCCCCC',
  editEmojiText: '#7E57C2',
  saveAvatarButton: '#7E57C2',
  saveAvatarButtonText: '#FFFFFF',
  resetAvatarButtonText: '#B62602',
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
  return React.useMemo(
    () => stylesFromColors(obj, ourColors),
    [obj, ourColors],
  );
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

  return React.useMemo(
    () => stylesFromColors(obj, colors[syntheticTheme]),
    [obj, syntheticTheme],
  );
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
const indicatorStyleSelector: (state: AppState) => IndicatorStyle =
  createSelector(
    (state: AppState) => state.globalThemeInfo.activeTheme,
    (theme: ?GlobalTheme) => {
      return theme && theme === 'dark' ? 'white' : 'black';
    },
  );

export type KeyboardAppearance = 'default' | 'light' | 'dark';
const keyboardAppearanceSelector: (state: AppState) => KeyboardAppearance =
  createSelector(
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
