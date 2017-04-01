// @flow

import type { NavigationScreenProp } from 'react-navigation';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { CalendarInfo } from 'lib/types/calendar-types';

import React from 'react';
import { View, StyleSheet, Text, Button, Alert, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';
import invariant from 'invariant';

import { registerFetchKey } from 'lib/reducers/loading-reducer';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { logOutActionType, logOut } from 'lib/actions/user-actions';
import { pingActionType, ping } from 'lib/actions/ping-actions';

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
    // Redux dispatch functions
    dispatchActionPromise: DispatchActionPromise,
    // async functions that hit server APIs
    logOut: () => Promise<CalendarInfo[]>,
    ping: () => Promise<void>,
  };
  state: {};

  static propTypes = {
    navigation: React.PropTypes.shape({
      navigate: React.PropTypes.func.isRequired,
    }).isRequired,
    username: React.PropTypes.string,
    dispatchActionPromise: React.PropTypes.func.isRequired,
    logOut: React.PropTypes.func.isRequired,
    ping: React.PropTypes.func.isRequired,
  };

  static navigationOptions = {
    tabBar: {
      label: 'More',
      icon: ({ tintColor }) => (
        <Icon
          name="bars"
          style={[styles.icon, { color: tintColor }]}
        />
      ),
    },
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
        { text: 'Keep', onPress: this.logOutButKeepNativeCredentialsWrapper },
        {
          text: 'Remove',
          onPress: this.logOutAndDeleteNativeCredentialsWrapper,
          style: 'destructive',
        },
      ],
      { cancelable: false },
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
    this.props.dispatchActionPromise(
      pingActionType,
      this.props.ping(),
    );
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
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ logOut, ping }),
)(More);
