// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { NavigationParams } from 'react-navigation';
import type { AppState } from '../../redux-setup';

import React from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';
import PropTypes from 'prop-types';

import { connect } from 'lib/utils/redux-utils';

import { MessageListRouteName } from '../message-list.react';
import Button from '../../components/button.react';
import ColorSplotch from '../../components/color-splotch.react';
import ThreadVisibility from '../../components/thread-visibility.react';
import { ThreadSettingsRouteName } from './thread-settings.react';
import { assertNavigationRouteNotLeafNode } from '../../utils/navigation-utils';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: (
    routeName: string,
    params?: NavigationParams,
  ) => bool,
  lastListItem: bool,
  // Redux state
  threadSettingsActive: bool,
|};
class ThreadSettingsChildThread extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    lastListItem: PropTypes.bool.isRequired,
    threadSettingsActive: PropTypes.bool.isRequired,
  };

  render() {
    const lastButtonStyle = this.props.lastListItem ? styles.lastButton : null;
    return (
      <View style={styles.container}>
        <Button onPress={this.onPress} style={[styles.button, lastButtonStyle]}>
          <View style={styles.leftSide}>
            <ColorSplotch color={this.props.threadInfo.color} />
            <Text style={styles.text} numberOfLines={1}>
              {this.props.threadInfo.uiName}
            </Text>
          </View>
          <ThreadVisibility
            visibilityRules={this.props.threadInfo.visibilityRules}
            color="#333333"
            includeLabel={false}
          />
        </Button>
      </View>
    );
  }

  onPress = () => {
    if (!this.props.threadSettingsActive) {
      return;
    }
    this.props.navigate(
      MessageListRouteName,
      { threadInfo: this.props.threadInfo },
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    backgroundColor: "white",
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
  },
  leftSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    fontSize: 16,
    color: "#036AFF",
    paddingLeft: 8,
  },
  lastButton: {
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
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
        currentChatSubroute.routeName === ThreadSettingsRouteName,
    };
  },
)(ThreadSettingsChildThread);
