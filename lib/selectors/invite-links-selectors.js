// @flow

import { createSelector } from 'reselect';

import type { InviteLink, InviteLinks } from '../types/link-types.js';
import type { AppState } from '../types/redux-types.js';

const primaryInviteLinksSelector: (state: AppState) => {
  +[communityID: string]: InviteLink,
} = createSelector(
  (state: AppState) => state.inviteLinksStore.links,
  (links: InviteLinks) => {
    const primaryLinks = {};
    for (const communityID in links) {
      const communityLinks = links[communityID];
      if (communityLinks.primaryLink) {
        primaryLinks[communityID] = communityLinks.primaryLink;
      }
    }
    return primaryLinks;
  },
);

export { primaryInviteLinksSelector };
