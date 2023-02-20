// @flow

import * as React from 'react';
import { View, Text, Platform } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useDispatch } from 'react-redux';

import type { Dispatch } from 'lib/types/redux-types.js';

import Button from '../components/button.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { updateThemeInfoActionType } from '../redux/action-types.js';
import { useSelector } from '../redux/redux-utils.js';
import { type Colors, useColors, useStyles } from '../themes/colors.js';
import {
  type GlobalThemePreference,
  type GlobalThemeInfo,
  osCanTheme,
} from '../types/themes.js';

const CheckIcon = () => (
  <SWMansionIcon
    name="check"
    size={20}
    color="#888888"
    style={unboundStyles.icon}
  />
);

type OptionText = {
  themePreference: GlobalThemePreference,
  text: string,
};
const optionTexts: OptionText[] = [
  { themePreference: 'light', text: 'Light' },
  { themePreference: 'dark', text: 'Dark' },
];
if (osCanTheme) {
  optionTexts.push({
    themePreference: 'system',
    text: 'Follow system preferences',
  });
}

type Props = {
  +globalThemeInfo: GlobalThemeInfo,
  +styles: typeof unboundStyles,
  +colors: Colors,
  +dispatch: Dispatch,
  ...
};
class AppearancePreferences extends React.PureComponent<Props> {
  render() {
    const { panelIosHighlightUnderlay: underlay } = this.props.colors;

    const options = [];
    for (let i = 0; i < optionTexts.length; i++) {
      const { themePreference, text } = optionTexts[i];
      const icon =
        themePreference === this.props.globalThemeInfo.preference ? (
          <CheckIcon />
        ) : null;
      options.push(
        <Button
          onPress={() => this.onSelectThemePreference(themePreference)}
          style={this.props.styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={underlay}
          iosActiveOpacity={0.85}
          key={`button_${themePreference}`}
        >
          <Text style={this.props.styles.option}>{text}</Text>
          {icon}
        </Button>,
      );
      if (i + 1 < optionTexts.length) {
        options.push(
          <View style={this.props.styles.hr} key={`hr_${themePreference}`} />,
        );
      }
    }

    return (
      <ScrollView
        contentContainerStyle={this.props.styles.scrollViewContentContainer}
        style={this.props.styles.scrollView}
      >
        <Text style={this.props.styles.header}>APP THEME</Text>
        <View style={this.props.styles.section}>{options}</View>
      </ScrollView>
    );
  }

  onSelectThemePreference = (themePreference: GlobalThemePreference) => {
    if (themePreference === this.props.globalThemeInfo.preference) {
      return;
    }
    const theme =
      themePreference === 'system'
        ? this.props.globalThemeInfo.systemTheme
        : themePreference;
    this.props.dispatch({
      type: updateThemeInfoActionType,
      payload: {
        preference: themePreference,
        activeTheme: theme,
      },
    });
  };
}

const unboundStyles = {
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  hr: {
    backgroundColor: 'panelForegroundBorder',
    height: 1,
    marginHorizontal: 15,
  },
  icon: {
    lineHeight: Platform.OS === 'ios' ? 18 : 20,
  },
  option: {
    color: 'panelForegroundLabel',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingVertical: 2,
  },
};

const ConnectedAppearancePreferences: React.ComponentType<{ ... }> =
  React.memo<{ ... }>(function ConnectedAppearancePreferences(props: { ... }) {
    const globalThemeInfo = useSelector(state => state.globalThemeInfo);
    const styles = useStyles(unboundStyles);
    const colors = useColors();
    const dispatch = useDispatch();

    return (
      <AppearancePreferences
        {...props}
        globalThemeInfo={globalThemeInfo}
        styles={styles}
        colors={colors}
        dispatch={dispatch}
      />
    );
  });

export default ConnectedAppearancePreferences;
