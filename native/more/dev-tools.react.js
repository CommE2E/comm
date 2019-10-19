// @flow

import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';
import type { Styles } from '../types/styles';
import { type GlobalTheme, globalThemePropType } from '../types/themes';

import * as React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';
import ExitApp from 'react-native-exit-app';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { setURLPrefix } from 'lib/utils/url-utils';
import sleep from 'lib/utils/sleep';

import Button from '../components/button.react';
import { getPersistor } from '../redux/persist';
import { serverOptions } from '../utils/url-utils';
import { CustomServerModalRouteName } from '../navigation/route-names';
import { colors, styleSelector } from '../themes/colors';

const ServerIcon = (props: {||}) => (
  <Icon
    name="md-checkmark"
    size={20}
    color="#008800"
    style={styles.icon}
  />
);

type Props = {|
  navigation: NavigationScreenProp<NavigationLeafRoute>,
  // Redux state
  urlPrefix: string,
  customServer: ?string,
  activeTheme: ?GlobalTheme,
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class DevTools extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    urlPrefix: PropTypes.string.isRequired,
    customServer: PropTypes.string,
    activeTheme: globalThemePropType,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "Developer tools",
  };

  render() {
    const isDark = this.props.activeTheme === 'dark';
    const { iosHighlightUnderlay } = isDark ? colors.dark : colors.light;

    const serverButtons = [];
    for (let server of serverOptions) {
      const icon = server === this.props.urlPrefix
        ? <ServerIcon />
        : null;
      serverButtons.push(
        <Button
          onPress={() => this.onSelectServer(server)}
          style={this.props.styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={iosHighlightUnderlay}
          key={`server${server}`}
        >
          <Text style={this.props.styles.serverText}>{server}</Text>
          {icon}
        </Button>
      );
      serverButtons.push(
        <View style={this.props.styles.hr} key={`hr${server}`} />
      );
    }
    const customServerLabel = this.props.customServer
      ? (
          <Text>
            <Text style={this.props.styles.customServerLabel}>
              {"custom: "}
            </Text>
            <Text style={this.props.styles.serverText}>
              {this.props.customServer}
            </Text>
          </Text>
        )
      : (
          <Text style={[
            this.props.styles.customServerLabel,
            this.props.styles.serverContainer,
          ]}>custom</Text>
        );
    const customServerIcon = this.props.customServer === this.props.urlPrefix
      ? <ServerIcon />
      : null;
    serverButtons.push(
      <Button
        onPress={this.onSelectCustomServer}
        style={this.props.styles.row}
        iosFormat="highlight"
        iosHighlightUnderlayColor={iosHighlightUnderlay}
        key="customServer"
      >
        {customServerLabel}
        {customServerIcon}
      </Button>
    );

    return (
      <View style={this.props.styles.container}>
        <ScrollView
          contentContainerStyle={this.props.styles.scrollViewContentContainer}
          style={this.props.styles.scrollView}
        >
          <View style={this.props.styles.slightlyPaddedSection}>
            <Button
              onPress={this.onPressCrash}
              style={this.props.styles.row}
              iosFormat="highlight"
              iosHighlightUnderlayColor={iosHighlightUnderlay}
            >
              <Text style={this.props.styles.redText}>Trigger a crash</Text>
            </Button>
            <View style={this.props.styles.hr} />
            <Button
              onPress={this.onPressKill}
              style={this.props.styles.row}
              iosFormat="highlight"
              iosHighlightUnderlayColor={iosHighlightUnderlay}
            >
              <Text style={this.props.styles.redText}>Kill the app</Text>
            </Button>
            <View style={this.props.styles.hr} />
            <Button
              onPress={this.onPressWipe}
              style={this.props.styles.row}
              iosFormat="highlight"
              iosHighlightUnderlayColor={iosHighlightUnderlay}
            >
              <Text style={this.props.styles.redText}>
                Wipe state and kill app
              </Text>
            </Button>
          </View>
          <Text style={this.props.styles.header}>SERVER</Text>
          <View style={this.props.styles.slightlyPaddedSection}>
            {serverButtons}
          </View>
        </ScrollView>
      </View>
    );
  }

  onPressCrash = () => {
    throw new Error("User triggered crash through dev menu!");
  }

  onPressKill = () => {
    ExitApp.exitApp();
  }

  onPressWipe = async () => {
    getPersistor().purge();
    await sleep(50);
    ExitApp.exitApp();
  }

  onSelectServer = (server: string) => {
    if (server !== this.props.urlPrefix) {
      this.props.dispatchActionPayload(setURLPrefix, server);
    }
  }

  onSelectCustomServer = () => {
    this.props.navigation.navigate(CustomServerModalRouteName);
  }

}

const styles = {
  container: {
    flex: 1,
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  scrollView: {
    backgroundColor: 'background',
  },
  slightlyPaddedSection: {
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
  redText: {
    fontSize: 16,
    color: 'redText',
    flex: 1,
  },
  hr: {
    height: 1,
    backgroundColor: 'foregroundBorder',
    marginHorizontal: 15,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: 'backgroundLabel',
  },
  customServerLabel: {
    color: 'foregroundSecondaryLabel',
    fontSize: 16,
  },
  serverText: {
    color: 'foregroundLabel',
    fontSize: 16,
  },
  serverContainer: {
    flex: 1,
  },
  icon: {
    lineHeight: Platform.OS === "ios" ? 18 : 20,
  },
};
const stylesSelector = styleSelector(styles);

export default connect(
  (state: AppState) => ({
    urlPrefix: state.urlPrefix,
    activeTheme: state.globalThemeInfo.activeTheme,
    styles: stylesSelector(state),
  }),
  null,
  true,
)(DevTools);
