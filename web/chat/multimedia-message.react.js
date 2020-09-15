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
  InputStateContext,
} from '../input/input-state';

type BaseProps = {|
  +item: ChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +setMouseOverMessagePosition: (
    messagePositionInfo: MessagePositionInfo,
  ) => void,
  +setModal: (modal: ?React.Node) => void,
|};
type Props = {|
  ...BaseProps,
  // withInputState
  +inputState: ?InputState,
|};
class MultimediaMessage extends React.PureComponent<Props> {
  static propTypes = {
    item: chatMessageItemPropType.isRequired,
    threadInfo: threadInfoPropType.isRequired,
    setMouseOverMessagePosition: PropTypes.func.isRequired,
    setModal: PropTypes.func.isRequired,
    inputState: inputStatePropType,
  };

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
        sendFailed={sendFailed(item, inputState)}
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

export default React.memo<BaseProps>(function ConnectedMultimediaMessage(
  props: BaseProps,
) {
  const inputState = React.useContext(InputStateContext);
  return <MultimediaMessage {...props} inputState={inputState} />;
});
