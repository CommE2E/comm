// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

import Button from '../components/button.react';
import ColorSplotch from '../components/color-splotch.react';

class ThreadPickerThread extends React.PureComponent {

  props: {
    threadInfo: ThreadInfo,
    threadPicked: (threadID: string) => void,
  };
  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    threadPicked: PropTypes.func.isRequired,
  };

  onPress = () => {
    this.props.threadPicked(this.props.threadInfo.id);
  }

  render() {
    return (
      <Button
        onPress={this.onPress}
        androidBorderlessRipple={true}
        iosFormat="highlight"
        iosActiveOpacity={0.85}
      >
        <View style={styles.container}>
          <ColorSplotch color={this.props.threadInfo.color} />
          <Text style={styles.text}>{this.props.threadInfo.name}</Text>
        </View>
      </Button>
    );
  }

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    paddingLeft: 10,
    paddingTop: 5,
    paddingBottom: 5,
  },
  text: {
    paddingTop: 2,
    paddingLeft: 10,
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
});

export default ThreadPickerThread;
