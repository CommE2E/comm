// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import {
  messageTypes,
  type SendMessageResult,
  type RawTextMessageInfo,
  type RawMessageInfo,
} from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageID } from 'lib/shared/message-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  sendTextMessageActionTypes,
  sendTextMessage,
} from 'lib/actions/message-actions';

import css from './chat-message-list.css';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
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
|};
class FailedSend extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
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
      <div className={css.failedSend}>
        <span>
          Delivery failed.
        </span>
        <a onClick={this.retrySend} className={css.retrySend}>
          Retry?
        </a>
      </div>
    );
  }

  retrySend = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.stopPropagation();

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

export default connect(
  (state: AppState, ownProps: { item: ChatMessageInfoItem }) => {
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
