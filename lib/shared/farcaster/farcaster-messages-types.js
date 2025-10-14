// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import type { FarcasterMessageUserContext } from './farcaster-user-types.js';
import { farcasterMessageUserContextValidator } from './farcaster-user-types.js';
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
  +reactions: $ReadOnlyArray<string>,
  ...
};
const farcasterMessageViewerContextValidator: TInterface<FarcasterMessageViewerContext> =
  tShapeInexact({
    reactions: t.list(t.String),
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

export type FarcasterMessage = {
  +conversationId: string,
  +senderFid: number,
  +messageId: string,
  +serverTimestamp: number,
  +type: FarcasterMessageType,
  +message: string,
  +reactions: $ReadOnlyArray<FarcasterReaction>,
  +metadata?: FarcasterMessageMetadata,
  +viewerContext?: FarcasterMessageViewerContext,
  +isPinned: boolean,
  +isDeleted: boolean,
  +actionTargetUserContext?: FarcasterMessageUserContext,
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
  reactions: t.list(farcasterReactionValidator),
  metadata: t.maybe(farcasterMessageMetadataValidator),
  viewerContext: t.maybe(farcasterMessageViewerContextValidator),
  isPinned: t.Boolean,
  isDeleted: t.Boolean,
  actionTargetUserContext: t.maybe(farcasterMessageUserContextValidator),
});

export { farcasterMessageValidator };
