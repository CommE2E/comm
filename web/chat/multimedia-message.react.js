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

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import { messageKey } from 'lib/shared/message-utils';

import css from './chat-message-list.css';
import Multimedia from './multimedia.react';

type Props = {|
  item: ChatMessageInfoItem,
  toggleFocus: (messageKey: string) => void,
  chatInputState: ChatInputState,
|};
class MultimediaMessage extends React.PureComponent<Props> {

  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    toggleFocus: PropTypes.func.isRequired,
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
      : [];
    const multimedia = media.map(singleMedia => {
      const pendingUpload = pendingUploads.find(
        upload => upload.localID === singleMedia.id,
      );
      return (
        <Multimedia
          uri={singleMedia.uri}
          pendingUpload={pendingUpload}
          key={singleMedia.id}
        />
      );
    });
    return (
      <div className={css.robotext} onClick={this.onClick}>
        <div className={css.previews}>{multimedia}</div>
      </div>
    );
  }

  onClick = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    this.props.toggleFocus(messageKey(this.props.item.messageInfo));
  }

}

export default MultimediaMessage;
