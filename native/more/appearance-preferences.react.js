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
import type { Styles } from '../types/styles';

import * as React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Icon from 'react-native-vector-icons/Ionicons';

import { connect } from 'lib/utils/redux-utils';

import Button from '../components/button.react';
import { colors, styleSelector } from '../themes/colors';

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
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class AppearancePreferences extends React.PureComponent<Props> {

  static propTypes = {
    globalThemeInfo: globalThemeInfoPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "Appearance",
  };

  render() {
    const isDark = this.props.globalThemeInfo.activeTheme === 'dark';
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
          style={this.props.styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={iosHighlightUnderlay}
          key={`button_${themePreference}`}
        >
          <Text style={this.props.styles.option}>{text}</Text>
          {icon}
        </Button>
      );
      if (i + 1 < optionTexts.length) {
        options.push(
          <View
            style={this.props.styles.hr}
            key={`hr_${themePreference}`}
          />
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
    const theme = themePreference === 'system'
      ? this.props.globalThemeInfo.systemTheme
      : themePreference;
    this.props.dispatchActionPayload(
      updateThemeInfoActionType,
      { preference: themePreference, activeTheme: theme },
    );
  }

}

const styles = {
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  scrollView: {
    backgroundColor: 'background',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: 'backgroundLabel',
  },
  section: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    marginBottom: 24,
    paddingVertical: 2,
    backgroundColor: 'foreground',
    borderColor: 'foregroundBorder',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  option: {
    fontSize: 16,
    color: 'foregroundLabel',
  },
  icon: {
    lineHeight: Platform.OS === "ios" ? 18 : 20,
  },
  hr: {
    height: 1,
    marginHorizontal: 15,
    backgroundColor: 'foregroundBorder',
  },
};
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState) => ({
    globalThemeInfo: state.globalThemeInfo,
    styles: stylesSelector(state),
  }),
  null,
  true,
)(AppearancePreferences);
