// @flow

import {
  type MediaType,
  mediaTypePropType,
  type Dimensions,
  dimensionsPropType,
  type MediaMissionStep,
  mediaMissionStepPropType,
} from 'lib/types/media-types';
import type { RawTextMessageInfo } from 'lib/types/message-types';

import * as React from 'react';
import PropTypes from 'prop-types';

export type PendingMultimediaUpload = {|
  localID: string,
  // Pending uploads are assigned a serverID once they are complete
  serverID: ?string,
  // Pending uploads are assigned a messageID once they are sent
  messageID: ?string,
  // This is set to truthy if the upload fails for whatever reason
  failed: ?string,
  file: File,
  mediaType: MediaType,
  dimensions: ?Dimensions,
  uri: string,
  loop: boolean,
  // URLs created with createObjectURL aren't considered "real". The distinction
  // is required because those "fake" URLs must be disposed properly
  uriIsReal: boolean,
  progressPercent: number,
  // This is set once the network request begins and used if the upload is
  // cancelled
  abort: ?() => void,
  steps: MediaMissionStep[],
  selectTime: number,
|};
const pendingMultimediaUploadPropType = PropTypes.shape({
  localID: PropTypes.string.isRequired,
  serverID: PropTypes.string,
  messageID: PropTypes.string,
  failed: PropTypes.string,
  file: PropTypes.object.isRequired,
  mediaType: mediaTypePropType.isRequired,
  dimensions: dimensionsPropType,
  uri: PropTypes.string.isRequired,
  loop: PropTypes.bool.isRequired,
  uriIsReal: PropTypes.bool.isRequired,
  progressPercent: PropTypes.number.isRequired,
  abort: PropTypes.func,
  steps: PropTypes.arrayOf(mediaMissionStepPropType).isRequired,
  selectTime: PropTypes.number.isRequired,
});

// This type represents the input state for a particular thread
export type InputState = {|
  pendingUploads: $ReadOnlyArray<PendingMultimediaUpload>,
  assignedUploads: {
    [messageID: string]: $ReadOnlyArray<PendingMultimediaUpload>,
  },
  draft: string,
  appendFiles: (files: $ReadOnlyArray<File>) => Promise<boolean>,
  cancelPendingUpload: (localUploadID: string) => void,
  sendTextMessage: (messageInfo: RawTextMessageInfo) => void,
  createMultimediaMessage: (localID: number) => void,
  setDraft: (draft: string) => void,
  messageHasUploadFailure: (localMessageID: string) => boolean,
  retryMultimediaMessage: (localMessageID: string) => void,
  addReply: (text: string) => void,
  addReplyListener: ((message: string) => void) => void,
  removeReplyListener: ((message: string) => void) => void,
|};
const arrayOfUploadsPropType = PropTypes.arrayOf(
  pendingMultimediaUploadPropType,
);
const inputStatePropType = PropTypes.shape({
  pendingUploads: arrayOfUploadsPropType.isRequired,
  assignedUploads: PropTypes.objectOf(arrayOfUploadsPropType).isRequired,
  draft: PropTypes.string.isRequired,
  appendFiles: PropTypes.func.isRequired,
  cancelPendingUpload: PropTypes.func.isRequired,
  sendTextMessage: PropTypes.func.isRequired,
  createMultimediaMessage: PropTypes.func.isRequired,
  setDraft: PropTypes.func.isRequired,
  messageHasUploadFailure: PropTypes.func.isRequired,
  retryMultimediaMessage: PropTypes.func.isRequired,
  addReply: PropTypes.func.isRequired,
  addReplyListener: PropTypes.func.isRequired,
  removeReplyListener: PropTypes.func.isRequired,
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
  pendingMultimediaUploadPropType,
  inputStatePropType,
  InputStateContext,
  withInputState,
};
