// @flow

import { extractKeyserverIDFromID } from 'lib/keyserver-conn/keyserver-call-utils.js';
import type { CallKeyserverEndpoint } from 'lib/keyserver-conn/keyserver-conn-types.js';
import type {
  WebInitialKeyserverInfo,
  ClientWebInitialReduxStateResponse,
} from 'lib/types/redux-types.js';
import { useKeyserverCall } from 'lib/utils/keyserver-call.js';
import type { URLInfo } from 'lib/utils/url-utils.js';
import { ashoatKeyserverID } from 'lib/utils/validation-utils.js';

import type {
  ExcludedData,
  InitialReduxState,
  InitialReduxStateRequest,
} from '../types/redux-types.js';

export const updateNavInfoActionType = 'UPDATE_NAV_INFO';
export const updateWindowDimensionsActionType = 'UPDATE_WINDOW_DIMENSIONS';
export const updateWindowActiveActionType = 'UPDATE_WINDOW_ACTIVE';
export const setInitialReduxState = 'SET_INITIAL_REDUX_STATE';

const getInitialReduxStateCallSingleKeyserverEndpointOptions = {
  timeout: 300000,
};

type GetInitialReduxStateInput = {
  +urlInfo: URLInfo,
  +excludedData: ExcludedData,
  +allUpdatesCurrentAsOf: {
    +[keyserverID: string]: number,
  },
};
const getInitialReduxState =
  (
    callKeyserverEndpoint: CallKeyserverEndpoint,
    allKeyserverIDs: $ReadOnlyArray<string>,
  ): ((input: GetInitialReduxStateInput) => Promise<InitialReduxState>) =>
  async input => {
    const requests: { [string]: InitialReduxStateRequest } = {};
    const { urlInfo, excludedData, allUpdatesCurrentAsOf } = input;
    const { thread, inviteSecret, ...rest } = urlInfo;
    const threadKeyserverID = thread ? extractKeyserverIDFromID(thread) : null;

    for (const keyserverID of allKeyserverIDs) {
      // As of Nov 2023, the only validation we have for adding a new keyserver
      // is we check if the keyserver URL is valid. This is not a very
      // extensive check, and gives the user the feeling of a false sucesses
      // when they add new keyservers to the keyserver store. ENG-5371 tracks
      // the task for initialzing a proper connection with the newly added
      // keyserver, and at that point we can make the validation checks
      // for adding a new keyserver more extensive. However, for the time being
      // we need to add this check below so that we aren't trying to make calls
      // to nonexistant keyservers that are in our keyserver store.
      if (keyserverID !== ashoatKeyserverID) {
        continue;
      }
      const clientUpdatesCurrentAsOf = allUpdatesCurrentAsOf[keyserverID];
      const keyserverExcludedData: ExcludedData = {
        threadStore: !!excludedData.threadStore && !!clientUpdatesCurrentAsOf,
      };
      if (keyserverID === threadKeyserverID) {
        requests[keyserverID] = {
          urlInfo,
          excludedData: keyserverExcludedData,
          clientUpdatesCurrentAsOf,
        };
      } else {
        requests[keyserverID] = {
          urlInfo: rest,
          excludedData: keyserverExcludedData,
          clientUpdatesCurrentAsOf,
        };
      }
    }

    const responses: { +[string]: ClientWebInitialReduxStateResponse } =
      await callKeyserverEndpoint(
        'get_initial_redux_state',
        requests,
        getInitialReduxStateCallSingleKeyserverEndpointOptions,
      );

    const {
      currentUserInfo,
      userInfos,
      pushApiPublicKey,
      commServicesAccessToken,
      navInfo,
    } = responses[ashoatKeyserverID];

    const dataLoaded = currentUserInfo && !currentUserInfo.anonymous;

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
    let keyserverInfos: { [keyserverID: string]: WebInitialKeyserverInfo } = {};

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
      messageStore,
      dataLoaded,
      pushApiPublicKey,
      commServicesAccessToken,
      inviteLinksStore,
      keyserverInfos,
    };
  };

function useGetInitialReduxState(): (
  input: GetInitialReduxStateInput,
) => Promise<InitialReduxState> {
  return useKeyserverCall(getInitialReduxState);
}

export { useGetInitialReduxState };
