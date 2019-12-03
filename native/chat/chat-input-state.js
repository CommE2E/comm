// @flow

import type { GalleryMediaInfo } from '../media/media-gallery-media.react';

import * as React from 'react';
import PropTypes from 'prop-types';

export type PendingMultimediaUpload = {|
  failed: ?string,
  progressPercent: number,
|};

export type ClientImageInfo = {|
  ...GalleryMediaInfo,
  unlinkURIAfterRemoving?: bool,
|};

const pendingMultimediaUploadPropType = PropTypes.shape({
  failed: PropTypes.string,
  progressPercent: PropTypes.number.isRequired,
});

export type MessagePendingUploads = {
  [localUploadID: string]: PendingMultimediaUpload,
};

const messagePendingUploadsPropType = PropTypes.objectOf(
  pendingMultimediaUploadPropType,
);

export type PendingMultimediaUploads = {
  [localMessageID: string]: MessagePendingUploads,
};

const pendingMultimediaUploadsPropType = PropTypes.objectOf(
  messagePendingUploadsPropType,
);

export type ChatInputState = {|
  pendingUploads: PendingMultimediaUploads,
  sendMultimediaMessage: (
    threadID: string,
    imageInfos: $ReadOnlyArray<ClientImageInfo>,
  ) => Promise<void>,
  messageHasUploadFailure: (localMessageID: string) => bool,
  retryMultimediaMessage: (localMessageID: string) => Promise<void>,
  clearURI: (uri: string) => Promise<void>,
|};

const chatInputStatePropType = PropTypes.shape({
  pendingUploads: pendingMultimediaUploadsPropType.isRequired,
  sendMultimediaMessage: PropTypes.func.isRequired,
  messageHasUploadFailure: PropTypes.func.isRequired,
  retryMultimediaMessage: PropTypes.func.isRequired,
  clearURI: PropTypes.func.isRequired,
});

const ChatInputStateContext = React.createContext<?ChatInputState>(null);

function withChatInputState<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(Component: ComponentType): React.ComponentType<$Diff<
  React.ElementConfig<ComponentType>,
  { chatInputState: ?ChatInputState },
>> {
  class ChatInputStateHOC extends React.PureComponent<$Diff<
    React.ElementConfig<ComponentType>,
    { chatInputState: ?ChatInputState },
  >> {
    render() {
      return (
        <ChatInputStateContext.Consumer>
          {value => (<Component {...this.props} chatInputState={value} />)}
        </ChatInputStateContext.Consumer>
      );
    }
  }
  return ChatInputStateHOC;
}

export {
  messagePendingUploadsPropType,
  pendingMultimediaUploadPropType,
  chatInputStatePropType,
  ChatInputStateContext,
  withChatInputState,
};
