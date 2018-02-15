// @flow

import type {
  StyleObj,
} from 'react-native/Libraries/StyleSheet/StyleSheetTypes';

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import React from 'react';
import PropTypes from 'prop-types';
import {
  StyleSheet,
  Text,
  ViewPropTypes,
} from 'react-native';

import Button from './button.react';
import ColorSplotch from './color-splotch.react';

type Props = {
  threadInfo: ThreadInfo,
  onSelect: (threadID: string) => void,
  style?: StyleObj,
  textStyle?: StyleObj,
};
class ThreadListThread extends React.PureComponent<Props> {

  static propTypes = {
    threadInfo: threadInfoPropType.isRequired,
    onSelect: PropTypes.func.isRequired,
    style: ViewPropTypes.style,
    textStyle: Text.propTypes.style,
  };

  render() {
    return (
      <Button
        onPress={this.onSelect}
        iosFormat="highlight"
        iosActiveOpacity={0.85}
        style={[styles.button, this.props.style]}
      >
        <ColorSplotch color={this.props.threadInfo.color} />
        <Text style={[styles.text, this.props.textStyle]} numberOfLines={1}>
          {this.props.threadInfo.uiName}
        </Text>
      </Button>
    );
  }

  onSelect = () => {
    this.props.onSelect(this.props.threadInfo.id);
  }

}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 13,
  },
  text: {
    paddingLeft: 9,
    paddingRight: 12,
    paddingVertical: 6,
    fontSize: 16,
  },
});


export default ThreadListThread;
