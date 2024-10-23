// @flow

import t, { type TInterface } from 'tcomb';

import type { RawMessageInfo } from './message-types.js';
import type { ChangeThreadSettingsResult } from './thread-types.js';
import type { ServerUpdateInfo } from './update-types.js';
import { tID, tShape } from '../utils/validation-utils.js';

export type CommunityInfo = {
  +farcasterChannelID: ?string,
};

export type CommunityInfos = { +[threadID: string]: CommunityInfo };

export type CommunityStore = {
  +communityInfos: CommunityInfos,
};

export type AddCommunityPayload = {
  +id: string,
  +newCommunityInfo: CommunityInfo,
};

export type ServerCommunityInfo = {
  +id: string,
  +farcasterChannelID: ?string,
};

export const serverCommunityInfoValidator: TInterface<ServerCommunityInfo> =
  tShape<ServerCommunityInfo>({
    id: tID,
    farcasterChannelID: t.maybe(t.String),
  });

export type ServerCommunityInfoWithCommunityName = $ReadOnly<{
  ...ServerCommunityInfo,
  +communityName: string,
}>;

export const serverCommunityInfoWithCommunityNameValidator: TInterface<ServerCommunityInfoWithCommunityName> =
  tShape<ServerCommunityInfoWithCommunityName>({
    id: tID,
    farcasterChannelID: t.maybe(t.String),
    communityName: t.String,
  });

export type FetchCommunityInfosResponse = {
  +communityInfos: $ReadOnlyArray<ServerCommunityInfo>,
};

export type FetchAllCommunityInfosWithNamesResponse = {
  +allCommunityInfosWithNames: $ReadOnlyArray<ServerCommunityInfoWithCommunityName>,
};

export type CreateOrUpdateFarcasterChannelTagRequest = {
  +commCommunityID: string,
  +farcasterChannelID: string,
};

export type CreateOrUpdateFarcasterChannelTagResponse = {
  +commCommunityID: string,
  +farcasterChannelID: string,
  +updatesResult?: ?{
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  +newMessageInfos?: ?$ReadOnlyArray<RawMessageInfo>,
};

export type DeleteFarcasterChannelTagRequest = {
  +commCommunityID: string,
  +farcasterChannelID: string,
};

export type DeleteFarcasterChannelTagResponse = ChangeThreadSettingsResult;

export type DeleteFarcasterChannelTagPayload = {
  +commCommunityID: string,
  +updatesResult?: ?{
    +newUpdates: $ReadOnlyArray<ServerUpdateInfo>,
  },
  +newMessageInfos?: ?$ReadOnlyArray<RawMessageInfo>,
};

export type OngoingJoinCommunityData = {
  +resolve: () => mixed,
  +reject: () => mixed,
  +communityID: string,
  +threadID: ?string,
};

export type JoinCommunityStep =
  | 'inactive'
  | 'add_keyserver'
  | 'auth_to_keyserver'
  | 'join_community'
  | 'join_thread'
  | 'finished';
