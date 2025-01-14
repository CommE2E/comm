// @flow

import t, { type TInterface } from 'tcomb';

import type { RawMessageInfo } from './message-types.js';
import type { ThinRawThreadInfo } from './minimally-encoded-thread-permissions-types.js';
import type {
  ChangeThreadSettingsResult,
  LegacyThinRawThreadInfo,
} from './thread-types.js';
import type { ServerUpdateInfo } from './update-types.js';
import { thinRawThreadInfoValidator } from '../permissions/minimally-encoded-raw-thread-info-validators.js';
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
  +threadInfo: LegacyThinRawThreadInfo | ThinRawThreadInfo | null,
}>;

export type ClientCommunityInfoWithCommunityName = $ReadOnly<{
  ...ServerCommunityInfo,
  +communityName: string,
  +threadInfo: ThinRawThreadInfo | null,
}>;

export const clientCommunityInfoWithCommunityNameValidator: TInterface<ClientCommunityInfoWithCommunityName> =
  tShape<ClientCommunityInfoWithCommunityName>({
    id: tID,
    farcasterChannelID: t.maybe(t.String),
    communityName: t.String,
    threadInfo: t.maybe(thinRawThreadInfoValidator),
  });

export type FetchCommunityInfosResponse = {
  +communityInfos: $ReadOnlyArray<ServerCommunityInfo>,
};

export type ServerFetchNativeDrawerAndDirectoryInfosResponse = {
  +allCommunityInfosWithNames: $ReadOnlyArray<ServerCommunityInfoWithCommunityName>,
};

export type ClientFetchNativeDrawerAndDirectoryInfosResponse = {
  +allCommunityInfosWithNames: $ReadOnlyArray<ClientCommunityInfoWithCommunityName>,
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
