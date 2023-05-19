// @flow

import { fetchPrimaryInviteLinkActionTypes } from '../actions/link-actions.js';
import type { InviteLinksStore } from '../types/link-types.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceInviteLinks(
  state: InviteLinksStore,
  action: BaseAction,
): InviteLinksStore {
  if (action.type === fetchPrimaryInviteLinkActionTypes.success) {
    const links = {};
    for (const link of action.payload.links) {
      links[link.communityID] = {
        primaryLink: link,
        ...state.links[link.communityID],
      };
    }
    return {
      links,
    };
  }
  return state;
}

export default reduceInviteLinks;
