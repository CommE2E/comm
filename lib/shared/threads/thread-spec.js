// @flow

import type { SendTextMessageInput } from '../../actions/message-actions';
import type { ProcessOutboundP2PMessagesResult } from '../../tunnelbroker/peer-to-peer-context.js';
import type {
  SendMessageResult,
  SendMessagePayload,
} from '../../types/message-types';
import type { RawTextMessageInfo } from '../../types/messages/text.js';
import type { ThreadInfo } from '../../types/minimally-encoded-thread-permissions-types.js';
import type { OutboundComposableDMOperationSpecification } from '../dm-ops/dm-op-types.js';

export type ThreadTrait =
  | 'sidebar'
  | 'community'
  | 'announcement'
  | 'personal'
  | 'private'
  | 'communitySubthread';

export type ProtocolSendTextMessageTypeInput = {
  +messageInfo: RawTextMessageInfo,
  +threadInfo: ThreadInfo,
  +parentThreadInfo: ?ThreadInfo,
  +sidebarCreation: boolean,
};
export type SendTextMessageUtils = {
  +sendKeyserverTextMessage: SendTextMessageInput => Promise<SendMessageResult>,
  +sendComposableDMOperation: OutboundComposableDMOperationSpecification => Promise<ProcessOutboundP2PMessagesResult>,
};
export type ThreadProtocol = {
  +sendTextMessage: (
    message: ProtocolSendTextMessageTypeInput,
    utils: SendTextMessageUtils,
  ) => Promise<SendMessagePayload>,
};

export type ThreadSpec = {
  +traits: $ReadOnlySet<ThreadTrait>,
  +protocol: ThreadProtocol,
};
