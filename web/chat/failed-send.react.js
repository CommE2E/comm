// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useRetrySendDMOperation } from 'lib/shared/dm-ops/process-dm-ops.js';
import { messageID } from 'lib/shared/message-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  assertComposableMessageType,
  type LocalMessageInfo,
  type RawComposableMessageInfo,
} from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from 'lib/types/thread-types-enum.js';

import css from './chat-message-list.css';
import multimediaMessageSendFailed from './multimedia-message-send-failed.js';
import textMessageSendFailed from './text-message-send-failed.js';
import Button from '../components/button.react.js';
import { type InputState, InputStateContext } from '../input/input-state.js';
import { useSelector } from '../redux/redux-utils.js';

type BaseProps = {
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
};
type Props = {
  ...BaseProps,
  +rawMessageInfo: RawComposableMessageInfo,
  +inputState: ?InputState,
  +parentThreadInfo: ?ThreadInfo,
  +retrySendDMOperation: (
    messageID: string,
    localMessageInfo: LocalMessageInfo,
  ) => Promise<void>,
};
class FailedSend extends React.PureComponent<Props> {
  retryingText = false;
  retryingMedia = false;

  componentDidUpdate(prevProps: Props) {
    if (
      (this.props.rawMessageInfo.type === messageTypes.IMAGES ||
        this.props.rawMessageInfo.type === messageTypes.MULTIMEDIA) &&
      (prevProps.rawMessageInfo.type === messageTypes.IMAGES ||
        prevProps.rawMessageInfo.type === messageTypes.MULTIMEDIA)
    ) {
      const { inputState } = this.props;
      const prevInputState = prevProps.inputState;
      invariant(
        inputState && prevInputState,
        'inputState should be set in FailedSend',
      );
      const isFailed = multimediaMessageSendFailed(this.props.item, inputState);
      const wasFailed = multimediaMessageSendFailed(
        prevProps.item,
        prevInputState,
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

  render(): React.Node {
    return (
      <div className={css.failedSend}>
        <span className={css.deliveryFailed}>Delivery failed.</span>
        <Button
          variant="text"
          buttonColor={{
            color: `#${this.props.threadInfo.color}`,
          }}
          onClick={this.retrySend}
        >
          <span className={css.retryButtonText}>Retry?</span>
        </Button>
      </div>
    );
  }

  retrySend = () => {
    const { inputState } = this.props;
    invariant(inputState, 'inputState should be set in FailedSend');

    const { rawMessageInfo } = this.props;
    if (rawMessageInfo.type === messageTypes.TEXT) {
      if (this.retryingText) {
        return;
      }
      this.retryingText = true;
      if (threadTypeIsThick(this.props.threadInfo.type)) {
        const failedMessageID = this.props.rawMessageInfo.id;
        invariant(failedMessageID, 'failedMessageID should be set for DMs');
        const localMessageInfo = this.props.item.localMessageInfo;
        invariant(
          localMessageInfo,
          'localMessageInfo should be set for failed message',
        );
        void this.props.retrySendDMOperation(failedMessageID, localMessageInfo);
        return;
      }
      void inputState.sendTextMessage(
        {
          ...rawMessageInfo,
          time: Date.now(),
        },
        this.props.threadInfo,
        this.props.parentThreadInfo,
      );
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
      inputState.retryMultimediaMessage(localID, this.props.threadInfo);
    }
  };
}

const ConnectedFailedSend: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedFailedSend(props) {
    const { messageInfo } = props.item;
    assertComposableMessageType(messageInfo.type);
    const id = messageID(messageInfo);
    const rawMessageInfo = useSelector(
      state => state.messageStore.messages[id],
    );
    assertComposableMessageType(rawMessageInfo.type);
    invariant(
      rawMessageInfo.type === messageTypes.TEXT ||
        rawMessageInfo.type === messageTypes.IMAGES ||
        rawMessageInfo.type === messageTypes.MULTIMEDIA,
      'FailedSend should only be used for composable message types',
    );
    const inputState = React.useContext(InputStateContext);
    const { parentThreadID } = props.threadInfo;
    const parentThreadInfo = useSelector(state =>
      parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
    );
    const retrySendDMOperation = useRetrySendDMOperation();

    return (
      <FailedSend
        {...props}
        rawMessageInfo={rawMessageInfo}
        inputState={inputState}
        parentThreadInfo={parentThreadInfo}
        retrySendDMOperation={retrySendDMOperation}
      />
    );
  });

export default ConnectedFailedSend;
