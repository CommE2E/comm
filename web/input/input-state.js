// @flow

import * as React from 'react';

import {
  type MediaType,
  type EncryptedMediaType,
  type Dimensions,
  type MediaMissionStep,
} from 'lib/types/media-types.js';
import type { RawTextMessageInfo } from 'lib/types/messages/text.js';
import type {
  MinimallyEncodedRelativeMemberInfo,
  MinimallyEncodedThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type {
  ThreadInfo,
  RelativeMemberInfo,
  ChatMentionCandidates,
} from 'lib/types/thread-types.js';

export type PendingMultimediaUpload = {
  +localID: string,
  // Pending uploads are assigned a serverID once they are complete
  +serverID: ?string,
  // Pending uploads are assigned a messageID once they are sent
  +messageID: ?string,
  // This is set to true if the upload fails for whatever reason
  +failed: boolean,
  +file: File,
  +mediaType: MediaType | EncryptedMediaType,
  +dimensions: ?Dimensions,
  +uri: string,
  +blobHolder: ?string,
  +blobHash: ?string,
  +encryptionKey: ?string,
  +thumbHash: ?string,
  +loop: boolean,
  // URLs created with createObjectURL aren't considered "real". The distinction
  // is required because those "fake" URLs must be disposed properly
  +uriIsReal: boolean,
  +progressPercent: number,
  // This is set once the network request begins and used if the upload is
  // cancelled
  +abort: ?() => void,
  +steps: MediaMissionStep[],
  +selectTime: number,
  +shouldEncrypt: boolean,
};

export type TypeaheadState = {
  +canBeVisible: boolean,
  +keepUpdatingThreadMembers: boolean,
  +frozenUserMentionsCandidates: $ReadOnlyArray<
    RelativeMemberInfo | MinimallyEncodedRelativeMemberInfo,
  >,
  +frozenChatMentionsCandidates: ChatMentionCandidates,
  +moveChoiceUp: ?() => void,
  +moveChoiceDown: ?() => void,
  +close: ?() => void,
  +accept: ?() => void,
};

export type BaseInputState = {
  +pendingUploads: $ReadOnlyArray<PendingMultimediaUpload>,
  +assignedUploads: {
    [messageID: string]: $ReadOnlyArray<PendingMultimediaUpload>,
  },
  +draft: string,
  +textCursorPosition: number,
  +appendFiles: (
    threadInfo: ThreadInfo | MinimallyEncodedThreadInfo,
    files: $ReadOnlyArray<File>,
  ) => Promise<boolean>,
  +cancelPendingUpload: (localUploadID: string) => void,
  +sendTextMessage: (
    messageInfo: RawTextMessageInfo,
    threadInfo: ThreadInfo | MinimallyEncodedThreadInfo,
    parentThreadInfo: ?ThreadInfo | ?MinimallyEncodedThreadInfo,
  ) => Promise<void>,
  +createMultimediaMessage: (
    localID: number,
    threadInfo: ThreadInfo | MinimallyEncodedThreadInfo,
  ) => void,
  +setDraft: (draft: string) => void,
  +setTextCursorPosition: (newPosition: number) => void,
  +messageHasUploadFailure: (localMessageID: string) => boolean,
  +retryMultimediaMessage: (
    localMessageID: string,
    threadInfo: ThreadInfo | MinimallyEncodedThreadInfo,
  ) => void,
  +addReply: (text: string) => void,
  +addReplyListener: ((message: string) => void) => void,
  +removeReplyListener: ((message: string) => void) => void,
  +registerSendCallback: (() => mixed) => void,
  +unregisterSendCallback: (() => mixed) => void,
};

export type TypeaheadInputState = {
  +typeaheadState: TypeaheadState,
  +setTypeaheadState: ($Shape<TypeaheadState>) => void,
};

// This type represents the input state for a particular thread
export type InputState = {
  ...BaseInputState,
  ...TypeaheadInputState,
};

const InputStateContext: React.Context<?InputState> =
  React.createContext<?InputState>(null);

export { InputStateContext };
