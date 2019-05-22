// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import {
  chatInputStatePropType,
  type ChatInputState,
} from './chat-input-state';
import type { MessagePositionInfo } from './message.react';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import css from './chat-message-list.css';
import Multimedia from './multimedia.react';
import ComposedMessage from './composed-message.react';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  setMouseOver: (messagePositionInfo: MessagePositionInfo) => void,
  chatInputState: ChatInputState,
  setModal: (modal: ?React.Node) => void,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    setMouseOver: PropTypes.func.isRequired,
    chatInputState: chatInputStatePropType.isRequired,
    setModal: PropTypes.func.isRequired,
  };

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
    const className = multimedia.length > 1 ? css.fixedWidthMessageBox : null;

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

}

export default MultimediaMessage;
