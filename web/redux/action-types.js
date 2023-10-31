// @flow

import { defaultCalendarFilters } from 'lib/types/filter-types.js';
import { extractKeyserverIDFromID } from 'lib/utils/action-utils.js';
import { useKeyserverCall } from 'lib/utils/keyserver-call.js';
import type { CallKeyserverEndpoint } from 'lib/utils/keyserver-call.js';
import type { URLInfo } from 'lib/utils/url-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import type {
  InitialReduxState,
  InitialReduxStateResponse,
  InitialKeyserverInfo,
} from '../types/redux-types.js';

export const updateNavInfoActionType = 'UPDATE_NAV_INFO';
export const updateWindowDimensionsActionType = 'UPDATE_WINDOW_DIMENSIONS';
export const updateWindowActiveActionType = 'UPDATE_WINDOW_ACTIVE';
export const setInitialReduxState = 'SET_INITIAL_REDUX_STATE';

const getInitialReduxStateCallServerEndpointOptions = { timeout: 300000 };
const getInitialReduxState =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: URLInfo) => Promise<InitialReduxState>) =>
  async urlInfo => {
    const requests = {};
    const { thread, inviteSecret, ...rest } = urlInfo;
    const threadKeyserverID = thread ? extractKeyserverIDFromID(thread) : null;

    for (const keyserverID of allKeyserverIDs) {
      if (keyserverID === threadKeyserverID) {
        requests[keyserverID] = urlInfo;
      } else {
        requests[keyserverID] = rest;
      }
    }

    const responses: { +[string]: InitialReduxStateResponse } =
      await callKeyserverEndpoint(
        'get_initial_redux_state',
        requests,
        getInitialReduxStateCallServerEndpointOptions,
      );

    const {
      currentUserInfo,
      userInfos,
      pushApiPublicKey,
      commServicesAccessToken,
      navInfo,
    } = responses[ashoatKeyserverID];

    const dataLoaded = currentUserInfo && !currentUserInfo.anonymous;
    const actualizedCalendarQuery = {
      startDate: navInfo.startDate,
      endDate: navInfo.endDate,
      filters: defaultCalendarFilters,
    };

    const entryStore = {
      daysToEntries: {},
      entryInfos: {},
      lastUserInteractionCalendar: 0,
    };
    const threadStore = {
      threadInfos: {},
    };
    const messageStore = {
      currentAsOf: {},
      local: {},
      messages: {},
      threads: {},
    };
    const inviteLinksStore = {
      links: {},
    };
    let keyserverInfos: { [keyserverID: string]: InitialKeyserverInfo } = {};

    for (const keyserverID in responses) {
      entryStore.daysToEntries = {
        ...entryStore.daysToEntries,
        ...responses[keyserverID].entryStore.daysToEntries,
      };
      entryStore.entryInfos = {
        ...entryStore.entryInfos,
        ...responses[keyserverID].entryStore.entryInfos,
      };
      entryStore.lastUserInteractionCalendar = Math.max(
        entryStore.lastUserInteractionCalendar,
        responses[keyserverID].entryStore.lastUserInteractionCalendar,
      );

      threadStore.threadInfos = {
        ...threadStore.threadInfos,
        ...responses[keyserverID].threadStore.threadInfos,
      };

      messageStore.currentAsOf = {
        ...messageStore.currentAsOf,
        ...responses[keyserverID].messageStore.currentAsOf,
      };
      messageStore.messages = {
        ...messageStore.messages,
        ...responses[keyserverID].messageStore.messages,
      };
      messageStore.threads = {
        ...messageStore.threads,
        ...responses[keyserverID].messageStore.threads,
      };

      inviteLinksStore.links = {
        ...inviteLinksStore.links,
        ...responses[keyserverID].inviteLinksStore.links,
      };

      keyserverInfos = {
        ...keyserverInfos,
        [keyserverID]: responses[keyserverID].keyserverInfo,
      };
    }

    return {
      navInfo: {
        ...navInfo,
        inviteSecret,
      },
      currentUserInfo,
      entryStore,
      threadStore,
      userInfos,
      actualizedCalendarQuery,
      messageStore,
      dataLoaded,
      pushApiPublicKey,
      commServicesAccessToken,
      inviteLinksStore,
      keyserverInfos,
    };
  };

function useGetInitialReduxState(): (
  input: URLInfo,
) => Promise<InitialReduxState> {
  return useKeyserverCall(getInitialReduxState);
}

export { useGetInitialReduxState };
