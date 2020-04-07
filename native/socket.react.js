// @flow

import type { AppState } from './redux/redux-setup';

import { connect } from 'lib/utils/redux-utils';
import { logOut } from 'lib/actions/user-actions';
import Socket from 'lib/socket/socket.react';
import { preRequestUserStateSelector } from 'lib/selectors/account-selectors';

import {
  openSocketSelector,
  sessionIdentificationSelector,
  nativeGetClientResponsesSelector,
  nativeSessionStateFuncSelector,
} from './selectors/socket-selectors';
import {
  activeMessageListSelector,
  nativeCalendarQuery,
} from './navigation/nav-selectors';
import {
  connectNav,
  type NavContextType,
} from './navigation/navigation-context';

export default connectNav((context: ?NavContextType) => ({
  rawActiveThread: activeMessageListSelector(context),
  navContext: context,
}))(
  connect(
    (
      state: AppState,
      ownProps: {
        rawActiveThread: boolean,
        navContext: ?NavContextType,
      },
    ) => {
      const active =
        !!state.currentUserInfo &&
        !state.currentUserInfo.anonymous &&
        state.foreground;
      const navPlusRedux = { redux: state, navContext: ownProps.navContext };
      return {
        active,
        openSocket: openSocketSelector(state),
        getClientResponses: nativeGetClientResponsesSelector(navPlusRedux),
        activeThread: active ? ownProps.rawActiveThread : null,
        sessionStateFunc: nativeSessionStateFuncSelector(navPlusRedux),
        sessionIdentification: sessionIdentificationSelector(state),
        cookie: state.cookie,
        urlPrefix: state.urlPrefix,
        connection: state.connection,
        currentCalendarQuery: nativeCalendarQuery(navPlusRedux),
        canSendReports: !state.frozen && state.connectivity.hasWiFi,
        frozen: state.frozen,
        preRequestUserState: preRequestUserStateSelector(state),
      };
    },
    { logOut },
  )(Socket),
);
