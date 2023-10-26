// @flow

import type { CallServerEndpoint } from 'lib/utils/call-server-endpoint.js';
import type { URLInfo } from 'lib/utils/url-utils.js';

import type { InitialReduxState } from '../types/redux-types.js';

export const updateNavInfoActionType = 'UPDATE_NAV_INFO';
export const updateWindowDimensionsActionType = 'UPDATE_WINDOW_DIMENSIONS';
export const updateWindowActiveActionType = 'UPDATE_WINDOW_ACTIVE';
export const setInitialReduxState = 'SET_INITIAL_REDUX_STATE';

const getInitialReduxStateCallServerEndpointOptions = { timeout: 300000 };
const getInitialReduxState =
  (
    callServerEndpoint: CallServerEndpoint,
  ): (URLInfo => Promise<InitialReduxState>) =>
  async urlInfo => {
    const response = await callServerEndpoint(
      'get_initial_redux_state',
      urlInfo,
      getInitialReduxStateCallServerEndpointOptions,
    );
    return {
      navInfo: response.navInfo,
      currentUserInfo: response.currentUserInfo,
      entryStore: response.entryStore,
      threadStore: response.threadStore,
      userInfos: response.userInfos,
      actualizedCalendarQuery: response.actualizedCalendarQuery,
      messageStore: response.messageStore,
      dataLoaded: response.dataLoaded,
      pushApiPublicKey: response.pushApiPublicKey,
      commServicesAccessToken: response.commServicesAccessToken,
      inviteLinksStore: response.inviteLinksStore,
      keyserverInfo: response.keyserverInfo,
    };
  };

export { getInitialReduxState };
