// @flow

import { type Dimensions, dimensionsPropType } from 'lib/types/media-types';

import * as React from 'react';
import PropTypes from 'prop-types';

export type PendingMultimediaUpload = {|
  failed: ?string,
  progressPercent: number,
|};

export type ClientPhotoInfo = {|
  type: "photo",
  uri: string,
  dimensions: Dimensions,
  filename: string,
  unlinkURIAfterRemoving?: ?bool,
|};

export type ClientVideoInfo = {|
  type: "video",
  uri: string,
  dimensions: Dimensions,
  filename: string,
  unlinkURIAfterRemoving?: ?bool,
|};

export type ClientMediaInfo =
  | ClientPhotoInfo
  | ClientVideoInfo;

export const clientMediaInfoPropType = PropTypes.oneOfType([
  PropTypes.shape({
    type: PropTypes.oneOf([ "photo" ]).isRequired,
    uri: PropTypes.string.isRequired,
    dimensions: dimensionsPropType.isRequired,
    filename: PropTypes.string.isRequired,
    unlinkURIAfterRemoving: PropTypes.bool,
  }),
  PropTypes.shape({
    type: PropTypes.oneOf([ "video" ]).isRequired,
    uri: PropTypes.string.isRequired,
    dimensions: dimensionsPropType.isRequired,
    filename: PropTypes.string.isRequired,
    unlinkURIAfterRemoving: PropTypes.bool,
  }),
]);

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
    mediaInfos: $ReadOnlyArray<ClientMediaInfo>,
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
  messagePendingUploadsPropType,
  pendingMultimediaUploadPropType,
  chatInputStatePropType,
  ChatInputStateContext,
  withChatInputState,
};
