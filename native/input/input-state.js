// @flow

import * as React from 'react';

import type { NativeMediaSelection } from 'lib/types/media-types.js';
import type { RawTextMessageInfo } from 'lib/types/messages/text.js';
import type { MinimallyEncodedThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { LegacyThreadInfo } from 'lib/types/thread-types.js';

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

export type EditInputBarMessageParameters = {
  +message: string,
  +mode: 'prepend' | 'replace',
};

export type InputState = {
  +pendingUploads: PendingMultimediaUploads,
  +sendTextMessage: (
    messageInfo: RawTextMessageInfo,
    threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
    parentThreadInfo: ?LegacyThreadInfo | ?MinimallyEncodedThreadInfo,
  ) => Promise<void>,
  +sendMultimediaMessage: (
    selections: $ReadOnlyArray<NativeMediaSelection>,
    threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
  ) => Promise<void>,
  +editInputMessage: (params: EditInputBarMessageParameters) => void,
  +addEditInputMessageListener: (
    (params: EditInputBarMessageParameters) => void,
  ) => void,
  +removeEditInputMessageListener: (
    (params: EditInputBarMessageParameters) => void,
  ) => void,
  +messageHasUploadFailure: (localMessageID: string) => boolean,
  +retryMessage: (
    localMessageID: string,
    threadInfo: LegacyThreadInfo | MinimallyEncodedThreadInfo,
    parentThreadInfo: ?LegacyThreadInfo | ?MinimallyEncodedThreadInfo,
  ) => Promise<void>,
  +registerSendCallback: (() => void) => void,
  +unregisterSendCallback: (() => void) => void,
  +uploadInProgress: () => boolean,
  +reportURIDisplayed: (uri: string, loaded: boolean) => void,
  +setPendingThreadUpdateHandler: (
    threadID: string,
    pendingThreadUpdateHandler: ?(
      LegacyThreadInfo | MinimallyEncodedThreadInfo,
    ) => mixed,
  ) => void,
  +scrollToMessage: (messageKey: string) => void,
  +addScrollToMessageListener: ((messageKey: string) => void) => void,
  +removeScrollToMessageListener: ((messageKey: string) => void) => void,
};

const InputStateContext: React.Context<?InputState> =
  React.createContext<?InputState>(null);

export { InputStateContext };
