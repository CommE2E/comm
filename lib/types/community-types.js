// @flow

import type { EnabledApps } from './enabled-apps.js';

export type CommunityInfo = {
  +enabledApps: EnabledApps,
};

export type CommunityInfos = { +[threadID: string]: CommunityInfo };

export type CommunityStore = {
  +communityInfos: CommunityInfos,
};
