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
import { type Colors, colorsPropType, colorsSelector } from '../themes/colors';
import Markdown from '../components/markdown.react';

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
      textCustomStyle = {},
      darkColor;
    if (isViewer) {
      const threadColor = item.threadInfo.color;
      messageStyle.backgroundColor = `#${threadColor}`;
      darkColor = colorIsDark(threadColor);
    } else {
      messageStyle.backgroundColor = this.props.colors.listChatBubble;
      darkColor = this.props.activeTheme === 'dark';
    }
    textCustomStyle.height = item.contentHeight;

    const cornerStyle = getRoundedContainerStyle(
      filterCorners(allCorners, item),
    );

    const message = (
      <TouchableOpacity
        onPress={this.props.onPress}
        onLongPress={this.props.onPress}
        activeOpacity={0.6}
        style={[styles.message, messageStyle, cornerStyle]}
      >
        <Markdown darkStyle={darkColor}>{text}</Markdown>
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

  onLayout = () => {};
}

const styles = StyleSheet.create({
  message: {
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});

export default connect((state: AppState) => ({
  activeTheme: state.globalThemeInfo.activeTheme,
  colors: colorsSelector(state),
}))(InnerTextMessage);
