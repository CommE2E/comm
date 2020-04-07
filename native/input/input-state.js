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

export type InputState = {|
  pendingUploads: PendingMultimediaUploads,
  sendTextMessage: (messageInfo: RawTextMessageInfo) => void,
  sendMultimediaMessage: (
    threadID: string,
    selections: $ReadOnlyArray<MediaSelection>,
  ) => Promise<void>,
  messageHasUploadFailure: (localMessageID: string) => boolean,
  retryMultimediaMessage: (localMessageID: string) => Promise<void>,
  registerSendCallback: (() => void) => void,
  unregisterSendCallback: (() => void) => void,
  uploadInProgress: boolean,
|};

const inputStatePropType = PropTypes.shape({
  pendingUploads: pendingMultimediaUploadsPropType.isRequired,
  sendTextMessage: PropTypes.func.isRequired,
  sendMultimediaMessage: PropTypes.func.isRequired,
  messageHasUploadFailure: PropTypes.func.isRequired,
  retryMultimediaMessage: PropTypes.func.isRequired,
  uploadInProgress: PropTypes.bool.isRequired,
});

const InputStateContext = React.createContext<?InputState>(null);

function withInputState<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(
  Component: ComponentType,
): React.ComponentType<
  $Diff<React.ElementConfig<ComponentType>, { inputState: ?InputState }>,
> {
  class InputStateHOC extends React.PureComponent<
    $Diff<React.ElementConfig<ComponentType>, { inputState: ?InputState }>,
  > {
    render() {
      return (
        <InputStateContext.Consumer>
          {value => <Component {...this.props} inputState={value} />}
        </InputStateContext.Consumer>
      );
    }
  }
  return InputStateHOC;
}

export {
  messagePendingUploadsPropType,
  pendingMultimediaUploadPropType,
  inputStatePropType,
  InputStateContext,
  withInputState,
};
