// @flow

import type {
  ChatMessageInfoItemWithHeight,
} from './message-list-container.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import {
  messageTypes,
  type SendMessageResult,
  type RawTextMessageInfo,
  type RawMessageInfo,
} from 'lib/types/message-types';
import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import * as React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageID } from 'lib/shared/message-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  sendTextMessageActionTypes,
  sendTextMessage,
} from 'lib/actions/message-actions';

import Button from '../components/button.react';

type Props = {
  item: ChatMessageInfoItemWithHeight,
  // Redux state
  rawMessageInfo: RawMessageInfo,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendTextMessage: (
    threadID: string,
    localID: string,
    text: string,
  ) => Promise<SendMessageResult>,
};
class FailedSend extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    rawMessageInfo: PropTypes.object.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendTextMessage: PropTypes.func.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    invariant(
      nextProps.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
  }

  render() {
    invariant(
      this.props.item.messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
    const { isViewer } = this.props.item.messageInfo.creator;
    if (!isViewer) {
      return null;
    }
    const { id } = this.props.item.messageInfo;
    if (id !== null && id !== undefined) {
      return null;
    }
    const sendFailed = this.props.item.localMessageInfo
      ? this.props.item.localMessageInfo.sendFailed
      : null;
    if (!sendFailed) {
      return null;
    }
    return (
      <View style={styles.failedSendInfo}>
        <Text style={styles.deliveryFailed} numberOfLines={1}>
          DELIVERY FAILED.
        </Text>
        <Button onPress={this.retrySend}>
          <Text style={styles.retrySend} numberOfLines={1}>
            RETRY?
          </Text>
        </Button>
      </View>
    );
  }

  retrySend = () => {
    const { rawMessageInfo } = this.props;
    invariant(
      rawMessageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
    const newRawMessageInfo = {
      ...rawMessageInfo,
      time: Date.now(),
    };
    this.props.dispatchActionPromise(
      sendTextMessageActionTypes,
      this.sendMessageAction(newRawMessageInfo),
      undefined,
      newRawMessageInfo,
    );
  }

  async sendMessageAction(messageInfo: RawTextMessageInfo) {
    try {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        "localID should be set",
      );
      const result = await this.props.sendTextMessage(
        messageInfo.threadID,
        localID,
        messageInfo.text,
      );
      return {
        localID,
        serverID: result.id,
        threadID: messageInfo.threadID,
        time: result.time,
      };
    } catch (e) {
      e.localID = messageInfo.localID;
      e.threadID = messageInfo.threadID;
      throw e;
    }
  }

}

const styles = StyleSheet.create({
  failedSendInfo: {
    paddingTop: 5,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginRight: 20,
  },
  deliveryFailed: {
    paddingHorizontal: 3,
    color: '#555555',
  },
  retrySend: {
    paddingHorizontal: 3,
    color: "#036AFF",
  },
});

export default connect(
  (state: AppState, ownProps: { item: ChatMessageInfoItemWithHeight }) => {
    const { messageInfo } = ownProps.item;
    invariant(
      messageInfo.type === messageTypes.TEXT,
      "TextMessage should only be used for messageTypes.TEXT",
    );
    const id = messageID(messageInfo);
    return {
      rawMessageInfo: state.messageStore.messages[id],
    };
  },
  { sendTextMessage },
)(FailedSend);
