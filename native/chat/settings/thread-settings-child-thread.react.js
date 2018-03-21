// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import type { NavigationParams } from 'react-navigation';

import React from 'react';
import { Text, StyleSheet, View } from 'react-native';

import { MessageListRouteName } from '../message-list.react';
import Button from '../../components/button.react';
import ColorSplotch from '../../components/color-splotch.react';
import ThreadVisibility from '../../components/thread-visibility.react';

type Props = {|
  threadInfo: ThreadInfo,
  navigate: (
    routeName: string,
    params?: NavigationParams,
  ) => bool,
|};
class ThreadSettingsChildThread extends React.PureComponent<Props> {

  render() {
    return (
      <View style={styles.container}>
        <Button onPress={this.onPress} style={styles.button}>
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
});

export default ThreadSettingsChildThread;
