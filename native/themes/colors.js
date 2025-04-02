// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import { createSelector } from 'reselect';

import type { GlobalTheme } from 'lib/types/theme-types.js';

import { selectBackgroundIsDark } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import { useSelector } from '../redux/redux-utils.js';
import type { AppState } from '../redux/state-types.js';

const designSystemColors = Object.freeze({
  shadesWhite100: '#ffffff',
  shadesWhite90: '#f5f5f5',
  shadesWhite80: '#ebebeb',
  shadesWhite70: '#e0e0e0',
  shadesWhite60: '#cccccc',

  shadesBlack95: '#0a0a0a',
  shadesBlack90: '#191919',
  shadesBlack85: '#1f1f1f',
  shadesBlack75: '#404040',
  shadesBlack60: '#666666',
  shadesBlack50: '#808080',

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
  disabledButtonText: designSystemColors.shadesBlack50,
  disconnectedBarBackground: designSystemColors.shadesWhite90,
  editButton: '#A4A4A2',
  floatingButtonBackground: '#999999',
  floatingButtonLabel: designSystemColors.shadesWhite80,
  headerChevron: designSystemColors.shadesBlack95,
  inlineEngagementBackground: designSystemColors.shadesWhite70,
  inlineEngagementLabel: designSystemColors.shadesBlack95,
  link: designSystemColors.violetDark100,
  listBackground: designSystemColors.shadesWhite100,
  listBackgroundLabel: designSystemColors.shadesBlack95,
  listBackgroundSecondaryLabel: '#444444',
  listBackgroundTernaryLabel: '#999999',
  listChatBubble: '#F1F0F5',
  listForegroundLabel: designSystemColors.shadesBlack95,
  listForegroundSecondaryLabel: '#333333',
  listForegroundTertiaryLabel: designSystemColors.shadesBlack60,
  listInputBackground: designSystemColors.shadesWhite90,
  listInputBar: '#E2E2E2',
  listInputButton: '#8E8D92',
  listIosHighlightUnderlay: '#DDDDDDDD',
  listSearchBackground: designSystemColors.shadesWhite90,
  listSearchIcon: '#8E8D92',
  listSeparatorLabel: designSystemColors.shadesBlack60,
  modalBackground: designSystemColors.shadesWhite80,
  modalBackgroundLabel: '#333333',
  modalBackgroundSecondaryLabel: '#AAAAAA',
  modalButton: '#BBBBBB',
  modalButtonLabel: designSystemColors.shadesBlack95,
  modalContrastBackground: designSystemColors.shadesBlack95,
  modalContrastForegroundLabel: designSystemColors.shadesWhite100,
  modalContrastOpacity: 0.7,
  modalForeground: designSystemColors.shadesWhite100,
  modalForegroundBorder: designSystemColors.shadesWhite60,
  modalForegroundLabel: designSystemColors.shadesBlack95,
  modalForegroundSecondaryLabel: '#888888',
  modalForegroundTertiaryLabel: '#AAAAAA',
  modalIosHighlightUnderlay: '#CCCCCCDD',
  modalSubtext: designSystemColors.shadesWhite60,
  modalSubtextLabel: designSystemColors.shadesBlack60,
  modalInputBackground: designSystemColors.shadesWhite60,
  modalInputForeground: designSystemColors.shadesWhite90,
  modalKnob: designSystemColors.shadesWhite90,
  modalAccentBackground: designSystemColors.shadesWhite90,
  navigationCard: designSystemColors.shadesWhite100,
  navigationChevron: designSystemColors.shadesWhite60,
  panelBackground: designSystemColors.shadesWhite90,
  panelBackgroundLabel: '#888888',
  panelButton: designSystemColors.shadesWhite70,
  panelForeground: designSystemColors.shadesWhite100,
  panelForegroundBorder: designSystemColors.shadesWhite60,
  panelForegroundLabel: designSystemColors.shadesBlack95,
  panelForegroundIcon: designSystemColors.shadesBlack95,
  panelForegroundSecondaryLabel: '#333333',
  panelForegroundTertiaryLabel: '#888888',
  panelInputBackground: designSystemColors.shadesWhite60,
  panelInputSecondaryForeground: designSystemColors.shadesBlack50,
  panelIosHighlightUnderlay: '#EBEBEBDD',
  panelSecondaryForeground: designSystemColors.shadesWhite80,
  panelSecondaryForegroundBorder: designSystemColors.shadesWhite70,
  panelSeparator: designSystemColors.shadesWhite60,
  purpleLink: designSystemColors.violetDark100,
  purpleButton: designSystemColors.violetDark100,
  primaryButtonToggled: designSystemColors.shadesBlack95,
  primaryButtonText: designSystemColors.shadesWhite100,
  reactionSelectionPopoverItemBackground: designSystemColors.shadesBlack75,
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
  siweButtonText: designSystemColors.shadesBlack85,
  drawerExpandButton: designSystemColors.shadesBlack50,
  drawerExpandButtonDisabled: designSystemColors.shadesWhite60,
  drawerItemLabelLevel0: designSystemColors.shadesBlack95,
  drawerItemLabelLevel1: designSystemColors.shadesBlack95,
  drawerItemLabelLevel2: designSystemColors.shadesBlack85,
  drawerOpenCommunityBackground: designSystemColors.shadesWhite90,
  drawerBackground: designSystemColors.shadesWhite100,
  subthreadsModalClose: designSystemColors.shadesBlack50,
  subthreadsModalBackground: designSystemColors.shadesWhite80,
  subthreadsModalSearch: '#00000008',
  messageLabel: designSystemColors.shadesBlack95,
  modalSeparator: designSystemColors.shadesWhite60,
  secondaryButtonBorder: designSystemColors.shadesWhite100,
  inviteLinkLinkColor: designSystemColors.shadesBlack95,
  inviteLinkButtonBackground: designSystemColors.shadesWhite60,
  greenIndicatorInner: designSystemColors.successPrimary,
  greenIndicatorOuter: designSystemColors.successDark50,
  redIndicatorInner: designSystemColors.errorPrimary,
  redIndicatorOuter: designSystemColors.errorDark50,
  deletedMessageText: designSystemColors.shadesBlack60,
  deletedMessageBackground: designSystemColors.shadesWhite90,
});
export type Colors = $Exact<typeof light>;

const dark: Colors = Object.freeze({
  blockQuoteBackground: '#A9A9A9',
  blockQuoteBorder: designSystemColors.shadesBlack50,
  codeBackground: designSystemColors.shadesBlack95,
  disabledButton: designSystemColors.shadesBlack75,
  disabledButtonText: designSystemColors.shadesBlack50,
  disconnectedBarBackground: designSystemColors.shadesBlack85,
  editButton: designSystemColors.shadesBlack60,
  floatingButtonBackground: designSystemColors.shadesBlack60,
  floatingButtonLabel: designSystemColors.shadesWhite100,
  headerChevron: designSystemColors.shadesWhite100,
  inlineEngagementBackground: designSystemColors.shadesBlack60,
  inlineEngagementLabel: designSystemColors.shadesWhite100,
  link: designSystemColors.violetLight100,
  listBackground: designSystemColors.shadesBlack95,
  listBackgroundLabel: designSystemColors.shadesWhite60,
  listBackgroundSecondaryLabel: '#BBBBBB',
  listBackgroundTernaryLabel: designSystemColors.shadesBlack50,
  listChatBubble: '#26252A',
  listForegroundLabel: designSystemColors.shadesWhite100,
  listForegroundSecondaryLabel: designSystemColors.shadesWhite60,
  listForegroundTertiaryLabel: designSystemColors.shadesBlack50,
  listInputBackground: designSystemColors.shadesBlack85,
  listInputBar: designSystemColors.shadesBlack60,
  listInputButton: designSystemColors.shadesWhite60,
  listIosHighlightUnderlay: '#BBBBBB88',
  listSearchBackground: designSystemColors.shadesBlack85,
  listSearchIcon: designSystemColors.shadesWhite60,
  listSeparatorLabel: designSystemColors.shadesWhite80,
  modalBackground: designSystemColors.shadesBlack95,
  modalBackgroundLabel: designSystemColors.shadesWhite60,
  modalBackgroundSecondaryLabel: designSystemColors.shadesBlack60,
  modalButton: designSystemColors.shadesBlack60,
  modalButtonLabel: designSystemColors.shadesWhite100,
  modalContrastBackground: designSystemColors.shadesWhite100,
  modalContrastForegroundLabel: designSystemColors.shadesBlack95,
  modalContrastOpacity: 0.85,
  modalForeground: designSystemColors.shadesBlack85,
  modalForegroundBorder: designSystemColors.shadesBlack85,
  modalForegroundLabel: designSystemColors.shadesWhite100,
  modalForegroundSecondaryLabel: '#AAAAAA',
  modalForegroundTertiaryLabel: designSystemColors.shadesBlack60,
  modalIosHighlightUnderlay: '#AAAAAA88',
  modalSubtext: designSystemColors.shadesBlack75,
  modalSubtextLabel: '#AAAAAA',
  modalInputBackground: designSystemColors.shadesBlack75,
  modalInputForeground: designSystemColors.shadesBlack50,
  modalKnob: designSystemColors.shadesWhite90,
  modalAccentBackground: designSystemColors.shadesBlack90,
  navigationCard: '#2A2A2A',
  navigationChevron: designSystemColors.shadesBlack60,
  panelBackground: designSystemColors.shadesBlack95,
  panelBackgroundLabel: designSystemColors.shadesWhite60,
  panelButton: designSystemColors.shadesBlack60,
  panelForeground: designSystemColors.shadesBlack85,
  panelForegroundBorder: '#2C2C2E',
  panelForegroundLabel: designSystemColors.shadesWhite100,
  panelForegroundIcon: designSystemColors.shadesWhite100,
  panelForegroundSecondaryLabel: designSystemColors.shadesWhite60,
  panelForegroundTertiaryLabel: '#AAAAAA',
  panelInputBackground: designSystemColors.shadesBlack75,
  panelInputSecondaryForeground: designSystemColors.shadesBlack50,
  panelIosHighlightUnderlay: '#313035',
  panelSecondaryForeground: designSystemColors.shadesBlack75,
  panelSecondaryForegroundBorder: designSystemColors.shadesBlack60,
  panelSeparator: designSystemColors.shadesBlack75,
  purpleLink: designSystemColors.violetLight100,
  purpleButton: designSystemColors.violetDark100,
  primaryButtonToggled: designSystemColors.shadesWhite100,
  primaryButtonText: designSystemColors.shadesBlack95,
  reactionSelectionPopoverItemBackground: designSystemColors.shadesBlack75,
  redText: designSystemColors.errorPrimary,
  spoiler: designSystemColors.spoilerColor,
  tabBarAccent: designSystemColors.violetLight100,
  tabBarBackground: designSystemColors.shadesBlack95,
  tabBarActiveTintColor: designSystemColors.violetLight100,
  vibrantGreenButton: designSystemColors.successPrimary,
  vibrantRedButton: designSystemColors.errorPrimary,
  whiteText: designSystemColors.shadesWhite100,
  tooltipBackground: designSystemColors.shadesBlack85,
  logInSpacer: '#FFFFFF33',
  siweButton: designSystemColors.shadesWhite100,
  siweButtonText: designSystemColors.shadesBlack85,
  drawerExpandButton: designSystemColors.shadesBlack50,
  drawerExpandButtonDisabled: designSystemColors.shadesBlack75,
  drawerItemLabelLevel0: designSystemColors.shadesWhite60,
  drawerItemLabelLevel1: designSystemColors.shadesWhite60,
  drawerItemLabelLevel2: designSystemColors.shadesWhite90,
  drawerOpenCommunityBackground: designSystemColors.shadesBlack90,
  drawerBackground: designSystemColors.shadesBlack85,
  subthreadsModalClose: designSystemColors.shadesBlack50,
  subthreadsModalBackground: designSystemColors.shadesBlack85,
  subthreadsModalSearch: '#FFFFFF04',
  typeaheadTooltipBackground: '#1F1F1f',
  typeaheadTooltipBorder: designSystemColors.shadesBlack75,
  typeaheadTooltipText: 'white',
  messageLabel: designSystemColors.shadesWhite60,
  modalSeparator: designSystemColors.shadesBlack75,
  secondaryButtonBorder: designSystemColors.shadesWhite100,
  inviteLinkLinkColor: designSystemColors.shadesWhite80,
  inviteLinkButtonBackground: designSystemColors.shadesBlack75,
  greenIndicatorInner: designSystemColors.successPrimary,
  greenIndicatorOuter: designSystemColors.successDark90,
  redIndicatorInner: designSystemColors.errorPrimary,
  redIndicatorOuter: designSystemColors.errorDark90,
  deletedMessageText: designSystemColors.shadesWhite60,
  deletedMessageBackground: designSystemColors.shadesBlack90,
});
const colors = { light, dark };

const colorsSelector: (state: AppState) => Colors = createSelector(
  (state: AppState) => state.globalThemeInfo.activeTheme,
  (theme: ?GlobalTheme) => {
    const explicitTheme = theme ? theme : 'light';
    return colors[explicitTheme];
  },
);

const magicStrings = new Set<string>();
for (const theme in colors) {
  for (const magicString in colors[theme]) {
    magicStrings.add(magicString);
  }
}

type Styles = { [name: string]: { [field: string]: mixed } };

type ReplaceField = (input: any) => any;
export type StyleSheetOf<S: Styles> = $ReadOnly<$ObjMap<S, ReplaceField>>;

function stylesFromColors<IS: Styles>(
  obj: IS,
  themeColors: Colors,
): StyleSheetOf<IS> {
  const result: Styles = {};
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
