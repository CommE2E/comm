// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
} from 'lib/types/thread-types';
import type { NavigationParams } from 'react-navigation';
import type { AppState } from '../../redux-setup';

import React from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import Button from '../../components/button.react';
import { DeleteThreadRouteName } from './delete-thread.react';
import { ThreadSettingsRouteName } from './thread-settings.react';
import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromParams,
} from '../../utils/navigation-utils';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: (
    routeName: string,
    params?: NavigationParams,
  ) => bool,
  canLeaveThread: bool,
  // Redux state
  threadSettingsActive: bool,
|};
class ThreadSettingsDeleteThread extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    canLeaveThread: PropTypes.bool.isRequired,
    threadSettingsActive: PropTypes.bool.isRequired,
  };

  render() {
    const borderStyle = this.props.canLeaveThread ? styles.border : null;
    return (
      <View style={styles.container}>
        <Button
          onPress={this.onPress}
          style={[styles.button, borderStyle]}
          iosFormat="highlight"
          iosHighlightUnderlayColor="#EEEEEEDD"
        >
          <Text style={styles.text}>Delete thread...</Text>
        </Button>
      </View>
    );
  }

  onPress = () => {
    if (!this.props.threadSettingsActive) {
      return;
    }
    this.props.navigate(
      DeleteThreadRouteName,
      { threadInfo: this.props.threadInfo },
    );
  }

}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "white",
    paddingHorizontal: 12,
  },
  button: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 14 : 12,
  },
  text: {
    fontSize: 16,
    color: "#AA0000",
    flex: 1,
  },
  border: {
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
  },
});

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    const appRoute =
      assertNavigationRouteNotLeafNode(state.navInfo.navigationState.routes[0]);
    const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);
    const currentChatSubroute = chatRoute.routes[chatRoute.index];
    return {
      threadSettingsActive:
        currentChatSubroute.routeName === ThreadSettingsRouteName &&
        getThreadIDFromParams(currentChatSubroute) === ownProps.threadInfo.id,
    };
  },
)(ThreadSettingsDeleteThread);
