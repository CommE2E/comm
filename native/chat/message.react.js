// @flow

import type {
  ChatRobotextMessageInfoItemWithHeight,
} from './robotext-message.react';
import type {
  ChatTextMessageInfoItemWithHeight,
} from './text-message.react';
import type {
  ChatMultimediaMessageInfoItem,
} from './multimedia-message.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { Navigate } from '../navigation/route-names';
import {
  type VerticalBounds,
  verticalBoundsPropType,
} from '../types/lightbox-types';

import * as React from 'react';
import {
  View,
  LayoutAnimation,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import PropTypes from 'prop-types';
import { KeyboardUtils } from 'react-native-keyboard-input';

import { TextMessage, textMessageItemHeight } from './text-message.react';
import {
  RobotextMessage,
  robotextMessageItemHeight,
} from './robotext-message.react';
import {
  MultimediaMessage,
  multimediaMessageItemHeight,
} from './multimedia-message.react';
import Timestamp from './timestamp.react';

export type ChatMessageInfoItemWithHeight =
  | ChatRobotextMessageInfoItemWithHeight
  | ChatTextMessageInfoItemWithHeight
  | ChatMultimediaMessageInfoItem;

function messageItemHeight(
  item: ChatMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  let height = 0;
  if (item.messageShapeType === "text") {
    height += textMessageItemHeight(item, viewerID);
  } else if (item.messageShapeType === "multimedia") {
    height += multimediaMessageItemHeight(item, viewerID);
  } else {
    height += robotextMessageItemHeight(item, viewerID);
  }
  if (item.startsConversation) {
    height += 27; // for time bar
  }
  return height;
}

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  focused: bool,
  navigate: Navigate,
  toggleFocus: (messageKey: string) => void,
  setScrollDisabled: (scrollDisabled: bool) => void,
  verticalBounds: ?VerticalBounds,
  keyboardShowing: bool,
  scrollDisabled: bool,
|};
class Message extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    focused: PropTypes.bool.isRequired,
    navigate: PropTypes.func.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    setScrollDisabled: PropTypes.func.isRequired,
    verticalBounds: verticalBoundsPropType,
    keyboardShowing: PropTypes.bool.isRequired,
    scrollDisabled: PropTypes.bool.isRequired,
  };

  componentDidUpdate(prevProps: Props) {
    if (
      (prevProps.focused || prevProps.item.startsConversation) !==
        (this.props.focused || this.props.item.startsConversation)
    ) {
      LayoutAnimation.easeInEaseOut();
    }
  }

  render() {
    let conversationHeader = null;
    if (this.props.focused || this.props.item.startsConversation) {
      conversationHeader = (
        <Timestamp time={this.props.item.messageInfo.time} color="dark" />
      );
    }
    let message;
    if (this.props.item.messageShapeType === "text") {
      message = (
        <TextMessage
          item={this.props.item}
          focused={this.props.focused}
          toggleFocus={this.props.toggleFocus}
          setScrollDisabled={this.props.setScrollDisabled}
          keyboardShowing={this.props.keyboardShowing}
        />
      );
    } else if (this.props.item.messageShapeType === "multimedia") {
      message = (
        <MultimediaMessage
          item={this.props.item}
          navigate={this.props.navigate}
          focused={this.props.focused}
          toggleFocus={this.props.toggleFocus}
          setScrollDisabled={this.props.setScrollDisabled}
          verticalBounds={this.props.verticalBounds}
          keyboardShowing={this.props.keyboardShowing}
          scrollDisabled={this.props.scrollDisabled}
        />
      );
    } else {
      message = (
        <RobotextMessage
          item={this.props.item}
          toggleFocus={this.props.toggleFocus}
        />
      );
    }
    const messageView = (
      <View>
        {conversationHeader}
        {message}
      </View>
    );
    if (Platform.OS === "android" && Platform.Version < 21) {
      // On old Android 4.4 devices, we can get a stack overflow during draw
      // when we use the TouchableWithoutFeedback below. It's just too deep of
      // a stack for the old hardware to handle
      return messageView;
    }
    return (
      <TouchableWithoutFeedback onPress={KeyboardUtils.dismiss}>
        {messageView}
      </TouchableWithoutFeedback>
    );
  }

}

export {
  Message,
  messageItemHeight,
};
