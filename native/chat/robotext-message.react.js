// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { ChatMessageInfoItemWithHeight } from './message-list.react';
import { chatMessageItemPropType } from '../selectors/chat-selectors';
import type { Dispatch } from 'lib/types/redux-types';
import type { AppState } from '../redux-setup';

import React from 'react';
import {
  Text,
  StyleSheet,
  View,
} from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import { messageKey, robotextToRawString } from 'lib/shared/message-utils';
import { messageType } from 'lib/types/message-types';
import { includeDispatchActionProps } from 'lib/utils/action-utils';
import { threadInfoSelector } from 'lib/selectors/thread-selectors';

import { MessageListRouteName } from './message-list.react';

function robotextMessageItemHeight(
  item: ChatMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  return 17 + item.textHeight; // for padding, margin, and text
}

type Props = {
  item: ChatMessageInfoItemWithHeight,
  toggleFocus: (messageKey: string) => void,
  threadInfo: ThreadInfo,
};
class RobotextMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
    threadInfo: threadInfoPropType.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type !== messageType.TEXT,
      "TextMessage cannot be used for messageType.TEXT",
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    invariant(
      nextProps.item.messageInfo.type !== messageType.TEXT,
      "TextMessage cannot be used for messageType.TEXT",
    );
  }

  render() {
    return (
      <View
        onStartShouldSetResponder={this.onStartShouldSetResponder}
        onResponderGrant={this.onResponderGrant}
        onResponderTerminationRequest={this.onResponderTerminationRequest}
      >
        {this.linkedRobotext()}
      </View>
    );
  }

  linkedRobotext() {
    const item = this.props.item;
    invariant(
      item.robotext && typeof item.robotext === "string",
      "Flow can't handle our fancy types :(",
    );
    const robotext = item.robotext;
    const splitRobotext = robotext.split(/(<[^<>\|]+\|[^<>\|]+>)/g);
    const textParts = [];
    for (let splitPart of splitRobotext) {
      if (splitPart === "") {
        continue;
      }
      if (splitPart.charAt(0) !== "<") {
        textParts.push(decodeURI(splitPart));
        continue;
      }

      const entityParts = splitPart.match(/<([^<>\|]+)\|([^<>\|]+)>/);
      invariant(entityParts && entityParts[1], "malformed robotext");
      const rawText = decodeURI(entityParts[1]);
      const entityType = entityParts[2].charAt(0);
      const id = entityParts[2].substr(1);

      if (entityType === "t" && id !== this.props.item.messageInfo.threadID) {
        textParts.push(<ThreadEntity key={id} id={id} name={rawText} />);
        continue;
      } else if (entityType === "c") {
        textParts.push(<ColorEntity key={id} color={rawText} />);
        continue;
      }

      textParts.push(rawText);
    }
    return <Text style={styles.robotext}>{textParts}</Text>;
  }

  onStartShouldSetResponder = () => true;

  onResponderGrant = () => {
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

  onResponderTerminationRequest = () => true;

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

  render() {
    return (
      <Text style={styles.link} onPress={this.onPressThread}>
        {this.props.name}
      </Text>
    );
  }

  onPressThread = (a, b, c) => {
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
  includeDispatchActionProps,
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
