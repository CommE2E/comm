// @flow

type FarcasterBaseMessage = {
  +conversationId: string,
  +hasMention: boolean,
  +isDeleted: boolean,
  +isPinned: boolean,
  +viewerContext: ViewerContext,
  +senderContext: UserContext,
  +reactions: $ReadOnlyArray<ReactionType>,
  +senderFid: number,
  +serverTimestamp: number,
  +message: string,
  +messageId: string,
};

type ViewerContext = {
  +focused: boolean,
  +isLastReadMessage: boolean,
  +reactions: $ReadOnlyArray<ReactionType>,
};

type UserContext = {
  +displayName: string,
  +fid: number,
  +username: number,
  +pfp: {
    +url: string,
    +verified: boolean,
  },
};

//TODO: confirm this type
type ReactionType = string;
type MentionType = string;

type FarcasterMedia = {
  +height: number,
  +width: number,
  +mimeType: string,
  +staticRaster: string,
};

export type FarcasterTextMessage = {
  ...FarcasterBaseMessage,
  +type: 'text',
  +isProgrammatic: boolean,
  +mentions: $ReadOnlyArray<MentionType>,
};

export type FarcasterMultimediaMessage = {
  ...FarcasterBaseMessage,
  +type: 'text',
  +isProgrammatic: boolean,
  +mentions: $ReadOnlyArray<MentionType>,
  +metadata: {
    +medias: $ReadOnlyArray<FarcasterMedia>,
  },
};

export type FarcasterGroupMembershipAdditionMessage = {
  ...FarcasterBaseMessage,
  +type: 'group_membership_addition',
  +actionTargetUserContext: UserContext,
};

export type FarcasterMessage =
  | FarcasterTextMessage
  | FarcasterMultimediaMessage
  | FarcasterGroupMembershipAdditionMessage;
