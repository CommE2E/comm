// @flow

import type { NavigationScreenProp } from 'react-navigation';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { PingResult, PingStartingPayload } from 'lib/types/ping-types';
import type { CalendarQuery } from 'lib/selectors/nav-selectors';

import React from 'react';
import { View, StyleSheet, Text, Button, Alert, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { registerFetchKey } from 'lib/reducers/loading-reducer';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { logOutActionType, logOut } from 'lib/actions/user-actions';
import { pingActionType, ping } from 'lib/actions/ping-actions';
import { pingStartingPayload } from 'lib/selectors/ping-selectors';

import ConnectedStatusBar from '../connected-status-bar.react';
import {
  getNativeSharedWebCredentials,
  deleteNativeCredentialsFor,
} from '../account/native-credentials';

class More extends React.PureComponent {

  props: {
    navigation: NavigationScreenProp<*, *>,
    // Redux state
    username: ?string,
    pingStartingPayload: () => PingStartingPayload,
    // Redux dispatch functions
    dispatchActionPromise: DispatchActionPromise,
    // async functions that hit server APIs
    logOut: () => Promise<ThreadInfo[]>,
    ping: (calendarQuery: CalendarQuery) => Promise<PingResult>,
  };
  state: {};

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    username: PropTypes.string,
    pingStartingPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    logOut: PropTypes.func.isRequired,
    ping: PropTypes.func.isRequired,
  };

  static navigationOptions = {
    tabBarLabel: 'More',
    tabBarIcon: ({ tintColor }) => (
      <Icon
        name="bars"
        style={[styles.icon, { color: tintColor }]}
      />
    ),
  };

  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>
          Press Cmd+R to reload,{'\n'}
          Cmd+D or shake for dev menu
        </Text>
        <Button
          onPress={this.onPressLogOut}
          title="Log out"
        />
        <Button
          onPress={this.onPressPing}
          title="Ping"
        />
        <ConnectedStatusBar />
      </View>
    );
  }

  onPressLogOut = async () => {
    const alertTitle = Platform.OS === "ios"
      ? "Keep Login Info in Keychain"
      : "Keep Login Info";
    const sharedWebCredentials = await getNativeSharedWebCredentials();
    const alertDescription = sharedWebCredentials
      ? "We will automatically fill out log-in forms with your credentials " +
        "in the app and keep them available on squadcal.org in Safari."
      : "We will automatically fill out log-in forms with your credentials " +
        "in the app.";
    Alert.alert(
      alertTitle,
      alertDescription,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Keep', onPress: this.logOutButKeepNativeCredentialsWrapper },
        {
          text: 'Remove',
          onPress: this.logOutAndDeleteNativeCredentialsWrapper,
          style: 'destructive',
        },
      ],
    );
  }

  logOutButKeepNativeCredentialsWrapper = () => {
    this.props.dispatchActionPromise(
      logOutActionType,
      this.props.logOut(),
    );
  }

  logOutAndDeleteNativeCredentialsWrapper = () => {
    this.props.dispatchActionPromise(
      logOutActionType,
      this.logOutAndDeleteNativeCredentials(),
    );
  }

  async logOutAndDeleteNativeCredentials() {
    const username = this.props.username;
    invariant(username, "can't log out if not logged in");
    await Promise.all([
      this.props.logOut(),
      deleteNativeCredentialsFor(username),
    ]);
  }

  onPressPing = () => {
    const startingPayload = this.props.pingStartingPayload();
    this.props.dispatchActionPromise(
      pingActionType,
      this.pingAction(startingPayload),
      undefined,
      startingPayload,
    );
  }

  async pingAction(startingPayload: PingStartingPayload) {
    const pingResult = await this.props.ping(startingPayload.calendarQuery);
    return {
      ...pingResult,
      loggedIn: startingPayload.loggedIn,
    };
  }

}

const styles = StyleSheet.create({
  icon: {
    fontSize: 28,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});

registerFetchKey(logOutActionType);

export default connect(
  (state: AppState) => ({
    cookie: state.cookie,
    username: state.userInfo && state.userInfo.username,
    pingStartingPayload: pingStartingPayload(state),
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ logOut, ping }),
)(More);
