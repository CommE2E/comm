// @flow

import invariant from 'invariant';
import * as React from 'react';

import { type ChatMessageInfoItem } from 'lib/selectors/chat-selectors';
import { messageTypes } from 'lib/types/message-types';
import { type ThreadInfo } from 'lib/types/thread-types';

import { type InputState, InputStateContext } from '../input/input-state';
import Multimedia from '../media/multimedia.react';
import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react';
import sendFailed from './multimedia-message-send-failed';
import type {
  MessagePositionInfo,
  OnMessagePositionWithContainerInfo,
} from './position-types';

type BaseProps = {|
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +mouseOverMessagePosition: ?OnMessagePositionWithContainerInfo,
  +setModal: (modal: ?React.Node) => void,
|};
type Props = {|
  ...BaseProps,
  // withInputState
  +inputState: ?InputState,
|};
class MultimediaMessage extends React.PureComponent<Props> {
  render() {
    const { item, setModal, inputState } = this.props;
    invariant(
      item.messageInfo.type === messageTypes.IMAGES ||
        item.messageInfo.type === messageTypes.MULTIMEDIA,
      'MultimediaMessage should only be used for multimedia messages',
    );
    const { localID, media } = item.messageInfo;

    invariant(inputState, 'inputState should be set in MultimediaMessage');
    const pendingUploads = localID ? inputState.assignedUploads[localID] : null;
    const multimedia = [];
    for (const singleMedia of media) {
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
        sendFailed={sendFailed(item, inputState)}
        setMouseOverMessagePosition={this.props.setMouseOverMessagePosition}
        mouseOverMessagePosition={this.props.mouseOverMessagePosition}
        canReply={false}
        fixedWidth={multimedia.length > 1}
        borderRadius={16}
      >
        {content}
      </ComposedMessage>
    );
  }
}

export default React.memo<BaseProps>(function ConnectedMultimediaMessage(
  props: BaseProps,
) {
  const inputState = React.useContext(InputStateContext);
  return <MultimediaMessage {...props} inputState={inputState} />;
});
