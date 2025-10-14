// @flow

import type { TInterface } from 'tcomb';
import t from 'tcomb';

import type { FarcasterMessage } from './farcaster-messages-types.js';
import { farcasterMessageValidator } from './farcaster-messages-types.js';
import type {
  FarcasterDCUser,
  FarcasterDCUserBase,
} from './farcaster-user-types.js';
import {
  farcasterDCUserValidator,
  FarcasterDCUserBaseValidator,
} from './farcaster-user-types.js';
import { tShapeInexact } from '../../utils/validation-utils.js';

type FarcasterInboxViewerContext = {
  +category: 'default' | 'archived' | 'request',
  +muted: boolean,
  +manuallyMarkedUnread: boolean,
  +unreadCount: number,
  +counterParty?: FarcasterDCUser,
  ...
};
const farcasterInboxViewerContextValidator: TInterface<FarcasterInboxViewerContext> =
  tShapeInexact({
    category: t.enums.of(['default', 'archived', 'request']),
    muted: t.Boolean,
    manuallyMarkedUnread: t.Boolean,
    unreadCount: t.Number,
    counterParty: t.maybe(farcasterDCUserValidator),
  });

export type FarcasterInboxConversation = {
  +conversationId: string,
  +name?: string,
  +description?: string,
  +photoUrl?: string,
  +adminFids: $ReadOnlyArray<number>,
  +isGroup: boolean,
  +createdAt: number,
  +viewerContext: FarcasterInboxViewerContext,
  ...
};
const farcasterInboxConversationValidator: TInterface<FarcasterInboxConversation> =
  tShapeInexact({
    conversationId: t.String,
    name: t.maybe(t.String),
    description: t.maybe(t.String),
    photoUrl: t.maybe(t.String),
    adminFids: t.list(t.Number),
    isGroup: t.Boolean,
    createdAt: t.Number,
    viewerContext: farcasterInboxViewerContextValidator,
  });

type FarcasterConversationViewerContext = {
  +access: 'read' | 'read-write' | 'admin',
  +category: 'default' | 'archived' | 'request',
  +muted: boolean,
  +manuallyMarkedUnread: boolean,
  +unreadCount: number,
  +counterParty?: FarcasterDCUser,
  ...
};
const farcasterConversationViewerContextValidator: TInterface<FarcasterConversationViewerContext> =
  tShapeInexact({
    access: t.enums.of(['read', 'read-write', 'admin']),
    category: t.enums.of(['default', 'archived', 'request']),
    muted: t.Boolean,
    manuallyMarkedUnread: t.Boolean,
    unreadCount: t.Number,
    counterParty: t.maybe(farcasterDCUserValidator),
  });

type FarcasterConversationGroupPreferences = {
  +membersCanInvite: boolean,
  +periodicallyValidateMemberships: boolean,
  +onlyAdminsCanWrite: boolean,
  ...
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
  +pinnedMessages: $ReadOnlyArray<FarcasterMessage>,
  +isGroup: boolean,
  +groupPreferences?: FarcasterConversationGroupPreferences,
  +createdAt: number,
  +unreadCount: number,
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
    pinnedMessages: t.list(farcasterMessageValidator),
    isGroup: t.Boolean,
    groupPreferences: t.maybe(farcasterConversationGroupPreferencesValidator),
    createdAt: t.Number,
    unreadCount: t.Number,
    viewerContext: farcasterConversationViewerContextValidator,
  });

export type FarcasterConversationInvitee = {
  +inviter?: FarcasterDCUserBase,
  +invitee: FarcasterDCUserBase,
  +inviteTimestamp: number,
  +role?: 'member' | 'admin',
  ...
};
const farcasterConversationInviteeValidator: TInterface<FarcasterConversationInvitee> =
  tShapeInexact({
    inviter: t.maybe(FarcasterDCUserBaseValidator),
    invitee: FarcasterDCUserBaseValidator,
    inviteTimestamp: t.Number,
    role: t.maybe(t.enums.of(['member', 'admin'])),
  });

export {
  farcasterInboxConversationValidator,
  farcasterConversationValidator,
  farcasterConversationInviteeValidator,
};
