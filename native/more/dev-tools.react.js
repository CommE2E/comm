// @flow

import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import type {
  NavigationScreenProp,
  NavigationLeafRoute,
} from 'react-navigation';

import * as React from 'react';
import { StyleSheet, View, Text, ScrollView, Platform } from 'react-native';
import ExitApp from 'react-native-exit-app';
import Icon from 'react-native-vector-icons/Ionicons';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';
import { setURLPrefix } from 'lib/utils/url-utils';
import sleep from 'lib/utils/sleep';

import Button from '../components/button.react';
import { getPersistor } from '../persist';
import { serverOptions } from '../utils/url-utils';
import { CustomServerModalRouteName } from '../navigation/route-names';

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
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
|};
class InnerDevTools extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    urlPrefix: PropTypes.string.isRequired,
    customServer: PropTypes.string,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  static navigationOptions = {
    headerTitle: "Developer tools",
  };

  render() {
    const serverButtons = [];
    for (let server of serverOptions) {
      const icon = server === this.props.urlPrefix
        ? <ServerIcon />
        : null;
      serverButtons.push(
        <Button
          onPress={() => this.onSelectServer(server)}
          style={styles.row}
          iosFormat="highlight"
          iosHighlightUnderlayColor="#EEEEEEDD"
          key={`server${server}`}
        >
          <Text style={styles.serverText}>{server}</Text>
          {icon}
        </Button>
      );
      serverButtons.push(<View style={styles.hr} key={`hr${server}`} />);
    }
    const customServerLabel = this.props.customServer
      ? (
          <Text>
            <Text style={styles.customServerLabel}>{"custom: "}</Text>
            <Text style={styles.serverText}>{this.props.customServer}</Text>
          </Text>
        )
      : (
          <Text style={[
            styles.customServerLabel,
            styles.serverContainer,
          ]}>custom</Text>
        );
    const customServerIcon = this.props.customServer === this.props.urlPrefix
      ? <ServerIcon />
      : null;
    serverButtons.push(
      <Button
        onPress={this.onSelectCustomServer}
        style={styles.row}
        iosFormat="highlight"
        iosHighlightUnderlayColor="#EEEEEEDD"
        key="customServer"
      >
        {customServerLabel}
        {customServerIcon}
      </Button>
    );

    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollView}>
          <View style={styles.slightlyPaddedSection}>
            <Button
              onPress={this.onPressCrash}
              style={styles.row}
              iosFormat="highlight"
              iosHighlightUnderlayColor="#EEEEEEDD"
            >
              <Text style={styles.redText}>Trigger a crash</Text>
            </Button>
            <View style={styles.hr} />
            <Button
              onPress={this.onPressKill}
              style={styles.row}
              iosFormat="highlight"
              iosHighlightUnderlayColor="#EEEEEEDD"
            >
              <Text style={styles.redText}>Kill the app</Text>
            </Button>
            <View style={styles.hr} />
            <Button
              onPress={this.onPressWipe}
              style={styles.row}
              iosFormat="highlight"
              iosHighlightUnderlayColor="#EEEEEEDD"
            >
              <Text style={styles.redText}>Wipe state and kill app</Text>
            </Button>
          </View>
          <Text style={styles.header}>SERVER</Text>
          <View style={styles.slightlyPaddedSection}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    paddingTop: 24,
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
  redText: {
    fontSize: 16,
    color: "#AA0000",
    flex: 1,
  },
  hr: {
    height: 1,
    backgroundColor: "#CCCCCC",
    marginHorizontal: 15,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
  },
  customServerLabel: {
    color: "#888888",
    fontSize: 16,
  },
  serverText: {
    color: 'black',
    fontSize: 16,
  },
  serverContainer: {
    flex: 1,
  },
  icon: {
    lineHeight: Platform.OS === "ios" ? 18 : 20,
  },
});

export default connect(
  (state: AppState) => ({
    urlPrefix: state.urlPrefix,
    customServer: state.customServer,
  }),
  null,
  true,
)(InnerDevTools);
