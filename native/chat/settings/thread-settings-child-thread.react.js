// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import type { NavigationParams } from 'react-navigation';

import React from 'react';
import { Text, StyleSheet, View } from 'react-native';

import { MessageListRouteName } from '../message-list.react';
import Button from '../../components/button.react';
import ColorSplotch from '../../components/color-splotch.react';

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
          <Text style={styles.text} numberOfLines={1}>
            {this.props.threadInfo.uiName}
          </Text>
          <ColorSplotch color={this.props.threadInfo.color} />
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
    flexDirection: 'row',
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
    backgroundColor: "white",
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 6,
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 16,
    color: "#036AFF",
  },
});

export default ThreadSettingsChildThread;
