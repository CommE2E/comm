// @flow

import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { ChatTextMessageInfoItemWithHeight } from './text-message.react';
import { type GlobalTheme, globalThemePropType } from '../types/themes';
import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import PropTypes from 'prop-types';

import { colorIsDark } from 'lib/shared/thread-utils';
import { connect } from 'lib/utils/redux-utils';

import {
  allCorners,
  filterCorners,
  getRoundedContainerStyle,
} from './rounded-corners';
import {
  type Colors,
  colorsPropType,
  colorsSelector,
  colors,
} from '../themes/colors';
import Markdown from '../markdown/markdown.react';
import { fullMarkdownRules } from '../markdown/rules.react';

function dummyNodeForTextMessageHeightMeasurement(text: string) {
  return (
    <View style={styles.dummyMessage}>
      <Markdown
        style={styles.text}
        useDarkStyle={false}
        rules={fullMarkdownRules}
      >
        {text}
      </Markdown>
    </View>
  );
}

type Props = {|
  item: ChatTextMessageInfoItemWithHeight,
  onPress: () => void,
  messageRef?: (message: ?React.ElementRef<typeof View>) => void,
  // Redux state
  activeTheme: ?GlobalTheme,
  colors: Colors,
|};
class InnerTextMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    onPress: PropTypes.func.isRequired,
    messageRef: PropTypes.func,
    activeTheme: globalThemePropType,
    colors: colorsPropType.isRequired,
  };

  render() {
    const { item } = this.props;
    const { text, creator } = item.messageInfo;
    const { isViewer } = creator;

    let messageStyle = {},
      textStyle = { ...styles.text },
      darkColor;
    if (isViewer) {
      const threadColor = item.threadInfo.color;
      messageStyle.backgroundColor = `#${threadColor}`;
      darkColor = colorIsDark(threadColor);
    } else {
      messageStyle.backgroundColor = this.props.colors.listChatBubble;
      darkColor = this.props.activeTheme === 'dark';
    }
    textStyle.color = darkColor
      ? colors.dark.listForegroundLabel
      : colors.light.listForegroundLabel;

    const cornerStyle = getRoundedContainerStyle(
      filterCorners(allCorners, item),
    );

    if (!__DEV__) {
      // We don't force view height in dev mode because we
      // want to measure it in Message to see if it's correct
      messageStyle.height = item.contentHeight;
    }

    const message = (
      <TouchableOpacity
        onPress={this.props.onPress}
        onLongPress={this.props.onPress}
        activeOpacity={0.6}
        style={[styles.message, messageStyle, cornerStyle]}
      >
        <Markdown
          style={textStyle}
          useDarkStyle={darkColor}
          rules={fullMarkdownRules}
        >
          {text}
        </Markdown>
      </TouchableOpacity>
    );

    const { messageRef } = this.props;
    if (!messageRef) {
      return message;
    }

    return (
      <View onLayout={this.onLayout} ref={messageRef}>
        {message}
      </View>
    );
  }

  // We need to set onLayout in order to allow .measure() to be on the ref
  onLayout = () => {};
}

const styles = StyleSheet.create({
  dummyMessage: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  message: {
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  text: {
    fontFamily: 'Arial',
    fontSize: 18,
  },
});

const ConnectedInnerTextMessage = connect((state: AppState) => ({
  activeTheme: state.globalThemeInfo.activeTheme,
  colors: colorsSelector(state),
}))(InnerTextMessage);

export {
  ConnectedInnerTextMessage as InnerTextMessage,
  dummyNodeForTextMessageHeightMeasurement,
};
