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

import { messageKey } from 'lib/shared/message-utils';

import css from './chat-message-list.css';
import Multimedia from './multimedia.react';
import ComposedMessage from './composed-message.react';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  setMouseOver: (messagePositionInfo: MessagePositionInfo) => void,
  chatInputState: ChatInputState,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    setMouseOver: PropTypes.func.isRequired,
    chatInputState: chatInputStatePropType.isRequired,
  };

  constructor(props: Props) {
    super(props);
    invariant(
      props.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    invariant(
      nextProps.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
  }

  render() {
    invariant(
      this.props.item.messageInfo.type === messageTypes.MULTIMEDIA,
      "MultimediaMessage should only be used for messageTypes.MULTIMEDIA",
    );
    const { localID, media } = this.props.item.messageInfo;
    const pendingUploads = localID
      ? this.props.chatInputState.assignedUploads[localID]
      : null;
    let sendFailed = false;
    const multimedia = media.map(singleMedia => {
      let pendingUpload;
      if (pendingUploads) {
        pendingUpload = pendingUploads.find(
          upload => upload.localID === singleMedia.id,
        );
      }
      if (pendingUpload && pendingUpload.failed) {
        sendFailed = true;
      }
      return (
        <Multimedia
          uri={singleMedia.uri}
          pendingUpload={pendingUpload}
          key={singleMedia.id}
        />
      );
    });
    return (
      <ComposedMessage
        item={this.props.item}
        threadInfo={this.props.threadInfo}
        sendFailed={sendFailed}
        setMouseOver={this.props.setMouseOver}
        className={css.fullWidthMessageBox}
      >
        <div className={css.imageGrid}>
          {multimedia}
        </div>
      </ComposedMessage>
    );
  }

}

export default MultimediaMessage;
