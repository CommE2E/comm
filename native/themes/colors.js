// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import { createSelector } from 'reselect';

import { selectBackgroundIsDark } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';
import type { AppState } from '../redux/state-types.js';
import type { GlobalTheme } from '../types/themes.js';

const designSystemColors = Object.freeze({
  shadesWhite100: '#ffffff',
  shadesWhite90: '#f5f5f5',
  shadesWhite80: '#ebebeb',
  shadesWhite70: '#e0e0e0',
  shadesWhite60: '#cccccc',

  shadesBlack100: '#0a0a0a',
  shadesBlack90: '#1f1f1f',
  shadesBlack80: '#404040',
  shadesBlack70: '#666666',
  shadesBlack60: '#808080',

  violetDark100: '#7e57c2',
  violetDark80: '#6d49ab',
  violetDark60: '#563894',
  violetDark40: '#44297a',
  violetDark20: '#331f5c',

  violetLight100: '#ae94db',
  violetLight80: '#b9a4df',
  violetLight60: '#d3c6ec',
  violetLight40: '#e8e0f5',
  violetLight20: '#f3f0fa',

  successLight10: '#d5f6e3',
  successLight50: '#6cdf9c',
  successPrimary: '#00c853',
  successDark50: '#029841',
  successDark90: '#034920',

  errorLight10: '#feebe6',
  errorLight50: '#f9947b',
  errorPrimary: '#f53100',
  errorDark50: '#b62602',
  errorDark90: '#4f1203',

  spoilerColor: '#33332c',
});

const light = Object.freeze({
  blockQuoteBackground: designSystemColors.shadesWhite70,
  blockQuoteBorder: designSystemColors.shadesWhite60,
  codeBackground: designSystemColors.shadesWhite70,
  disabledButton: designSystemColors.shadesWhite70,
  disabledButtonText: designSystemColors.shadesBlack60,
  disconnectedBarBackground: designSystemColors.shadesWhite90,
  editButton: '#A4A4A2',
  floatingButtonBackground: '#999999',
  floatingButtonLabel: designSystemColors.shadesWhite80,
  headerChevron: designSystemColors.shadesBlack100,
  inlineEngagementBackground: designSystemColors.shadesWhite70,
  inlineEngagementLabel: designSystemColors.shadesBlack100,
  link: designSystemColors.violetDark100,
  listBackground: designSystemColors.shadesWhite100,
  listBackgroundLabel: designSystemColors.shadesBlack100,
  listBackgroundSecondaryLabel: '#444444',
  listBackgroundTernaryLabel: '#999999',
  listChatBubble: '#F1F0F5',
  listForegroundLabel: designSystemColors.shadesBlack100,
  listForegroundSecondaryLabel: '#333333',
  listForegroundTertiaryLabel: designSystemColors.shadesBlack70,
  listInputBackground: designSystemColors.shadesWhite90,
  listInputBar: '#E2E2E2',
  listInputButton: '#8E8D92',
  listIosHighlightUnderlay: '#DDDDDDDD',
  listSearchBackground: designSystemColors.shadesWhite90,
  listSearchIcon: '#8E8D92',
  listSeparatorLabel: designSystemColors.shadesBlack70,
  modalBackground: designSystemColors.shadesWhite80,
  modalBackgroundLabel: '#333333',
  modalBackgroundSecondaryLabel: '#AAAAAA',
  modalButton: '#BBBBBB',
  modalButtonLabel: designSystemColors.shadesBlack100,
  modalContrastBackground: designSystemColors.shadesBlack100,
  modalContrastForegroundLabel: designSystemColors.shadesWhite100,
  modalContrastOpacity: 0.7,
  modalForeground: designSystemColors.shadesWhite100,
  modalForegroundBorder: designSystemColors.shadesWhite60,
  modalForegroundLabel: designSystemColors.shadesBlack100,
  modalForegroundSecondaryLabel: '#888888',
  modalForegroundTertiaryLabel: '#AAAAAA',
  modalIosHighlightUnderlay: '#CCCCCCDD',
  modalSubtext: designSystemColors.shadesWhite60,
  modalSubtextLabel: designSystemColors.shadesBlack70,
  modalInputBackground: designSystemColors.shadesWhite60,
  modalInputForeground: designSystemColors.shadesWhite90,
  modalKnob: designSystemColors.shadesWhite90,
  navigationCard: designSystemColors.shadesWhite100,
  navigationChevron: designSystemColors.shadesWhite60,
  panelBackground: designSystemColors.shadesWhite90,
  panelBackgroundLabel: '#888888',
  panelButton: designSystemColors.shadesWhite70,
  panelForeground: designSystemColors.shadesWhite100,
  panelForegroundBorder: designSystemColors.shadesWhite60,
  panelForegroundLabel: designSystemColors.shadesBlack100,
  panelForegroundSecondaryLabel: '#333333',
  panelForegroundTertiaryLabel: '#888888',
  panelInputBackground: designSystemColors.shadesWhite60,
  panelInputSecondaryForeground: designSystemColors.shadesBlack60,
  panelIosHighlightUnderlay: '#EBEBEBDD',
  panelSecondaryForeground: designSystemColors.shadesWhite80,
  panelSecondaryForegroundBorder: designSystemColors.shadesWhite70,
  panelSeparator: designSystemColors.shadesWhite60,
  purpleLink: designSystemColors.violetDark100,
  purpleButton: designSystemColors.violetDark100,
  reactionSelectionPopoverItemBackground: designSystemColors.shadesBlack80,
  redText: designSystemColors.errorPrimary,
  spoiler: designSystemColors.spoilerColor,
  tabBarAccent: designSystemColors.violetDark100,
  tabBarBackground: designSystemColors.shadesWhite90,
  tabBarActiveTintColor: designSystemColors.violetDark100,
  vibrantGreenButton: designSystemColors.successPrimary,
  vibrantRedButton: designSystemColors.errorPrimary,
  whiteText: designSystemColors.shadesWhite100,
  tooltipBackground: designSystemColors.shadesWhite70,
  logInSpacer: '#FFFFFF33',
  siweButton: designSystemColors.shadesWhite100,
  siweButtonText: designSystemColors.shadesBlack90,
  drawerExpandButton: designSystemColors.shadesBlack60,
  drawerExpandButtonDisabled: designSystemColors.shadesWhite60,
  drawerItemLabelLevel0: designSystemColors.shadesBlack100,
  drawerItemLabelLevel1: designSystemColors.shadesBlack100,
  drawerItemLabelLevel2: designSystemColors.shadesBlack90,
  drawerOpenCommunityBackground: designSystemColors.shadesWhite90,
  drawerBackground: designSystemColors.shadesWhite100,
  subthreadsModalClose: designSystemColors.shadesBlack60,
  subthreadsModalBackground: designSystemColors.shadesWhite80,
  subthreadsModalSearch: '#00000008',
  messageLabel: designSystemColors.shadesBlack100,
  modalSeparator: designSystemColors.shadesWhite60,
  secondaryButtonBorder: designSystemColors.shadesWhite100,
  inviteLinkLinkColor: designSystemColors.shadesBlack100,
  inviteLinkButtonBackground: designSystemColors.shadesWhite60,
});
export type Colors = $Exact<typeof light>;

const dark: Colors = Object.freeze({
  blockQuoteBackground: '#A9A9A9',
  blockQuoteBorder: designSystemColors.shadesBlack60,
  codeBackground: designSystemColors.shadesBlack100,
  disabledButton: designSystemColors.shadesBlack80,
  disabledButtonText: designSystemColors.shadesBlack60,
  disconnectedBarBackground: designSystemColors.shadesBlack90,
  editButton: designSystemColors.shadesBlack70,
  floatingButtonBackground: designSystemColors.shadesBlack70,
  floatingButtonLabel: designSystemColors.shadesWhite100,
  headerChevron: designSystemColors.shadesWhite100,
  inlineEngagementBackground: designSystemColors.shadesBlack70,
  inlineEngagementLabel: designSystemColors.shadesWhite100,
  link: designSystemColors.violetLight100,
  listBackground: designSystemColors.shadesBlack100,
  listBackgroundLabel: designSystemColors.shadesWhite60,
  listBackgroundSecondaryLabel: '#BBBBBB',
  listBackgroundTernaryLabel: designSystemColors.shadesBlack60,
  listChatBubble: '#26252A',
  listForegroundLabel: designSystemColors.shadesWhite100,
  listForegroundSecondaryLabel: designSystemColors.shadesWhite60,
  listForegroundTertiaryLabel: designSystemColors.shadesBlack60,
  listInputBackground: designSystemColors.shadesBlack90,
  listInputBar: designSystemColors.shadesBlack70,
  listInputButton: designSystemColors.shadesWhite60,
  listIosHighlightUnderlay: '#BBBBBB88',
  listSearchBackground: designSystemColors.shadesBlack90,
  listSearchIcon: designSystemColors.shadesWhite60,
  listSeparatorLabel: designSystemColors.shadesWhite80,
  modalBackground: designSystemColors.shadesBlack100,
  modalBackgroundLabel: designSystemColors.shadesWhite60,
  modalBackgroundSecondaryLabel: designSystemColors.shadesBlack70,
  modalButton: designSystemColors.shadesBlack70,
  modalButtonLabel: designSystemColors.shadesWhite100,
  modalContrastBackground: designSystemColors.shadesWhite100,
  modalContrastForegroundLabel: designSystemColors.shadesBlack100,
  modalContrastOpacity: 0.85,
  modalForeground: designSystemColors.shadesBlack90,
  modalForegroundBorder: designSystemColors.shadesBlack90,
  modalForegroundLabel: designSystemColors.shadesWhite100,
  modalForegroundSecondaryLabel: '#AAAAAA',
  modalForegroundTertiaryLabel: designSystemColors.shadesBlack70,
  modalIosHighlightUnderlay: '#AAAAAA88',
  modalSubtext: designSystemColors.shadesBlack80,
  modalSubtextLabel: '#AAAAAA',
  modalInputBackground: designSystemColors.shadesBlack80,
  modalInputForeground: designSystemColors.shadesBlack60,
  modalKnob: designSystemColors.shadesWhite90,
  navigationCard: '#2A2A2A',
  navigationChevron: designSystemColors.shadesBlack70,
  panelBackground: designSystemColors.shadesBlack100,
  panelBackgroundLabel: designSystemColors.shadesWhite60,
  panelButton: designSystemColors.shadesBlack70,
  panelForeground: designSystemColors.shadesBlack90,
  panelForegroundBorder: '#2C2C2E',
  panelForegroundLabel: designSystemColors.shadesWhite100,
  panelForegroundSecondaryLabel: designSystemColors.shadesWhite60,
  panelForegroundTertiaryLabel: '#AAAAAA',
  panelInputBackground: designSystemColors.shadesBlack80,
  panelInputSecondaryForeground: designSystemColors.shadesBlack60,
  panelIosHighlightUnderlay: '#313035',
  panelSecondaryForeground: designSystemColors.shadesBlack80,
  panelSecondaryForegroundBorder: designSystemColors.shadesBlack70,
  panelSeparator: designSystemColors.shadesBlack80,
  purpleLink: designSystemColors.violetLight100,
  purpleButton: designSystemColors.violetDark100,
  reactionSelectionPopoverItemBackground: designSystemColors.shadesBlack80,
  redText: designSystemColors.errorPrimary,
  spoiler: designSystemColors.spoilerColor,
  tabBarAccent: designSystemColors.violetLight100,
  tabBarBackground: designSystemColors.shadesBlack100,
  tabBarActiveTintColor: designSystemColors.violetLight100,
  vibrantGreenButton: designSystemColors.successPrimary,
  vibrantRedButton: designSystemColors.errorPrimary,
  whiteText: designSystemColors.shadesWhite100,
  tooltipBackground: designSystemColors.shadesBlack90,
  logInSpacer: '#FFFFFF33',
  siweButton: designSystemColors.shadesWhite100,
  siweButtonText: designSystemColors.shadesBlack90,
  drawerExpandButton: designSystemColors.shadesBlack60,
  drawerExpandButtonDisabled: designSystemColors.shadesBlack80,
  drawerItemLabelLevel0: designSystemColors.shadesWhite60,
  drawerItemLabelLevel1: designSystemColors.shadesWhite60,
  drawerItemLabelLevel2: designSystemColors.shadesWhite90,
  drawerOpenCommunityBackground: '#191919',
  drawerBackground: designSystemColors.shadesBlack90,
  subthreadsModalClose: designSystemColors.shadesBlack60,
  subthreadsModalBackground: designSystemColors.shadesBlack90,
  subthreadsModalSearch: '#FFFFFF04',
  typeaheadTooltipBackground: '#1F1F1f',
  typeaheadTooltipBorder: designSystemColors.shadesBlack80,
  typeaheadTooltipText: 'white',
  messageLabel: designSystemColors.shadesWhite60,
  modalSeparator: designSystemColors.shadesBlack80,
  secondaryButtonBorder: designSystemColors.shadesWhite100,
  inviteLinkLinkColor: designSystemColors.shadesWhite80,
  inviteLinkButtonBackground: designSystemColors.shadesBlack80,
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
