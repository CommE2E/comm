// @flow

import * as React from 'react';

import {
  type Dimensions,
  type EncryptedMediaType,
  type MediaMissionStep,
  type MediaType,
} from 'lib/types/media-types.js';
import type { RawTextMessageInfo } from 'lib/types/messages/text.js';
import type {
  RelativeMemberInfo,
  ThreadInfo,
} from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { ChatMentionCandidates } from 'lib/types/thread-types.js';

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
  +canBeSent: boolean,
  +progressPercent: number,
  // This is set once the network request begins and used if the upload is
  // cancelled
  +abort: ?() => void,
  +steps: MediaMissionStep[],
  +selectTime: number,
};

export type TypeaheadState = {
  +canBeVisible: boolean,
  +keepUpdatingThreadMembers: boolean,
  +frozenUserMentionsCandidates: $ReadOnlyArray<RelativeMemberInfo>,
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
    threadInfo: ThreadInfo,
    files: $ReadOnlyArray<File>,
  ) => Promise<boolean>,
  +cancelPendingUpload: (threadInfo: ThreadInfo, localUploadID: string) => void,
  +sendTextMessage: (
    messageInfo: RawTextMessageInfo,
    threadInfo: ThreadInfo,
    parentThreadInfo: ?ThreadInfo,
  ) => mixed,
  +createMultimediaMessage: (threadInfo: ThreadInfo) => void,
  +setDraft: (draft: string) => void,
  +setTextCursorPosition: (newPosition: number) => void,
  +messageHasUploadFailure: (localMessageID: string) => boolean,
  +retryMultimediaMessage: (
    localMessageID: string,
    threadInfo: ThreadInfo,
  ) => void,
  +addReply: (text: string) => void,
  +addReplyListener: ((message: string) => void) => void,
  +removeReplyListener: ((message: string) => void) => void,
  +registerSendCallback: (() => mixed) => void,
  +unregisterSendCallback: (() => mixed) => void,
};

export type TypeaheadInputState = {
  +typeaheadState: TypeaheadState,
  +setTypeaheadState: (Partial<TypeaheadState>) => void,
};

// This type represents the input state for a particular thread
export type InputState = {
  ...BaseInputState,
  ...TypeaheadInputState,
};

const InputStateContext: React.Context<?InputState> =
  React.createContext<?InputState>(null);

export { InputStateContext };
