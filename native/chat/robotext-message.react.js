// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import { threadInfoPropType } from 'lib/types/thread-types';
import type { ChatMessageInfoItemWithHeight } from './message-list.react';
import { chatMessageItemPropType } from '../selectors/chat-selectors';

import React from 'react';
import {
  Text,
  StyleSheet,
  View,
} from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageKey, robotextForMessageInfo } from 'lib/shared/message-utils';
import { messageType } from 'lib/types/message-types';

function robotextMessageItemHeight(
  item: ChatMessageInfoItemWithHeight,
  viewerID: ?string,
) {
  let height = 17 + item.textHeight; // for padding, margin, and text
}

type Props = {
  item: ChatMessageInfoItemWithHeight,
  onFocus: (messageKey: string) => void,
  threadInfo: ThreadInfo,
};
class RobotextMessage extends React.PureComponent {

  props: Props;
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    onFocus: PropTypes.func.isRequired,
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
    const robotext = robotextForMessageInfo(this.props.item.messageInfo);
    return (
      <View
        onStartShouldSetResponder={this.onStartShouldSetResponder}
        onResponderGrant={this.onResponderGrant}
        onResponderTerminationRequest={this.onResponderTerminationRequest}
      >
        <Text style={styles.robotext}>{robotext[0] + " " + robotext[1]}</Text>
      </View>
    );
  }

  onStartShouldSetResponder = () => true;

  onResponderGrant = () => {
    this.props.onFocus(messageKey(this.props.item.messageInfo));
  }

  onResponderTerminationRequest = () => true;

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
});

export {
  RobotextMessage,
  robotextMessageItemHeight,
};
