// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import { useRetrySendDMOperation } from 'lib/shared/dm-ops/process-dm-ops.js';
import { messageID } from 'lib/shared/message-utils.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import {
  type RawComposableMessageInfo,
  assertComposableRawMessage,
  type LocalMessageInfo,
} from 'lib/types/message-types.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { threadTypeIsThick } from 'lib/types/thread-types-enum.js';

import { multimediaMessageSendFailed } from './multimedia-message-utils.js';
import textMessageSendFailed from './text-message-send-failed.js';
import Button from '../components/button.react.js';
import { type InputState, InputStateContext } from '../input/input-state.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';

const failedSendHeight = 22;

const unboundStyles = {
  deliveryFailed: {
    color: 'listSeparatorLabel',
    paddingHorizontal: 3,
  },
  failedSendInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginRight: 20,
    paddingTop: 5,
  },
  retrySend: {
    paddingHorizontal: 3,
  },
};

type BaseProps = {
  +item: ChatMessageInfoItemWithHeight,
};
type Props = {
  ...BaseProps,
  +rawMessageInfo: ?RawComposableMessageInfo,
  +styles: $ReadOnly<typeof unboundStyles>,
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
    const newItem = this.props.item;
    const prevItem = prevProps.item;
    if (
      newItem.messageShapeType === 'multimedia' &&
      prevItem.messageShapeType === 'multimedia'
    ) {
      const isFailed = multimediaMessageSendFailed(newItem);
      const wasFailed = multimediaMessageSendFailed(prevItem);
      const isDone =
        newItem.messageInfo.id !== null && newItem.messageInfo.id !== undefined;
      const wasDone =
        prevItem.messageInfo.id !== null &&
        prevItem.messageInfo.id !== undefined;
      if ((isFailed && !wasFailed) || (isDone && !wasDone)) {
        this.retryingMedia = false;
      }
    } else if (
      newItem.messageShapeType === 'text' &&
      prevItem.messageShapeType === 'text'
    ) {
      const isFailed = textMessageSendFailed(newItem);
      const wasFailed = textMessageSendFailed(prevItem);
      const isDone =
        newItem.messageInfo.id !== null && newItem.messageInfo.id !== undefined;
      const wasDone =
        prevItem.messageInfo.id !== null &&
        prevItem.messageInfo.id !== undefined;
      if ((isFailed && !wasFailed) || (isDone && !wasDone)) {
        this.retryingText = false;
      }
    }
  }

  render(): React.Node {
    if (!this.props.rawMessageInfo) {
      return null;
    }
    const threadColor = {
      color: `#${this.props.item.threadInfo.color}`,
    };

    return (
      <View style={this.props.styles.failedSendInfo}>
        <Text style={this.props.styles.deliveryFailed} numberOfLines={1}>
          DELIVERY FAILED.
        </Text>
        <Button onPress={this.retrySend}>
          <Text
            style={{
              ...this.props.styles.retrySend,
              ...threadColor,
            }}
            numberOfLines={1}
          >
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
      this.retryingText = true;
    } else if (
      rawMessageInfo.type === messageTypes.IMAGES ||
      rawMessageInfo.type === messageTypes.MULTIMEDIA
    ) {
      if (this.retryingMedia) {
        return;
      }
      this.retryingMedia = true;
    }

    if (threadTypeIsThick(this.props.item.threadInfo.type)) {
      const failedMessageID = this.props.rawMessageInfo?.id;
      invariant(failedMessageID, 'failedMessageID should be set for DMs');
      const localMessageInfo = this.props.item.localMessageInfo;
      invariant(
        localMessageInfo,
        'localMessageInfo should be set for failed message',
      );
      void this.props.retrySendDMOperation(failedMessageID, localMessageInfo);
      return;
    }

    const { inputState } = this.props;
    invariant(
      inputState,
      'inputState should be initialized before user can hit retry',
    );
    const { localID } = rawMessageInfo;
    invariant(localID, 'failed RawMessageInfo should have localID');
    void inputState.retryMessage(
      localID,
      this.props.item.threadInfo,
      this.props.parentThreadInfo,
    );
  };
}

const ConnectedFailedSend: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedFailedSend(props: BaseProps) {
    const id = messageID(props.item.messageInfo);
    const rawMessageInfo = useSelector(state => {
      const message = state.messageStore.messages[id];
      return message ? assertComposableRawMessage(message) : null;
    });
    const styles = useStyles(unboundStyles);
    const inputState = React.useContext(InputStateContext);
    const { parentThreadID } = props.item.threadInfo;
    const parentThreadInfo = useSelector(state =>
      parentThreadID ? threadInfoSelector(state)[parentThreadID] : null,
    );
    const retrySendDMOperation = useRetrySendDMOperation();

    return (
      <FailedSend
        {...props}
        rawMessageInfo={rawMessageInfo}
        styles={styles}
        inputState={inputState}
        parentThreadInfo={parentThreadInfo}
        retrySendDMOperation={retrySendDMOperation}
      />
    );
  });

export { ConnectedFailedSend as FailedSend, failedSendHeight };
