// @flow

import {
  createOrUpdatePublicLinkActionTypes,
  disableInviteLinkLinkActionTypes,
  fetchPrimaryInviteLinkActionTypes,
} from '../actions/link-actions.js';
import { deleteKeyserverAccountActionTypes } from '../actions/user-actions.js';
import { extractKeyserverIDFromID } from '../keyserver-conn/keyserver-call-utils.js';
import { setNewSessionActionType } from '../keyserver-conn/keyserver-conn-types.js';
import type { InviteLinksStore, CommunityLinks } from '../types/link-types.js';
import type { BaseAction } from '../types/redux-types.js';

function reduceInviteLinks(
  state: InviteLinksStore,
  action: BaseAction,
): InviteLinksStore {
  if (action.type === fetchPrimaryInviteLinkActionTypes.success) {
    const links: { [string]: CommunityLinks } = {};
    for (const link of action.payload.links) {
      links[link.communityID] = {
        ...state.links[link.communityID],
        primaryLink: link,
      };
    }
    return {
      links,
    };
  } else if (action.type === createOrUpdatePublicLinkActionTypes.success) {
    const communityID = action.payload.communityID;
    return {
      ...state,
      links: {
        ...state.links,
        [communityID]: {
          ...state.links[communityID],
          primaryLink: action.payload,
        },
      },
    };
  } else if (action.type === disableInviteLinkLinkActionTypes.success) {
    const communityID = action.payload.communityID;
    const currentPrimaryLink = state.links[communityID]?.primaryLink;
    if (currentPrimaryLink?.name !== action.payload.name) {
      return state;
    }

    const communityLinks = {
      ...state.links[communityID],
      primaryLink: null,
    };
    return {
      ...state,
      links: {
        ...state.links,
        [communityID]: communityLinks,
      },
    };
  } else if (action.type === deleteKeyserverAccountActionTypes.success) {
    const keyserverIDsSet = new Set<string>(action.payload.keyserverIDs);
    const newLinks: { [communityID: string]: CommunityLinks } = {};
    for (const linkID in state.links) {
      const keyserverID = extractKeyserverIDFromID(linkID);
      if (!keyserverID || !keyserverIDsSet.has(keyserverID)) {
        newLinks[linkID] = state.links[linkID];
      }
    }
    return {
      ...state,
      links: newLinks,
    };
  } else if (
    action.type === setNewSessionActionType &&
    action.payload.sessionChange.cookieInvalidated
  ) {
    const { keyserverID } = action.payload;
    const newLinks: { [communityID: string]: CommunityLinks } = {};
    for (const linkID in state.links) {
      if (extractKeyserverIDFromID(linkID) !== keyserverID) {
        newLinks[linkID] = state.links[linkID];
      }
    }
    return {
      ...state,
      links: newLinks,
    };
  }
  return state;
}

export default reduceInviteLinks;
