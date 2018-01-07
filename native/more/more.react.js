// @flow

import type { NavigationScreenProp } from 'react-navigation';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { ThreadInfo } from 'lib/types/thread-types';
import type { PingResult, PingStartingPayload } from 'lib/types/ping-types';
import type { CalendarQuery } from 'lib/selectors/nav-selectors';
import type { LogOutResult } from 'lib/actions/user-actions';

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
import { logOutActionTypes, logOut } from 'lib/actions/user-actions';
import { pingActionTypes, ping } from 'lib/actions/ping-actions';

import {
  getNativeSharedWebCredentials,
  deleteNativeCredentialsFor,
} from '../account/native-credentials';
import { pingNativeStartingPayload } from '../selectors/ping-selectors';

type Props = {
  navigation: NavigationScreenProp<*, *>,
  // Redux state
  username: ?string,
  pingStartingPayload: () => PingStartingPayload,
  currentAsOf: number,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  logOut: () => Promise<LogOutResult>,
  ping:
    (calendarQuery: CalendarQuery, lastPing: number) => Promise<PingResult>,
};
class More extends React.PureComponent<Props> {

  static propTypes = {
    navigation: PropTypes.shape({
      navigate: PropTypes.func.isRequired,
    }).isRequired,
    username: PropTypes.string,
    pingStartingPayload: PropTypes.func.isRequired,
    currentAsOf: PropTypes.number.isRequired,
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
      logOutActionTypes,
      this.props.logOut(),
    );
  }

  logOutAndDeleteNativeCredentialsWrapper = () => {
    this.props.dispatchActionPromise(
      logOutActionTypes,
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
      pingActionTypes,
      this.pingAction(startingPayload),
      undefined,
      startingPayload,
    );
  }

  async pingAction(startingPayload: PingStartingPayload) {
    const pingResult = await this.props.ping(
      startingPayload.calendarQuery,
      this.props.currentAsOf,
    );
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

registerFetchKey(logOutActionTypes);

export default connect(
  (state: AppState) => ({
    cookie: state.cookie,
    username: state.currentUserInfo && !state.currentUserInfo.anonymous
      ? state.currentUserInfo.username
      : undefined,
    pingStartingPayload: pingNativeStartingPayload(state),
    currentAsOf: state.currentAsOf,
  }),
  includeDispatchActionProps,
  bindServerCalls({ logOut, ping }),
)(More);
