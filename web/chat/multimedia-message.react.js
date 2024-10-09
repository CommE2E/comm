// @flow

import invariant from 'invariant';
import * as React from 'react';

import {
  encryptedMediaBlobURI,
  encryptedVideoThumbnailBlobURI,
} from 'lib/media/media-utils.js';
import { type ComposableChatMessageInfoItem } from 'lib/selectors/chat-selectors.js';
import { messageTypes } from 'lib/types/message-types-enum.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';

import css from './chat-message-list.css';
import ComposedMessage from './composed-message.react.js';
import sendFailed from './multimedia-message-send-failed.js';
import { type InputState, InputStateContext } from '../input/input-state.js';
import Multimedia from '../media/multimedia.react.js';

type BaseProps = {
  +item: ComposableChatMessageInfoItem,
  +threadInfo: ThreadInfo,
  +shouldDisplayPinIndicator: boolean,
};
type Props = {
  ...BaseProps,
  // withInputState
  +inputState: ?InputState,
};
class MultimediaMessage extends React.PureComponent<Props> {
  render(): React.Node {
    const { item, inputState } = this.props;
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
      const thumbHash = singleMedia.thumbHash ?? singleMedia.thumbnailThumbHash;
      let mediaSource;
      if (singleMedia.type === 'photo' || singleMedia.type === 'video') {
        const { type, uri, thumbnailURI, dimensions } = singleMedia;
        mediaSource = { type, uri, thumbHash, thumbnailURI, dimensions };
      } else {
        const { type, encryptionKey, thumbnailEncryptionKey, dimensions } =
          singleMedia;
        const blobURI = encryptedMediaBlobURI(singleMedia);
        const thumbnailBlobURI =
          singleMedia.type === 'encrypted_video'
            ? encryptedVideoThumbnailBlobURI(singleMedia)
            : null;
        mediaSource = {
          type,
          blobURI,
          encryptionKey,
          thumbnailBlobURI,
          thumbnailEncryptionKey,
          dimensions,
          thumbHash,
        };
      }

      multimedia.push(
        <Multimedia
          mediaSource={mediaSource}
          pendingUpload={pendingUpload}
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
        shouldDisplayPinIndicator={this.props.shouldDisplayPinIndicator}
        sendFailed={sendFailed(item, inputState)}
        fixedWidth={multimedia.length > 1}
        borderRadius={16}
      >
        {content}
      </ComposedMessage>
    );
  }
}

const ConnectedMultimediaMessage: React.ComponentType<BaseProps> =
  React.memo<BaseProps>(function ConnectedMultimediaMessage(props) {
    const inputState = React.useContext(InputStateContext);
    return <MultimediaMessage {...props} inputState={inputState} />;
  });

export default ConnectedMultimediaMessage;
