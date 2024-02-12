// @flow

import type { EnabledApps } from './enabled-apps.js';

export type CommunityInfo = {
  +enabledApps: EnabledApps,
};

// The key is the threadID of the community.
export type CommunityInfos = { +[key: string]: CommunityInfo };

export type CommunityStore = {
  +communityInfos: CommunityInfos,
};
