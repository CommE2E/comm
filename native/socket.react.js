// @flow

import type { AppState } from './redux-setup';

import { connect } from 'lib/utils/redux-utils';
import { queuedClientResponsesSelector } from 'lib/selectors/socket-selectors';
import { logOut } from 'lib/actions/user-actions';
import Socket from 'lib/socket/socket.react';

import {
  openSocketSelector,
  sessionIdentificationSelector,
  nativeGetClientResponsesSelector,
  nativeSessionStateFuncSelector,
} from './selectors/socket-selectors';
import {
  activeThreadSelector,
  appLoggedInSelector,
  nativeCalendarQuery,
} from './selectors/nav-selectors';

export default connect(
  (state: AppState) => {
    const active = appLoggedInSelector(state) &&
      state.currentUserInfo &&
      !state.currentUserInfo.anonymous &&
      state.foreground;
    return {
      active,
      openSocket: openSocketSelector(state),
      queuedClientResponses: queuedClientResponsesSelector(state),
      getClientResponses: nativeGetClientResponsesSelector(state),
      activeThread: active ? activeThreadSelector(state) : null,
      sessionStateFunc: nativeSessionStateFuncSelector(state),
      sessionIdentification: sessionIdentificationSelector(state),
      cookie: state.cookie,
      urlPrefix: state.urlPrefix,
      connection: state.connection,
      currentCalendarQuery: nativeCalendarQuery(state),
    };
  },
  { logOut },
)(Socket);
