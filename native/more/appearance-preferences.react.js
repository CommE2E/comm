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
          iosHighlightUnderlayColor="#EEEEEEDD"
          key={`button_${themePreference}`}
        >
          <Text style={styles.option}>{text}</Text>
          {icon}
        </Button>
      );
      if (i + 1 < optionTexts.length) {
        options.push(<View style={styles.hr} key={`hr_${themePreference}`} />);
      }
    }
    return (
      <ScrollView contentContainerStyle={styles.scrollView}>
        <Text style={styles.header}>APP THEME</Text>
        <View style={styles.slightlyPaddedSection}>
          {options}
        </View>
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
  scrollView: {
    paddingTop: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
  },
  slightlyPaddedSection: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    marginBottom: 24,
    paddingVertical: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  option: {
    color: 'black',
    fontSize: 16,
  },
  icon: {
    lineHeight: Platform.OS === "ios" ? 18 : 20,
  },
  hr: {
    height: 1,
    backgroundColor: "#CCCCCC",
    marginHorizontal: 15,
  },
});

export default connect(
  (state: AppState) => ({
    globalThemeInfo: state.globalThemeInfo,
  }),
  null,
  true,
)(AppearancePreferences);
