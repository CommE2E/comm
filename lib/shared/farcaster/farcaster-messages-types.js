// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import type {
  FarcasterDCUserBase,
  FarcasterMessageUserContext,
} from './farcaster-user-types.js';
import {
  FarcasterDCUserBaseValidator,
  farcasterMessageUserContextValidator,
} from './farcaster-user-types.js';
import { tShapeInexact, tFarcasterID } from '../../utils/validation-utils.js';

export const farcasterMessageTypes = Object.freeze({
  TEXT: 'text',
  GROUP_NAME_CHANGE: 'group_name_change',
  GROUP_MEMBERSHIP_ADDITION: 'group_membership_addition',
  GROUP_MEMBERSHIP_REMOVAL: 'group_membership_removal',
  PIN_MESSAGE: 'pin_message',
  MESSAGE_TTL_CHANGE: 'message_ttl_change',
  RICH_ANNOUNCEMENT: 'rich_announcement',
});
export type FarcasterMessageType = $Values<typeof farcasterMessageTypes>;

type FarcasterReaction = {
  +reaction: string,
  +count: number,
  ...
};
const farcasterReactionValidator: TInterface<FarcasterReaction> = tShapeInexact(
  {
    reaction: t.String,
    count: t.Number,
  },
);

type FarcasterMessageViewerContext = {
  +isLastReadMessage: boolean,
  +focused: boolean,
  +reactions: $ReadOnlyArray<string>,
  +isOptimistic?: boolean,
  ...
};
const farcasterMessageViewerContextValidator: TInterface<FarcasterMessageViewerContext> =
  tShapeInexact({
    isLastReadMessage: t.Boolean,
    focused: t.Boolean,
    reactions: t.list(t.String),
    isOptimistic: t.maybe(t.Boolean),
  });

type FarcasterMessageMedia = {
  +version: '2',
  +width: number,
  +height: number,
  +staticRaster: string,
  +mimeType?: string,
  ...
};
const farcasterMessageMediaValidator: TInterface<FarcasterMessageMedia> =
  tShapeInexact({
    version: t.enums.of(['2']),
    width: t.Number,
    height: t.Number,
    staticRaster: t.String,
    mimeType: t.maybe(t.String),
  });

type FarcasterMessageVideo = {
  +type: 'video',
  +url: string,
  +sourceUrl: string,
  +thumbnailUrl: string,
  +width: number,
  +height: number,
  +duration: number,
  ...
};
const farcasterMessageVideoValidator: TInterface<FarcasterMessageVideo> =
  tShapeInexact({
    type: t.enums.of(['video']),
    url: t.String,
    sourceUrl: t.String,
    thumbnailUrl: t.String,
    width: t.Number,
    height: t.Number,
    duration: t.Number,
  });

type FarcasterMessageMetadata = {
  +medias?: $ReadOnlyArray<FarcasterMessageMedia>,
  +videos?: $ReadOnlyArray<FarcasterMessageVideo>,
  ...
};
const farcasterMessageMetadataValidator: TInterface<FarcasterMessageMetadata> =
  tShapeInexact({
    medias: t.maybe(t.list(farcasterMessageMediaValidator)),
    videos: t.maybe(t.list(farcasterMessageVideoValidator)),
  });

type FarcasterMentionMetadata = {
  +user: FarcasterDCUserBase,
  +textIndex: number,
  +length: number,
  ...
};
const farcasterMentionMetadataValidator: TInterface<FarcasterMentionMetadata> =
  tShapeInexact({
    user: FarcasterDCUserBaseValidator,
    textIndex: t.Number,
    length: t.Number,
  });

export type FarcasterMessage = {
  +conversationId: string,
  +senderFid: number,
  +messageId: string,
  +serverTimestamp: number,
  +type: FarcasterMessageType,
  +message: string,
  +hasMention: boolean,
  +reactions: $ReadOnlyArray<FarcasterReaction>,
  +metadata?: FarcasterMessageMetadata,
  +viewerContext?: FarcasterMessageViewerContext,
  +isPinned: boolean,
  +isDeleted: boolean,
  +senderContext: FarcasterMessageUserContext,
  +actionTargetUserContext?: FarcasterMessageUserContext,
  +isProgrammatic?: boolean,
  +mentions?: $ReadOnlyArray<FarcasterMentionMetadata>,
  +inReplyTo?: FarcasterMessage,
  ...
};
const farcasterMessageValidator: TInterface<FarcasterMessage> = tShapeInexact({
  conversationId: t.String,
  senderFid: tFarcasterID,
  messageId: t.String,
  serverTimestamp: t.Number,
  type: t.enums.of([
    'text',
    'group_name_change',
    'group_membership_addition',
    'group_membership_removal',
    'pin_message',
    'message_ttl_change',
    'rich_announcement',
  ]),
  message: t.String,
  hasMention: t.Boolean,
  reactions: t.list(farcasterReactionValidator),
  metadata: t.maybe(farcasterMessageMetadataValidator),
  viewerContext: t.maybe(farcasterMessageViewerContextValidator),
  isPinned: t.Boolean,
  isDeleted: t.Boolean,
  senderContext: farcasterMessageUserContextValidator,
  actionTargetUserContext: t.maybe(farcasterMessageUserContextValidator),
  isProgrammatic: t.maybe(t.Boolean),
  mentions: t.maybe(t.list(farcasterMentionMetadataValidator)),
});

export { farcasterMessageValidator };
