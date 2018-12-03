// @flow

import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { ChatMessageInfoItemWithHeight } from './message-list.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState } from '../redux-setup';
import { messageTypeIsRobotext } from 'lib/types/message-types';

import React from 'react';
import {
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import Hyperlink from 'react-native-hyperlink';

import {
  messageKey,
  splitRobotext,
  parseRobotextEntity,
} from 'lib/shared/message-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';
import { connect } from 'lib/utils/redux-utils';

import { MessageListRouteName } from '../navigation/route-names';

function robotextMessageItemHeight(
  item: ChatMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  return 17 + item.textHeight; // for padding, margin, and text
}

type Props = {
  item: ChatMessageInfoItemWithHeight,
  toggleFocus: (messageKey: string) => void,
};
class RobotextMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      messageTypeIsRobotext(props.item.messageInfo.type),
      "TextMessage can only be used for robotext",
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    invariant(
      messageTypeIsRobotext(nextProps.item.messageInfo.type),
      "TextMessage can only be used for robotext",
    );
  }

  render() {
    return (
      <TouchableWithoutFeedback onPress={this.onPress}>
        {this.linkedRobotext()}
      </TouchableWithoutFeedback>
    );
  }

  linkedRobotext() {
    const item = this.props.item;
    invariant(
      item.robotext && typeof item.robotext === "string",
      "Flow can't handle our fancy types :(",
    );
    const robotext = item.robotext;
    const robotextParts = splitRobotext(robotext);
    const textParts = [];
    for (let splitPart of robotextParts) {
      if (splitPart === "") {
        continue;
      }
      if (splitPart.charAt(0) !== "<") {
        textParts.push(decodeURI(splitPart));
        continue;
      }

      const { rawText, entityType, id } = parseRobotextEntity(splitPart);

      if (entityType === "t" && id !== this.props.item.messageInfo.threadID) {
        textParts.push(<ThreadEntity key={id} id={id} name={rawText} />);
      } else if (entityType === "c") {
        textParts.push(<ColorEntity key={id} color={rawText} />);
      } else {
        textParts.push(rawText);
      }
    }
    return (
      <Hyperlink linkDefault={true} linkStyle={styles.link}>
        <Text style={styles.robotext}>{textParts}</Text>
      </Hyperlink>
    );
  }

  onPress = () => {
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

}

type InnerThreadEntityProps = {
  id: string,
  name: string,
  // Redux state
  threadInfo: ThreadInfo,
  // Redux dispatch functions
  dispatch: Dispatch,
};
class InnerThreadEntity extends React.PureComponent<InnerThreadEntityProps> {

  static propTypes = {
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    dispatch: PropTypes.func.isRequired,
  };

  render() {
    return (
      <Text style={styles.link} onPress={this.onPressThread}>
        {this.props.name}
      </Text>
    );
  }

  onPressThread = () => {
    const id = this.props.id;
    this.props.dispatch({
      type: "Navigation/NAVIGATE",
      routeName: MessageListRouteName,
      params: { threadInfo: this.props.threadInfo },
    });
  }

}
const ThreadEntity = connect(
  (state: AppState, ownProps: { id: string }) => ({
    threadInfo: threadInfoSelector(state)[ownProps.id],
  }),
  null,
  true,
)(InnerThreadEntity);

function ColorEntity(props: {| color: string |}) {
  const colorStyle = { color: props.color };
  return <Text style={colorStyle}>{props.color}</Text>;
}

const styles = StyleSheet.create({
  robotext: {
    textAlign: 'center',
    color: '#333333',
    paddingVertical: 6,
    marginBottom: 5,
    marginHorizontal: 24,
    fontSize: 15,
    fontFamily: 'Arial',
  },
  link: {
    color: '#3333FF',
  },
});

export {
  RobotextMessage,
  robotextMessageItemHeight,
};
