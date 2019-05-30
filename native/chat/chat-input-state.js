// @flow

import type { Dimensions } from 'lib/types/media-types';
import type { GalleryImageInfo } from '../media/image-gallery-image.react';

import * as React from 'react';
import PropTypes from 'prop-types';

export type PendingMultimediaUpload = {|
  failed: ?string,
  progressPercent: number,
|};

const pendingMultimediaUploadPropType = PropTypes.shape({
  failed: PropTypes.string,
  progressPercent: PropTypes.number.isRequired,
});

export type PendingMultimediaUploads = {
  [localMessageID: string]: {
    [localUploadID: string]: PendingMultimediaUpload,
  },
};

const pendingMultimediaUploadsPropType = PropTypes.objectOf(
  PropTypes.objectOf(pendingMultimediaUploadPropType),
);

export type ChatInputState = {|
  pendingUploads: PendingMultimediaUploads,
  sendMultimediaMessage: (
    threadID: string,
    imageInfos: $ReadOnlyArray<GalleryImageInfo>,
  ) => Promise<void>,
  messageHasUploadFailure: (localMessageID: string) => bool,
  retryMultimediaMessage: (localMessageID: string) => Promise<void>,
|};

const chatInputStatePropType = PropTypes.shape({
  pendingUploads: pendingMultimediaUploadsPropType.isRequired,
  sendMultimediaMessage: PropTypes.func.isRequired,
  messageHasUploadFailure: PropTypes.func.isRequired,
  retryMultimediaMessage: PropTypes.func.isRequired,
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
  pendingMultimediaUploadPropType,
  chatInputStatePropType,
  ChatInputStateContext,
  withChatInputState,
};
