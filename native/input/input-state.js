// @flow

import PropTypes from 'prop-types';
import * as React from 'react';

import type { NativeMediaSelection } from 'lib/types/media-types';
import type { RawTextMessageInfo } from 'lib/types/messages/text';

export type MultimediaProcessingStep = 'transcode' | 'upload';

export type PendingMultimediaUpload = {|
  +failed: ?string,
  +progressPercent: number,
  +processingStep: ?MultimediaProcessingStep,
|};

const pendingMultimediaUploadPropType = PropTypes.shape({
  failed: PropTypes.string,
  progressPercent: PropTypes.number.isRequired,
  processingStep: PropTypes.oneOf(['transcode', 'upload']),
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
    selections: $ReadOnlyArray<NativeMediaSelection>,
  ) => Promise<void>,
  addReply: (text: string) => void,
  addReplyListener: ((message: string) => void) => void,
  removeReplyListener: ((message: string) => void) => void,
  messageHasUploadFailure: (localMessageID: string) => boolean,
  retryMultimediaMessage: (localMessageID: string) => Promise<void>,
  registerSendCallback: (() => void) => void,
  unregisterSendCallback: (() => void) => void,
  uploadInProgress: () => boolean,
  reportURIDisplayed: (uri: string, loaded: boolean) => void,
|};

const inputStatePropType = PropTypes.shape({
  pendingUploads: pendingMultimediaUploadsPropType.isRequired,
  sendTextMessage: PropTypes.func.isRequired,
  sendMultimediaMessage: PropTypes.func.isRequired,
  addReply: PropTypes.func.isRequired,
  addReplyListener: PropTypes.func.isRequired,
  removeReplyListener: PropTypes.func.isRequired,
  messageHasUploadFailure: PropTypes.func.isRequired,
  retryMultimediaMessage: PropTypes.func.isRequired,
  uploadInProgress: PropTypes.func.isRequired,
  reportURIDisplayed: PropTypes.func.isRequired,
});

const InputStateContext = React.createContext<?InputState>(null);

export {
  messagePendingUploadsPropType,
  pendingMultimediaUploadPropType,
  inputStatePropType,
  InputStateContext,
};
