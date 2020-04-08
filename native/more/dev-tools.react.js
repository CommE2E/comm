// @flow

import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';

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
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  styleSelector,
} from '../themes/colors';

const ServerIcon = () => (
  <Icon name="md-checkmark" size={20} color="#008800" style={styles.icon} />
);

type Props = {|
  navigation: NavigationScreenProp<NavigationLeafRoute>,
  // Redux state
  urlPrefix: string,
  customServer: ?string,
  colors: Colors,
  styles: typeof styles,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class DevTools extends React.PureComponent<Props> {
  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
      state: PropTypes.shape({
        key: PropTypes.string.isRequired,
      }),
    }).isRequired,
    urlPrefix: PropTypes.string.isRequired,
    customServer: PropTypes.string,
    colors: colorsPropType.isRequired,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: 'Developer tools',
  };

  render() {
    const { panelIosHighlightUnderlay: underlay } = this.props.colors;

    const serverButtons = [];
    for (let server of serverOptions) {
      const icon = server === this.props.urlPrefix ? <ServerIcon /> : null;
      serverButtons.push(
        <Button
          onPress={() => this.onSelectServer(server)}
          style={this.props.styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor={underlay}
          key={`server${server}`}
        >
          <Text style={this.props.styles.serverText}>{server}</Text>
          {icon}
        </Button>,
      );
      serverButtons.push(
        <View style={this.props.styles.hr} key={`hr${server}`} />,
      );
    }
    const customServerLabel = this.props.customServer ? (
      <Text>
        <Text style={this.props.styles.customServerLabel}>{'custom: '}</Text>
        <Text style={this.props.styles.serverText}>
          {this.props.customServer}
        </Text>
      </Text>
    ) : (
      <Text
        style={[
          this.props.styles.customServerLabel,
          this.props.styles.serverContainer,
        ]}
      >
        custom
      </Text>
    );
    const customServerIcon =
      this.props.customServer === this.props.urlPrefix ? <ServerIcon /> : null;
    serverButtons.push(
      <Button
        onPress={this.onSelectCustomServer}
        style={this.props.styles.row}
        iosFormat="highlight"
        iosHighlightUnderlayColor={underlay}
        key="customServer"
      >
        {customServerLabel}
        {customServerIcon}
      </Button>,
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
              iosHighlightUnderlayColor={underlay}
            >
              <Text style={this.props.styles.redText}>Trigger a crash</Text>
            </Button>
            <View style={this.props.styles.hr} />
            <Button
              onPress={this.onPressKill}
              style={this.props.styles.row}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
            >
              <Text style={this.props.styles.redText}>Kill the app</Text>
            </Button>
            <View style={this.props.styles.hr} />
            <Button
              onPress={this.onPressWipe}
              style={this.props.styles.row}
              iosFormat="highlight"
              iosHighlightUnderlayColor={underlay}
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
    throw new Error('User triggered crash through dev menu!');
  };

  onPressKill = () => {
    ExitApp.exitApp();
  };

  onPressWipe = async () => {
    getPersistor().purge();
    await sleep(50);
    ExitApp.exitApp();
  };

  onSelectServer = (server: string) => {
    if (server !== this.props.urlPrefix) {
      this.props.dispatchActionPayload(setURLPrefix, server);
    }
  };

  onSelectCustomServer = () => {
    this.props.navigation.navigate(CustomServerModalRouteName, {
      presentedFrom: this.props.navigation.state.key,
    });
  };
}

const styles = {
  container: {
    flex: 1,
  },
  customServerLabel: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
  },
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
  redText: {
    color: 'redText',
    flex: 1,
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
  serverContainer: {
    flex: 1,
  },
  serverText: {
    color: 'panelForegroundLabel',
    fontSize: 16,
  },
  slightlyPaddedSection: {
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
    urlPrefix: state.urlPrefix,
    colors: colorsSelector(state),
    styles: stylesSelector(state),
  }),
  null,
  true,
)(DevTools);
