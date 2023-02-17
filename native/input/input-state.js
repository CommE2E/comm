// @flow

import * as React from 'react';

import type { NativeMediaSelection } from 'lib/types/media-types.js';
import type { RawTextMessageInfo } from 'lib/types/messages/text.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

export type MultimediaProcessingStep = 'transcoding' | 'uploading';

export type PendingMultimediaUpload = {
  +failed: boolean,
  +progressPercent: number,
  +processingStep: ?MultimediaProcessingStep,
};

export type MessagePendingUploads = {
  [localUploadID: string]: PendingMultimediaUpload,
};

export type PendingMultimediaUploads = {
  [localMessageID: string]: MessagePendingUploads,
};

export type InputState = {
  +pendingUploads: PendingMultimediaUploads,
  +sendTextMessage: (
    messageInfo: RawTextMessageInfo,
    threadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
  ) => Promise<void>,
  +sendMultimediaMessage: (
    selections: $ReadOnlyArray<NativeMediaSelection>,
    threadInfo: ThreadInfo,
  ) => Promise<void>,
  +addReply: (text: string) => void,
  +addReplyListener: ((message: string) => void) => void,
  +removeReplyListener: ((message: string) => void) => void,
  +messageHasUploadFailure: (localMessageID: string) => boolean,
  +retryMessage: (
    localMessageID: string,
    threadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
  ) => Promise<void>,
  +registerSendCallback: (() => void) => void,
  +unregisterSendCallback: (() => void) => void,
  +uploadInProgress: () => boolean,
  +reportURIDisplayed: (uri: string, loaded: boolean) => void,
};

const InputStateContext: React.Context<?InputState> =
  React.createContext<?InputState>(null);

export { InputStateContext };
