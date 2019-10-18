// @flow

import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type { AppState } from '../redux/redux-setup';
import {
  type GlobalThemePreference,
  type GlobalThemeInfo,
  globalThemeInfoPropType,
  osCanTheme,
} from '../types/themes';
import { updateThemeInfoActionType } from '../redux/action-types';

import * as React from 'react';
import { StyleSheet, View, Text, ScrollView, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/Ionicons';

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import colors from '../themes/colors';

const CheckIcon = (props: {||}) => (
  <Icon
    name="md-checkmark"
    size={20}
    color="#008800"
    style={styles.icon}
  />
);

type OptionText = {|
  themePreference: GlobalThemePreference,
  text: string,
|};
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

type Props = {|
  // Redux state
  globalThemeInfo: GlobalThemeInfo,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class AppearancePreferences extends React.PureComponent<Props> {

  static propTypes = {
    globalThemeInfo: globalThemeInfoPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "Appearance",
  };

  render() {
    const isDark = this.props.globalThemeInfo.activeTheme === 'dark';
    const scrollViewStyle = isDark
      ? styles.scrollViewDark
      : styles.scrollViewLight;
    const headerStyle = isDark
      ? [ styles.header, styles.headerDark ]
      : [ styles.header, styles.headerLight ];
    const sectionStyle = isDark
      ? [ styles.section, styles.sectionDark ]
      : [ styles.section, styles.sectionLight ];
    const hrStyle = isDark
      ? [ styles.hr, styles.hrDark ]
      : [ styles.hr, styles.hrLight ];
    const optionStyle = isDark
      ? [ styles.option, styles.optionDark ]
      : [ styles.option, styles.optionLight ];
    const { iosHighlightUnderlay } = isDark ? colors.dark : colors.light;

    const options = [];
    for (let i = 0; i < optionTexts.length; i++) {
      const { themePreference, text } = optionTexts[i];
      const icon = themePreference === this.props.globalThemeInfo.preference
        ? <CheckIcon />
        : null;
      options.push(
        <Button
          onPress={() => this.onSelectThemePreference(themePreference)}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={iosHighlightUnderlay}
          key={`button_${themePreference}`}
        >
          <Text style={optionStyle}>{text}</Text>
          {icon}
        </Button>
      );
      if (i + 1 < optionTexts.length) {
        options.push(<View style={hrStyle} key={`hr_${themePreference}`} />);
      }
    }

    return (
      <ScrollView
        contentContainerStyle={styles.scrollViewContentContainer}
        style={scrollViewStyle}
      >
        <Text style={headerStyle}>APP THEME</Text>
        <View style={sectionStyle}>{options}</View>
      </ScrollView>
    );
  }

  onSelectThemePreference = (themePreference: GlobalThemePreference) => {
    if (themePreference === this.props.globalThemeInfo.preference) {
      return;
    }
    const theme = themePreference === 'system'
      ? this.props.globalThemeInfo.systemTheme
      : themePreference;
    this.props.dispatchActionPayload(
      updateThemeInfoActionType,
      { preference: themePreference, activeTheme: theme },
    );
  }

}

const styles = StyleSheet.create({
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  scrollViewLight: {
    backgroundColor: colors.light.background,
  },
  scrollViewDark: {
    backgroundColor: colors.dark.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
  },
  headerLight: {
    color: colors.light.backgroundLabel,
  },
  headerDark: {
    color: colors.dark.backgroundLabel,
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 24,
    paddingVertical: 2,
  },
  sectionLight: {
    backgroundColor: colors.light.foreground,
    borderColor: colors.light.foregroundBorder,
  },
  sectionDark: {
    backgroundColor: colors.dark.foreground,
    borderColor: colors.dark.foregroundBorder,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  option: {
    fontSize: 16,
  },
  optionLight: {
    color: colors.light.foregroundLabel,
  },
  optionDark: {
    color: colors.dark.foregroundLabel,
  },
  icon: {
    lineHeight: Platform.OS === "ios" ? 18 : 20,
  },
  hr: {
    height: 1,
    marginHorizontal: 15,
  },
  hrLight: {
    backgroundColor: colors.light.foregroundBorder,
  },
  hrDark: {
    backgroundColor: colors.dark.foregroundBorder,
  },
});

export default connect(
  (state: AppState) => ({
    globalThemeInfo: state.globalThemeInfo,
  }),
  null,
  true,
)(AppearancePreferences);
