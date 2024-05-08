// @flow

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

export type CreateOrUpdateFarcasterChannelTagRequest = {
  +commCommunityID: string,
  +farcasterChannelID: string,
};

export type CreateOrUpdateFarcasterChannelTagResponse = {
  +commCommunityID: string,
  +blobHolder: string,
};

export type DeleteFarcasterChannelTagRequest = {
  +commCommunityID: string,
  +farcasterChannelID: string,
  +blobHolder: string,
};

export type DeleteFarcasterChannelTagPayload = {
  +commCommunityID: string,
};
