// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../../redux-setup';
import type { NavigationParams } from 'react-navigation';

import React from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';
import PropTypes from 'prop-types';

import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';

import Button from '../../components/button.react';
import { MessageListRouteName } from '../message-list.react';
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
  // Redux state
  parentThreadInfo?: ?ThreadInfo,
  threadSettingsActive: bool,
|};
class ThreadSettingsParent extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    parentThreadInfo: threadInfoPropType,
    threadSettingsActive: PropTypes.bool.isRequired,
  };

  render() {
    let parent;
    if (this.props.parentThreadInfo) {
      parent = (
        <Button onPress={this.onPressParentThread} style={styles.currentValue}>
          <Text
            style={[styles.currentValueText, styles.parentThreadLink]}
            numberOfLines={1}
          >
            {this.props.parentThreadInfo.uiName}
          </Text>
        </Button>
      );
    } else if (this.props.threadInfo.parentThreadID) {
      parent = (
        <Text style={[
          styles.currentValue,
          styles.currentValueText,
          styles.noParent,
        ]}>
          Secret parent
        </Text>
      );
    } else {
      parent = (
        <Text style={[
          styles.currentValue,
          styles.currentValueText,
          styles.noParent,
        ]}>
          No parent
        </Text>
      );
    }
    return (
      <View style={styles.row}>
        <Text style={styles.label}>
          Parent
        </Text>
        {parent}
      </View>
    );
  }

  onPressParentThread = () => {
    if (!this.props.threadSettingsActive) {
      return;
    }
    this.props.navigate(
      MessageListRouteName,
      { threadInfo: this.props.parentThreadInfo },
    );
  }

}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    backgroundColor: "white",
  },
  label: {
    fontSize: 16,
    width: 96,
    color: "#888888",
    paddingVertical: 4,
  },
  currentValue: {
    flex: 1,
    paddingLeft: 4,
    paddingTop: Platform.OS === "ios" ? 5 : 4,
  },
  currentValueText: {
    paddingRight: 0,
    margin: 0,
    fontSize: 16,
    color: "#333333",
    fontFamily: 'Arial',
  },
  noParent: {
    fontStyle: 'italic',
    paddingLeft: 2,
  },
  parentThreadLink: {
    color: "#036AFF",
  },
});

export default connect(
  (state: AppState, ownProps: { threadInfo: ThreadInfo }) => {
    const parsedThreadInfos = threadInfoSelector(state);
    const parentThreadInfo: ?ThreadInfo = ownProps.threadInfo.parentThreadID
      ? parsedThreadInfos[ownProps.threadInfo.parentThreadID]
      : null;
    const appRoute =
      assertNavigationRouteNotLeafNode(state.navInfo.navigationState.routes[0]);
    const chatRoute = assertNavigationRouteNotLeafNode(appRoute.routes[1]);
    const currentChatSubroute = chatRoute.routes[chatRoute.index];
    return {
      parentThreadInfo,
      threadSettingsActive:
        currentChatSubroute.routeName === ThreadSettingsRouteName &&
        getThreadIDFromParams(currentChatSubroute) === ownProps.threadInfo.id,
    };
  },
)(ThreadSettingsParent);
