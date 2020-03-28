// @flow

import type { MediaSelection } from 'lib/types/media-types';
import type { RawTextMessageInfo } from 'lib/types/message-types';

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
  sendTextMessage: (messageInfo: RawTextMessageInfo) => void,
  sendMultimediaMessage: (
    threadID: string,
    selections: $ReadOnlyArray<MediaSelection>,
  ) => Promise<void>,
  messageHasUploadFailure: (localMessageID: string) => boolean,
  retryMultimediaMessage: (localMessageID: string) => Promise<void>,
  registerSendCallback: (() => void) => void,
|};

const chatInputStatePropType = PropTypes.shape({
  pendingUploads: pendingMultimediaUploadsPropType.isRequired,
  sendTextMessage: PropTypes.func.isRequired,
  sendMultimediaMessage: PropTypes.func.isRequired,
  messageHasUploadFailure: PropTypes.func.isRequired,
  retryMultimediaMessage: PropTypes.func.isRequired,
});

const ChatInputStateContext = React.createContext<?ChatInputState>(null);

function withChatInputState<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(
  Component: ComponentType,
): React.ComponentType<
  $Diff<
    React.ElementConfig<ComponentType>,
    { chatInputState: ?ChatInputState },
  >,
> {
  class ChatInputStateHOC extends React.PureComponent<
    $Diff<
      React.ElementConfig<ComponentType>,
      { chatInputState: ?ChatInputState },
    >,
  > {
    render() {
      return (
        <ChatInputStateContext.Consumer>
          {value => <Component {...this.props} chatInputState={value} />}
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
