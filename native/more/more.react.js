// @flow

import type { NavigationScreenProp } from 'react-navigation';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { AppState } from '../redux-setup';
import type { CalendarInfo } from 'lib/types/calendar-types';

import React from 'react';
import { View, StyleSheet, Text, Button } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { connect } from 'react-redux';

import { registerFetchKey } from 'lib/reducers/loading-reducer';
import {
  includeDispatchActionProps,
  bindServerCalls,
} from 'lib/utils/action-utils';
import { logOutActionType, logOut } from 'lib/actions/user-actions';

import ConnectedStatusBar from '../connected-status-bar.react';

class More extends React.PureComponent {

  props: {
    navigation: NavigationScreenProp<*, *>,
    // Redux state
    // Redux dispatch functions
    dispatchActionPromise: DispatchActionPromise,
    // async functions that hit server APIs
    logOut: () => Promise<CalendarInfo[]>,
  };
  state: {};

  static propTypes = {
    navigation: React.PropTypes.shape({
      navigate: React.PropTypes.func.isRequired,
    }).isRequired,
    dispatchActionPromise: React.PropTypes.func.isRequired,
    logOut: React.PropTypes.func.isRequired,
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
          onPress={this.onPress}
          title="Log out"
        />
        <ConnectedStatusBar />
      </View>
    );
  }

  onPress = () => {
    this.props.dispatchActionPromise(logOutActionType, this.logOutAction());
  }

  async logOutAction() {
    await this.props.logOut();
    this.props.navigation.navigate('LoggedOutModal');
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
  }),
  includeDispatchActionProps({ dispatchActionPromise: true }),
  bindServerCalls({ logOut }),
)(More);
