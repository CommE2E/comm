// @flow

import * as React from 'react';

import type { NativeMediaSelection } from 'lib/types/media-types';
import type { RawTextMessageInfo } from 'lib/types/messages/text';

export type MultimediaProcessingStep = 'transcoding' | 'uploading';

export type PendingMultimediaUpload = {|
  +failed: ?string,
  +progressPercent: number,
  +processingStep: ?MultimediaProcessingStep,
|};

export type MessagePendingUploads = {|
  [localUploadID: string]: PendingMultimediaUpload,
|};

export type PendingMultimediaUploads = {
  [localMessageID: string]: MessagePendingUploads,
};

export type InputState = {|
  +pendingUploads: PendingMultimediaUploads,
  +sendTextMessage: (messageInfo: RawTextMessageInfo) => void,
  +sendMultimediaMessage: (
    threadID: string,
    selections: $ReadOnlyArray<NativeMediaSelection>,
  ) => Promise<void>,
  +addReply: (text: string) => void,
  +addReplyListener: ((message: string) => void) => void,
  +removeReplyListener: ((message: string) => void) => void,
  +messageHasUploadFailure: (localMessageID: string) => boolean,
  +retryMessage: (localMessageID: string) => Promise<void>,
  +registerSendCallback: (() => void) => void,
  +unregisterSendCallback: (() => void) => void,
  +uploadInProgress: () => boolean,
  +reportURIDisplayed: (uri: string, loaded: boolean) => void,
|};

const InputStateContext = React.createContext<?InputState>(null);

export { InputStateContext };
