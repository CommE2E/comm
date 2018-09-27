// @flow

import {
  type ThreadInfo,
  threadInfoPropType,
} from 'lib/types/thread-types';
import type {
  NavigationParams,
  NavigationNavigateAction,
} from 'react-navigation';

import React from 'react';
import { Text, StyleSheet, View, Platform } from 'react-native';
import PropTypes from 'prop-types';

import Button from '../../components/button.react';
import { DeleteThreadRouteName } from '../../navigation/route-names';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: ({
    routeName: string,
    params?: NavigationParams,
    action?: NavigationNavigateAction,
    key?: string,
  }) => bool,
  canLeaveThread: bool,
|};
class ThreadSettingsDeleteThread extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    navigate: PropTypes.func.isRequired,
    canLeaveThread: PropTypes.bool.isRequired,
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
    const threadInfo = this.props.threadInfo;
    this.props.navigate({
      routeName: DeleteThreadRouteName,
      params: { threadInfo },
      key: `${DeleteThreadRouteName}${threadInfo.id}`,
    });
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

export default ThreadSettingsDeleteThread;
