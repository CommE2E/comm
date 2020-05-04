// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import {
  messageTypes,
  type RawComposableMessageInfo,
  assertComposableMessageType,
} from 'lib/types/message-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageID } from 'lib/shared/message-utils';
import { connect } from 'lib/utils/redux-utils';

import css from './chat-message-list.css';
import multimediaMessageSendFailed from './multimedia-message-send-failed';
import textMessageSendFailed from './text-message-send-failed';
import {
  inputStatePropType,
  type InputState,
  withInputState,
} from '../input/input-state';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  // Redux state
  rawMessageInfo: RawComposableMessageInfo,
  // withInputState
  inputState: InputState,
|};
class FailedSend extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    rawMessageInfo: PropTypes.object.isRequired,
    inputState: inputStatePropType.isRequired,
  };
  retryingText = false;
  retryingMedia = false;

  componentDidUpdate(prevProps: Props) {
    if (
      (this.props.rawMessageInfo.type === messageTypes.IMAGES ||
        this.props.rawMessageInfo.type === messageTypes.MULTIMEDIA) &&
      (prevProps.rawMessageInfo.type === messageTypes.IMAGES ||
        prevProps.rawMessageInfo.type === messageTypes.MULTIMEDIA)
    ) {
      const isFailed = multimediaMessageSendFailed(
        this.props.item,
        this.props.inputState,
      );
      const wasFailed = multimediaMessageSendFailed(
        prevProps.item,
        prevProps.inputState,
      );
      const isDone =
        this.props.item.messageInfo.id !== null &&
        this.props.item.messageInfo.id !== undefined;
      const wasDone =
        prevProps.item.messageInfo.id !== null &&
        prevProps.item.messageInfo.id !== undefined;
      if ((isFailed && !wasFailed) || (isDone && !wasDone)) {
        this.retryingMedia = false;
      }
    } else if (
      this.props.rawMessageInfo.type === messageTypes.TEXT &&
      prevProps.rawMessageInfo.type === messageTypes.TEXT
    ) {
      const isFailed = textMessageSendFailed(this.props.item);
      const wasFailed = textMessageSendFailed(prevProps.item);
      const isDone =
        this.props.item.messageInfo.id !== null &&
        this.props.item.messageInfo.id !== undefined;
      const wasDone =
        prevProps.item.messageInfo.id !== null &&
        prevProps.item.messageInfo.id !== undefined;
      if ((isFailed && !wasFailed) || (isDone && !wasDone)) {
        this.retryingText = false;
      }
    }
  }

  render() {
    return (
      <div className={css.failedSend}>
        <span>Delivery failed.</span>
        <a onClick={this.retrySend} className={css.retrySend}>
          {'Retry?'}
        </a>
      </div>
    );
  }

  retrySend = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.stopPropagation();

    const { rawMessageInfo } = this.props;
    if (rawMessageInfo.type === messageTypes.TEXT) {
      if (this.retryingText) {
        return;
      }
      this.retryingText = true;
      this.props.inputState.sendTextMessage({
        ...rawMessageInfo,
        time: Date.now(),
      });
    } else if (
      rawMessageInfo.type === messageTypes.IMAGES ||
      rawMessageInfo.type === messageTypes.MULTIMEDIA
    ) {
      const { localID } = rawMessageInfo;
      invariant(localID, 'failed RawMessageInfo should have localID');
      if (this.retryingMedia) {
        return;
      }
      this.retryingMedia = true;
      this.props.inputState.retryMultimediaMessage(localID);
    }
  };
}

export default connect(
  (state: AppState, ownProps: { item: ChatMessageInfoItem }) => {
    const { messageInfo } = ownProps.item;
    assertComposableMessageType(messageInfo.type);
    const id = messageID(messageInfo);
    const rawMessageInfo = state.messageStore.messages[id];
    assertComposableMessageType(rawMessageInfo.type);
    invariant(
      rawMessageInfo.type === messageTypes.TEXT ||
        rawMessageInfo.type === messageTypes.IMAGES ||
        rawMessageInfo.type === messageTypes.MULTIMEDIA,
      'FailedSend should only be used for composable message types',
    );
    return { rawMessageInfo };
  },
)(withInputState(FailedSend));
