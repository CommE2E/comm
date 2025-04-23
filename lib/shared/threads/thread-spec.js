// @flow

import { type ProcessHolders } from '../../actions/holder-actions.js';
import {
  type LegacySendMultimediaMessageInput,
  type SendMultimediaMessageInput,
  type SendTextMessageInput,
} from '../../actions/message-actions.js';
import { type MediaMetadataReassignmentAction } from '../../actions/upload-actions.js';
import type { ProcessOutboundP2PMessagesResult } from '../../tunnelbroker/peer-to-peer-context.js';
import type {
  SendMessageResult,
  SendMessagePayload,
  RawMultimediaMessageInfo,
  SendMultimediaMessagePayload,
} from '../../types/message-types.js';
import type { RawTextMessageInfo } from '../../types/messages/text.js';
import type {
  RawThreadInfo,
  ThreadInfo,
} from '../../types/minimally-encoded-thread-permissions-types.js';
import type { Dispatch } from '../../types/redux-types.js';
import type { OutboundComposableDMOperationSpecification } from '../dm-ops/dm-op-types.js';

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

export type ThreadProtocol = {
  +sendTextMessage: (
    message: ProtocolSendTextMessageInput,
    utils: SendTextMessageUtils,
  ) => Promise<SendMessagePayload>,
  +sendMultimediaMessage: (
    message: ProtocolSendMultimediaMessageInput,
    utils: SendMultimediaMessageUtils,
  ) => Promise<SendMultimediaMessagePayload>,
};

export type ThreadSpec = {
  +traits: $ReadOnlySet<ThreadTrait>,
  +protocol: ThreadProtocol,
};
