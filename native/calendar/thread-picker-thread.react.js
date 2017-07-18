// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import PropTypes from 'prop-types';

import Button from '../components/button.react';

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
    const colorSplotchStyle = {
      backgroundColor: `#${this.props.threadInfo.color}`,
    };
    return (
      <Button onSubmit={this.onPress}>
        <View style={styles.container}>
          <View style={[styles.colorSplotch, colorSplotchStyle]} />
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
  colorSplotch: {
    height: 25,
    width: 25,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#777777',
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
