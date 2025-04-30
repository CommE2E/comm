// @flow

import * as React from 'react';

import type { UseSetThreadUnreadStatusInput } from '../../actions/activity-actions.js';
import type {
  UseCreateEntryInput,
  UseDeleteEntryInput,
  UseSaveEntryInput,
} from '../../actions/entry-actions.js';
import { type ProcessHolders } from '../../actions/holder-actions.js';
import {
  type LegacySendMultimediaMessageInput,
  type SendMultimediaMessageInput,
  type SendTextMessageInput,
} from '../../actions/message-actions.js';
import { type MediaMetadataReassignmentAction } from '../../actions/upload-actions.js';
import type { UseUpdateSubscriptionInput } from '../../actions/user-actions.js';
import type {
  UseChangeThreadSettingsInput,
  LeaveThreadInput,
  LeaveThreadResult,
} from '../../hooks/thread-hooks.js';
import type { ProcessOutboundP2PMessagesResult } from '../../tunnelbroker/peer-to-peer-context.js';
import type { TunnelbrokerSocketState } from '../../tunnelbroker/tunnelbroker-context.js';
import type {
  SetThreadUnreadStatusPayload,
  SetThreadUnreadStatusRequest,
} from '../../types/activity-types.js';
import type {
  CreateEntryInfo,
  CreateEntryPayload,
  DeleteEntryInfo,
  DeleteEntryResult,
  RawEntryInfo,
  SaveEntryInfo,
  SaveEntryResult,
} from '../../types/entry-types.js';
import type {
  SendMessageResult,
  SendMessagePayload,
  RawMultimediaMessageInfo,
  SendMultimediaMessagePayload,
  SendEditMessageRequest,
  SendEditMessageResult,
  SendReactionMessageRequest,
} from '../../types/message-types.js';
import type { RawTextMessageInfo } from '../../types/messages/text.js';
import type {
  RawThreadInfo,
  ThreadInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from '../../types/redux-types.js';
import type {
  SubscriptionUpdateRequest,
  SubscriptionUpdateResult,
} from '../../types/subscription-types.js';
import type { ThreadType } from '../../types/thread-types-enum.js';
import type {
  ChangeThreadSettingsPayload,
  LeaveThreadPayload,
  UpdateThreadRequest,
} from '../../types/thread-types.js';
import type { DispatchActionPromise } from '../../utils/redux-promise-utils.js';
import type {
  OutboundComposableDMOperationSpecification,
  OutboundDMOperationSpecification,
} from '../dm-ops/dm-op-types.js';

export type ThreadTrait =
  | 'sidebar'
  | 'community'
  | 'announcement'
  | 'personal'
  | 'private'
  | 'communitySubthread';

export type ProtocolSendTextMessageInput = {
  +messageInfo: RawTextMessageInfo,
  +threadInfo: ThreadInfo,
  +parentThreadInfo: ?ThreadInfo,
  +sidebarCreation: boolean,
};
export type SendTextMessageUtils = {
  +sendKeyserverTextMessage: SendTextMessageInput => Promise<SendMessageResult>,
  +sendComposableDMOperation: OutboundComposableDMOperationSpecification => Promise<ProcessOutboundP2PMessagesResult>,
};

export type ProtocolSendMultimediaMessageInput = {
  +messageInfo: RawMultimediaMessageInfo,
  +sidebarCreation: boolean,
  +isLegacy: boolean,
  +threadInfo: RawThreadInfo,
};
export type SendMultimediaMessageUtils = {
  +sendKeyserverMultimediaMessage: SendMultimediaMessageInput => Promise<SendMessageResult>,
  +legacyKeyserverSendMultimediaMessage: LegacySendMultimediaMessageInput => Promise<SendMessageResult>,
  +sendComposableDMOperation: OutboundComposableDMOperationSpecification => Promise<ProcessOutboundP2PMessagesResult>,
  +reassignThickThreadMedia: MediaMetadataReassignmentAction,
  +processHolders: ProcessHolders,
  +dispatch: Dispatch,
};

export type ProtocolEditTextMessageInput = {
  +messageID: string,
  +newText: string,
  +threadInfo: ThreadInfo,
  +viewerID: ?string,
};
export type EditTextMessageUtils = {
  +keyserverEditMessage: SendEditMessageRequest => Promise<SendEditMessageResult>,
  +dispatchActionPromise: DispatchActionPromise,
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
};

export type ProtocolChangeThreadSettingsInput = {
  +input: UseChangeThreadSettingsInput,
  +viewerID: ?string,
};
export type ChangeThreadSettingsUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverChangeThreadSettings: UpdateThreadRequest => Promise<ChangeThreadSettingsPayload>,
};

export type ProtocolCreateEntryInput = {
  +input: UseCreateEntryInput,
  +viewerID: ?string,
};
export type CreateEntryUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverCreateEntry: CreateEntryInfo => Promise<CreateEntryPayload>,
};

export type ProtocolDeleteEntryInput = {
  +input: UseDeleteEntryInput,
  +viewerID: ?string,
  +originalEntry: RawEntryInfo,
};
export type DeleteEntryUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverDeleteEntry: DeleteEntryInfo => Promise<DeleteEntryResult>,
};

export type ProtocolEditEntryInput = {
  +input: UseSaveEntryInput,
  +viewerID: ?string,
  +originalEntry: RawEntryInfo,
};
export type EditEntryUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverEditEntry: SaveEntryInfo => Promise<SaveEntryResult>,
};

export type ProtocolSetThreadUnreadStatusInput = {
  +input: UseSetThreadUnreadStatusInput,
  +viewerID: ?string,
};
export type SetThreadUnreadStatusUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverSetThreadUnreadStatus: SetThreadUnreadStatusRequest => Promise<SetThreadUnreadStatusPayload>,
};

export type ProtocolSendReactionInput = {
  +messageID: string,
  +threadInfo: ThreadInfo,
  +reaction: string,
  +action: 'remove_reaction' | 'add_reaction',
  +viewerID: string,
  +showErrorAlert: () => mixed,
};
export type SendReactionUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverSendReaction: SendReactionMessageRequest => Promise<SendMessageResult>,
  +dispatchActionPromise: DispatchActionPromise,
};

export type ProtocolAddThreadMembersInput = {
  +threadInfo: ThreadInfo,
  +newMemberIDs: $ReadOnlyArray<string>,
};
export type AddThreadMembersUtils = {
  +dmAddThreadMembers: (
    newMemberIDs: $ReadOnlyArray<string>,
    threadInfo: ThreadInfo,
  ) => Promise<void>,
  +changeThreadSettings: UseChangeThreadSettingsInput => Promise<ChangeThreadSettingsPayload>,
  +dispatchActionPromise: DispatchActionPromise,
};

export type ProtocolUpdateSubscriptionInput = {
  +input: UseUpdateSubscriptionInput,
  +viewerID: ?string,
};
export type UpdateSubscriptionUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverUpdateSubscription: SubscriptionUpdateRequest => Promise<SubscriptionUpdateResult>,
};

export type ProtocolLeaveThreadInput = {
  +threadInfo: ThreadInfo,
  +viewerID: ?string,
};
export type LeaveThreadUtils = {
  +processAndSendDMOperation: OutboundDMOperationSpecification => Promise<void>,
  +keyserverLeaveThread: LeaveThreadInput => Promise<LeaveThreadPayload>,
  +dispatchActionPromise: DispatchActionPromise,
};

export type ThreadProtocol = {
  +sendTextMessage: (
    message: ProtocolSendTextMessageInput,
    utils: SendTextMessageUtils,
  ) => Promise<SendMessagePayload>,
  +sendMultimediaMessage: (
    message: ProtocolSendMultimediaMessageInput,
    utils: SendMultimediaMessageUtils,
  ) => Promise<SendMultimediaMessagePayload>,
  +editTextMessage: (
    message: ProtocolEditTextMessageInput,
    utils: EditTextMessageUtils,
  ) => Promise<void>,
  +changeThreadSettings: (
    input: ProtocolChangeThreadSettingsInput,
    utils: ChangeThreadSettingsUtils,
  ) => Promise<ChangeThreadSettingsPayload>,
  +supportsCalendarHistory: boolean,
  +calendarIsOnline: (
    tunnelbrokerSocketState: TunnelbrokerSocketState,
    isKeyserverConnected: boolean,
  ) => boolean,
  +createCalendarEntry: (
    input: ProtocolCreateEntryInput,
    utils: CreateEntryUtils,
  ) => Promise<CreateEntryPayload>,
  +deleteCalendarEntry: (
    input: ProtocolDeleteEntryInput,
    utils: DeleteEntryUtils,
  ) => Promise<DeleteEntryResult>,
  +editCalendarEntry: (
    input: ProtocolEditEntryInput,
    utils: EditEntryUtils,
  ) => Promise<SaveEntryResult>,
  +setThreadUnreadStatus: (
    input: ProtocolSetThreadUnreadStatusInput,
    utils: SetThreadUnreadStatusUtils,
  ) => Promise<SetThreadUnreadStatusPayload>,
  +sendReaction: (
    input: ProtocolSendReactionInput,
    utils: SendReactionUtils,
  ) => Promise<mixed>,
  +addThreadMembers: (
    input: ProtocolAddThreadMembersInput,
    utils: AddThreadMembersUtils,
  ) => Promise<void>,
  +updateSubscription: (
    input: ProtocolUpdateSubscriptionInput,
    utils: UpdateSubscriptionUtils,
  ) => Promise<SubscriptionUpdateResult>,
  +leaveThread: (
    input: ProtocolLeaveThreadInput,
    utils: LeaveThreadUtils,
  ) => Promise<LeaveThreadResult>,
  +allowsDeletingSidebarSource: boolean,
  +presentationDetails: {
    +membershipChangesShownInThreadPreview: boolean,
    +usersWithoutDeviceListExcludedFromSearchResult: boolean,
    +supportsMediaGallery: boolean,
    +chatThreadListIcon: string,
    +threadAncestorLabel: (ancestorPath: React.Node) => React.Node,
  },
  +uploadMultimediaToKeyserver: boolean,
  +canActionsTargetPendingMessages: boolean,
  +sidebarConfig: {
    +sidebarThreadType: ThreadType,
    +pendingSidebarURLPrefix: string,
  },
  +shouldPerformSideEffectsBeforeSendingMessage: boolean,
  +messagesStoredOnServer: boolean,
};

export type ThreadSpec = {
  +traits: $ReadOnlySet<ThreadTrait>,
  +protocol: ThreadProtocol,
  +threadLabel: string,
};
