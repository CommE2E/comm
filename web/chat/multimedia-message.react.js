// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import {
  messageTypes,
  type SendMessageResult,
  type RawMultimediaMessageInfo,
} from 'lib/types/message-types';
import {
  chatInputStatePropType,
  type ChatInputState,
} from './chat-input-state';
import type { MessagePositionInfo } from './message.react';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';
import type { AppState } from '../redux-setup';
import type { DispatchActionPromise } from 'lib/utils/action-utils';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import { messageKey } from 'lib/shared/message-utils';
import { connect } from 'lib/utils/redux-utils';
import {
  sendMultimediaMessageActionTypes,
  sendMultimediaMessage,
} from 'lib/actions/message-actions';
import { messageID } from 'lib/shared/message-utils';

import css from './chat-message-list.css';
import Multimedia from './multimedia.react';
import ComposedMessage from './composed-message.react';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  setMouseOver: (messagePositionInfo: MessagePositionInfo) => void,
  chatInputState: ChatInputState,
  setModal: (modal: ?React.Node) => void,
  // Redux state
  rawMessageInfo: RawMultimediaMessageInfo,
  // Redux dispatch functions
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  sendMultimediaMessage: (
    threadID: string,
    localID: string,
    mediaIDs: $ReadOnlyArray<string>,
  ) => Promise<SendMessageResult>,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    setMouseOver: PropTypes.func.isRequired,
    chatInputState: chatInputStatePropType.isRequired,
    setModal: PropTypes.func.isRequired,
    rawMessageInfo: PropTypes.object.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    sendMultimediaMessage: PropTypes.func.isRequired,
  };

  componentDidMount() {
    if (MultimediaMessage.multimediaUploadComplete(this.props)) {
      this.sendMultimediaMessage();
    }
  }

  componentDidUpdate(prevProps: Props) {
    if (
      !MultimediaMessage.multimediaUploadComplete(prevProps) &&
      MultimediaMessage.multimediaUploadComplete(this.props)
    ) {
      this.sendMultimediaMessage();
    }
  }

  sendMultimediaMessage() {
    const { rawMessageInfo } = this.props;
    if (rawMessageInfo.id) {
      return;
    }
    this.props.dispatchActionPromise(
      sendMultimediaMessageActionTypes,
      this.sendMultimediaMessageAction(rawMessageInfo),
      undefined,
      rawMessageInfo,
    );
  }

  static multimediaUploadComplete(props: Props) {
    const { messageInfo } = props.item;
    invariant(
      messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    if (messageInfo.id) {
      return true;
    }
    if (MultimediaMessage.multimediaUploadFailed(props)) {
      return false;
    }
    const { localID, media } = messageInfo;
    const pendingUploads = localID
      ? props.chatInputState.assignedUploads[localID]
      : null;
    if (!pendingUploads) {
      return true;
    }
    return messageInfo.media.every(media => {
      const pendingUpload = pendingUploads.find(
        upload => upload.localID === media.id,
      );
      return !pendingUpload || pendingUpload.serverID;
    });
  }

  static multimediaUploadFailed(props: Props) {
    const { messageInfo } = props.item;
    invariant(
      messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    const { id, localID, media } = messageInfo;
    if (id) {
      return false;
    }
    invariant(localID, "localID should be set if serverID is not");
    return props.chatInputState.messageHasUploadFailure(localID);
  }

  render() {
    const { item, setModal } = this.props;
    invariant(
      item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    const { id, localID, media } = item.messageInfo;
    const { isViewer } = item.messageInfo.creator;

    const sendFailed =
      isViewer &&
      (id === null || id === undefined) &&
      (MultimediaMessage.multimediaUploadFailed(this.props) ||
        (item.localMessageInfo && item.localMessageInfo.sendFailed));

    const pendingUploads = localID
      ? this.props.chatInputState.assignedUploads[localID]
      : null;
    const multimedia = media.map(singleMedia => {
      const pendingUpload = pendingUploads
        ? pendingUploads.find(upload => upload.localID === singleMedia.id)
        : null;
      return (
        <Multimedia
          uri={singleMedia.uri}
          pendingUpload={pendingUpload}
          setModal={setModal}
          key={singleMedia.id}
        />
      );
    });

    invariant(
      multimedia.length > 0,
      "should be at least one multimedia...",
    );
    const content = multimedia.length > 1
      ? <div className={css.imageGrid}>{multimedia}</div>
      : multimedia;
    const className = multimedia.length > 1
      ? css.fullWidthMessageBox
      : css.halfWidthMessageBox;

    return (
      <ComposedMessage
        item={item}
        threadInfo={this.props.threadInfo}
        sendFailed={!!sendFailed}
        setMouseOver={this.props.setMouseOver}
        className={className}
        borderRadius={16}
        chatInputState={this.props.chatInputState}
      >
        {content}
      </ComposedMessage>
    );
  }

  async sendMultimediaMessageAction(messageInfo: RawMultimediaMessageInfo) {
    try {
      const { localID } = messageInfo;
      invariant(
        localID !== null && localID !== undefined,
        "localID should be set",
      );
      const result = await this.props.sendMultimediaMessage(
        messageInfo.threadID,
        localID,
        messageInfo.media.map(({ id }) => id),
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
      messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    const id = messageID(messageInfo);
    const rawMessageInfo = state.messageStore.messages[id];
    invariant(
      rawMessageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    return { rawMessageInfo };
  },
  { sendMultimediaMessage },
)(MultimediaMessage);
