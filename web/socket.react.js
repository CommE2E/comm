// @flow

import type { AppState } from './redux/redux-setup';

import { connect } from 'lib/utils/redux-utils';
import { logOut } from 'lib/actions/user-actions';
import Socket from 'lib/socket/socket.react';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';

import {
  openSocketSelector,
  sessionIdentificationSelector,
  webGetClientResponsesSelector,
  webSessionStateFuncSelector,
} from './selectors/socket-selectors';
import {
  activeThreadSelector,
  webCalendarQuery,
} from './selectors/nav-selectors';

export default connect(
  (state: AppState) => {
    const active =
      state.currentUserInfo &&
      !state.currentUserInfo.anonymous &&
      state.foreground;
    return {
      active,
      openSocket: openSocketSelector(state),
      getClientResponses: webGetClientResponsesSelector(state),
      activeThread: active ? activeThreadSelector(state) : null,
      sessionStateFunc: webSessionStateFuncSelector(state),
      sessionIdentification: sessionIdentificationSelector(state),
      cookie: state.cookie,
      urlPrefix: state.urlPrefix,
      connection: state.connection,
      currentCalendarQuery: webCalendarQuery(state),
      canSendReports: true,
      frozen: false,
      preRequestUserState: preRequestUserStateSelector(state),
    };
  },
  { logOut },
)(Socket);
