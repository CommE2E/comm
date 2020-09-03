// @flow

import {
  type ChatMessageInfoItem,
  chatMessageItemPropType,
} from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import type { MessagePositionInfo } from './message-position-types';
import { type ThreadInfo, threadInfoPropType } from 'lib/types/thread-types';

import * as React from 'react';
import invariant from 'invariant';
import PropTypes from 'prop-types';

import css from './chat-message-list.css';
import Multimedia from '../media/multimedia.react';
import ComposedMessage from './composed-message.react';
import sendFailed from './multimedia-message-send-failed';
import {
  inputStatePropType,
  type InputState,
  withInputState,
} from '../input/input-state';

type Props = {|
  item: ChatMessageInfoItem,
  threadInfo: ThreadInfo,
  setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  setModal: (modal: ?React.Node) => void,
  // withInputState
  inputState: InputState,
|};
class MultimediaMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    setMouseOverMessagePosition: PropTypes.func.isRequired,
    setModal: PropTypes.func.isRequired,
    inputState: inputStatePropType.isRequired,
  };

  render() {
    const { item, setModal } = this.props;
    invariant(
      item.messageInfo.type === messageTypes.IMAGES ||
        item.messageInfo.type === messageTypes.MULTIMEDIA,
      'MultimediaMessage should only be used for multimedia messages',
    );
    const { localID, media } = item.messageInfo;

    const pendingUploads = localID
      ? this.props.inputState.assignedUploads[localID]
      : null;
    const multimedia = [];
    for (let singleMedia of media) {
      const pendingUpload = pendingUploads
        ? pendingUploads.find(upload => upload.localID === singleMedia.id)
        : null;
      multimedia.push(
        <Multimedia
          uri={singleMedia.uri}
          pendingUpload={pendingUpload}
          setModal={setModal}
          multimediaCSSClass={css.multimedia}
          multimediaImageCSSClass={css.multimediaImage}
          key={singleMedia.id}
        />,
      );
    }

    invariant(multimedia.length > 0, 'should be at least one multimedia...');
    const content =
      multimedia.length > 1 ? (
        <div className={css.imageGrid}>{multimedia}</div>
      ) : (
        multimedia
      );

    return (
      <ComposedMessage
        item={item}
        threadInfo={this.props.threadInfo}
        sendFailed={sendFailed(this.props.item, this.props.inputState)}
        setMouseOverMessagePosition={this.props.setMouseOverMessagePosition}
        canReply={false}
        fixedWidth={multimedia.length > 1}
        borderRadius={16}
      >
        {content}
      </ComposedMessage>
    );
  }
}

export default withInputState(MultimediaMessage);
