// @flow

import t, { type TInterface } from 'tcomb';

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

export type FetchCommunityInfosResponse = {
  +communityInfos: $ReadOnlyArray<ServerCommunityInfo>,
};

export type CreateOrUpdateFarcasterChannelTagRequest = {
  +commCommunityID: string,
  +farcasterChannelID: string,
};

export type CreateOrUpdateFarcasterChannelTagResponse = {
  +commCommunityID: string,
  +farcasterChannelID: string,
};

export type DeleteFarcasterChannelTagRequest = {
  +commCommunityID: string,
  +farcasterChannelID: string,
};

export type DeleteFarcasterChannelTagPayload = {
  +commCommunityID: string,
};
