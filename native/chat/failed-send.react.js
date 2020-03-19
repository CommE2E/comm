// @flow

import type { ChatMessageInfoItemWithHeight } from './message.react';
import { chatMessageItemPropType } from 'lib/selectors/chat-selectors';
import {
  messageTypes,
  type SendMessageResult,
  type SendMessagePayload,
  type RawTextMessageInfo,
  type RawMessageInfo,
} from 'lib/types/message-types';
import type { AppState } from '../redux/redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';
import type { Styles } from '../types/styles';
import {
  type ChatInputState,
  chatInputStatePropType,
  withChatInputState,
} from './chat-input-state';

import * as React from 'react';
import { Text, View } from 'react-native';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageID } from 'lib/shared/message-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  sendTextMessageActionTypes,
  sendTextMessage,
} from 'lib/actions/message-actions';

import Button from '../components/button.react';
import { styleSelector } from '../themes/colors';
import multimediaMessageSendFailed from './multimedia-message-send-failed';

const failedSendHeight = 22;

type Props = {|
  item: ChatMessageInfoItemWithHeight,
  // Redux state
  rawMessageInfo: ?RawMessageInfo,
  styles: Styles,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendTextMessage: (
    threadID: string,
    localID: string,
    text: string,
  ) => Promise<SendMessageResult>,
  // withChatInputState
  chatInputState: ?ChatInputState,
|};
class FailedSend extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    rawMessageInfo: PropTypes.object,
    styles: PropTypes.objectOf(PropTypes.object).isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendTextMessage: PropTypes.func.isRequired,
    chatInputState: chatInputStatePropType,
  };
  retryingText = false;
  retryingMedia = false;

  componentDidUpdate(prevProps: Props) {
    const newItem = this.props.item;
    if (newItem.messageShapeType !== 'multimedia') {
      return;
    }
    const prevItem = prevProps.item;
    if (prevItem.messageShapeType !== 'multimedia') {
      return;
    }
    const isFailed = multimediaMessageSendFailed(newItem);
    const wasFailed = multimediaMessageSendFailed(prevItem);
    const isDone =
      newItem.messageInfo.id !== null && newItem.messageInfo.id !== undefined;
    const wasDone =
      prevItem.messageInfo.id !== null && prevItem.messageInfo.id !== undefined;
    if ((isFailed && !wasFailed) || (isDone && !wasDone)) {
      this.retryingMedia = false;
    }
  }

  render() {
    if (!this.props.rawMessageInfo) {
      return null;
    }
    return (
      <View style={this.props.styles.failedSendInfo}>
        <Text style={this.props.styles.deliveryFailed} numberOfLines={1}>
          DELIVERY FAILED.
        </Text>
        <Button onPress={this.retrySend}>
          <Text style={this.props.styles.retrySend} numberOfLines={1}>
            {'RETRY?'}
          </Text>
        </Button>
      </View>
    );
  }

  retrySend = () => {
    const { rawMessageInfo } = this.props;
    if (!rawMessageInfo) {
      return;
    }
    if (rawMessageInfo.type === messageTypes.TEXT) {
      if (this.retryingText) {
        return;
      }
      const newRawMessageInfo = {
        ...rawMessageInfo,
        time: Date.now(),
      };
      this.props.dispatchActionPromise(
        sendTextMessageActionTypes,
        this.sendTextMessageAction(newRawMessageInfo),
        undefined,
        newRawMessageInfo,
      );
    } else if (
      rawMessageInfo.type === messageTypes.IMAGES ||
      rawMessageInfo.type === messageTypes.MULTIMEDIA
    ) {
      const { localID } = rawMessageInfo;
      invariant(localID, 'failed RawMessageInfo should have localID');
      const { chatInputState } = this.props;
      invariant(
        chatInputState,
        `chatInputState should be initialized before user can hit retry`,
      );
      if (this.retryingMedia) {
        return;
      }
      this.retryingMedia = true;
      chatInputState.retryMultimediaMessage(localID);
    }
  };

  async sendTextMessageAction(
    messageInfo: RawTextMessageInfo,
  ): Promise<SendMessagePayload> {
    this.retryingText = true;
    try {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        'localID should be set',
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
    } finally {
      this.retryingText = false;
    }
  }
}

const styles = {
  failedSendInfo: {
    paddingTop: 5,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginRight: 20,
  },
  deliveryFailed: {
    paddingHorizontal: 3,
    color: 'listSeparatorLabel',
  },
  retrySend: {
    paddingHorizontal: 3,
    color: 'link',
  },
};
const stylesSelector = styleSelector(styles);

const ConnectedFailedSend = connect(
  (state: AppState, ownProps: { item: ChatMessageInfoItemWithHeight }) => {
    const id = messageID(ownProps.item.messageInfo);
    return {
      rawMessageInfo: state.messageStore.messages[id],
      styles: stylesSelector(state),
    };
  },
  { sendTextMessage },
)(withChatInputState(FailedSend));

export { ConnectedFailedSend as FailedSend, failedSendHeight };
