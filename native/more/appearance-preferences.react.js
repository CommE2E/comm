// @flow

import type { DispatchActionPayload } from 'lib/utils/action-utils';
import { connect } from 'lib/utils/redux-utils';
import PropTypes from 'prop-types';
import * as React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

import Button from '../components/button.react';
import { updateThemeInfoActionType } from '../redux/action-types';
import type { AppState } from '../redux/redux-setup';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';
import {
  type GlobalThemePreference,
  type GlobalThemeInfo,
  globalThemeInfoPropType,
  osCanTheme,
} from '../types/themes';

const CheckIcon = () => (
  <Icon name="md-checkmark" size={20} color="#008800" style={styles.icon} />
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
  styles: typeof styles,
  colors: Colors,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class AppearancePreferences extends React.PureComponent<Props> {
  static propTypes = {
    globalThemeInfo: globalThemeInfoPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    colors: colorsPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };

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
    this.props.dispatchActionPayload(updateThemeInfoActionType, {
      preference: themePreference,
      activeTheme: theme,
    });
  };
}

const styles = {
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
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState) => ({
    globalThemeInfo: state.globalThemeInfo,
    colors: colorsSelector(state),
    styles: stylesSelector(state),
  }),
  null,
  true,
)(AppearancePreferences);
