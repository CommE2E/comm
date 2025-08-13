// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import type { FarcasterMessage } from './farcaster-messages-types.js';
import { farcasterMessageValidator } from './farcaster-messages-types.js';
import type {
  FarcasterDCUser,
  FarcasterDCUserMinimal,
} from './farcaster-user-types.js';
import {
  farcasterDCUserValidator,
  farcasterDCUserMinimalValidator,
} from './farcaster-user-types.js';
import { tShapeInexact } from '../../utils/validation-utils.js';

type FarcasterUnreadReactionMessage = {
  +fid: number,
  +displayName: string,
  +username: string,
  +reaction: string,
  +timestamp: number,
  +reactedMessageFid: number,
  +reactedMessage: string,
};
const farcasterUnreadReactionMessageValidator: TInterface<FarcasterUnreadReactionMessage> =
  tShapeInexact({
    fid: t.Number,
    displayName: t.String,
    username: t.String,
    reaction: t.String,
    timestamp: t.Number,
    reactedMessageFid: t.Number,
    reactedMessage: t.String,
  });

type FarcasterInboxViewerContext = {
  +category: 'default' | 'archived' | 'request',
  +lastReadAt: number,
  +muted: boolean,
  +manuallyMarkedUnread: boolean,
  +pinned: boolean,
  +unreadCount: number,
  +unreadMentionsCount: number,
  +unreadReactionMessage?: FarcasterUnreadReactionMessage,
  +counterParty?: FarcasterDCUser,
  +tag?: 'automated' | 'new-user',
};
const farcasterInboxViewerContextValidator: TInterface<FarcasterInboxViewerContext> =
  tShapeInexact({
    category: t.enums.of(['default', 'archived', 'request']),
    lastReadAt: t.Number,
    muted: t.Boolean,
    manuallyMarkedUnread: t.Boolean,
    pinned: t.Boolean,
    unreadCount: t.Number,
    unreadMentionsCount: t.Number,
    unreadReactionMessage: t.maybe(farcasterUnreadReactionMessageValidator),
    counterParty: t.maybe(farcasterDCUserValidator),
    tag: t.maybe(t.enums.of(['automated', 'new-user'])),
  });

export type FarcasterInboxConversation = {
  +conversationId: string,
  +name?: string,
  +description?: string,
  +photoUrl?: string,
  +adminFids: $ReadOnlyArray<number>,
  +lastReadTime: number,
  +lastMessage?: FarcasterMessage,
  +isGroup: boolean,
  +createdAt: number,
  +viewerContext: FarcasterInboxViewerContext,
};
const farcasterInboxConversationValidator: TInterface<FarcasterInboxConversation> =
  tShapeInexact({
    conversationId: t.String,
    name: t.maybe(t.String),
    description: t.maybe(t.String),
    photoUrl: t.maybe(t.String),
    adminFids: t.list(t.Number),
    lastReadTime: t.Number,
    lastMessage: t.maybe(farcasterMessageValidator),
    isGroup: t.Boolean,
    createdAt: t.Number,
    viewerContext: farcasterInboxViewerContextValidator,
  });

type FarcasterConversationViewerContext = {
  +access: 'read' | 'read-write' | 'admin',
  +category: 'default' | 'archived' | 'request',
  +archived: boolean,
  +lastReadAt: number,
  +muted: boolean,
  +manuallyMarkedUnread: boolean,
  +pinned: boolean,
  +unreadCount: number,
  +unreadMentionsCount: number,
  +unreadReactionMessage?: FarcasterUnreadReactionMessage,
  +counterParty?: FarcasterDCUser,
  +tag?: 'automated' | 'new-user',
  +inviter?: FarcasterDCUserMinimal,
};
const farcasterConversationViewerContextValidator: TInterface<FarcasterConversationViewerContext> =
  tShapeInexact({
    access: t.enums.of(['read', 'read-write', 'admin']),
    category: t.enums.of(['default', 'archived', 'request']),
    archived: t.Boolean,
    lastReadAt: t.Number,
    muted: t.Boolean,
    manuallyMarkedUnread: t.Boolean,
    pinned: t.Boolean,
    unreadCount: t.Number,
    unreadMentionsCount: t.Number,
    unreadReactionMessage: t.maybe(farcasterUnreadReactionMessageValidator),
    counterParty: t.maybe(farcasterDCUserValidator),
    tag: t.maybe(t.enums.of(['automated', 'new-user'])),
    inviter: t.maybe(farcasterDCUserMinimalValidator),
  });

type FarcasterConversationGroupPreferences = {
  +membersCanInvite: boolean,
  +periodicallyValidateMemberships: boolean,
  +onlyAdminsCanWrite: boolean,
};
const farcasterConversationGroupPreferencesValidator: TInterface<FarcasterConversationGroupPreferences> =
  tShapeInexact({
    membersCanInvite: t.Boolean,
    periodicallyValidateMemberships: t.Boolean,
    onlyAdminsCanWrite: t.Boolean,
  });

export type FarcasterConversation = {
  +conversationId: string,
  +name?: string,
  +description?: string,
  +photoUrl?: string,
  +adminFids: $ReadOnlyArray<number>,
  +removedFids: $ReadOnlyArray<number>,
  +participants: $ReadOnlyArray<FarcasterDCUser>,
  +lastReadTime: number,
  +selfLastReadTime: number,
  +lastMessage?: FarcasterMessage,
  +pinnedMessages: $ReadOnlyArray<FarcasterMessage>,
  +hasPinnedMessages: boolean,
  +isGroup: boolean,
  +groupPreferences?: FarcasterConversationGroupPreferences,
  +activeParticipantsCount: number,
  +messageTTLDays: 1 | 7 | 30 | 365 | 'Infinity',
  +createdAt: number,
  +unreadCount: number,
  +muted: boolean,
  +hasMention: boolean,
  +viewerContext: FarcasterConversationViewerContext,
  ...
};
const farcasterConversationValidator: TInterface<FarcasterConversation> =
  tShapeInexact({
    conversationId: t.String,
    name: t.maybe(t.String),
    description: t.maybe(t.String),
    photoUrl: t.maybe(t.String),
    adminFids: t.list(t.Number),
    removedFids: t.list(t.Number),
    participants: t.list(farcasterDCUserValidator),
    lastReadTime: t.Number,
    selfLastReadTime: t.Number,
    lastMessage: t.maybe(farcasterMessageValidator),
    pinnedMessages: t.list(farcasterMessageValidator),
    hasPinnedMessages: t.Boolean,
    isGroup: t.Boolean,
    groupPreferences: t.maybe(farcasterConversationGroupPreferencesValidator),
    activeParticipantsCount: t.Number,
    messageTTLDays: t.union([
      t.enums.of([1, 7, 30, 365]),
      t.enums.of(['Infinity']),
    ]),
    createdAt: t.Number,
    unreadCount: t.Number,
    muted: t.Boolean,
    hasMention: t.Boolean,
    viewerContext: farcasterConversationViewerContextValidator,
  });

export { farcasterInboxConversationValidator, farcasterConversationValidator };
