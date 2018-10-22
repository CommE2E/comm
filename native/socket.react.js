// @flow

import type { AppState } from './redux-setup';

import { connect } from 'lib/utils/redux-utils';
import {
  clientResponsesSelector,
  sessionStateFuncSelector,
} from 'lib/selectors/socket-selectors';
import { logInExtraInfoSelector } from 'lib/selectors/account-selectors';
import Socket from 'lib/components/socket.react';

import {
  openSocketSelector,
  sessionIdentificationSelector,
} from './selectors/socket-selectors';
import { activeThreadSelector } from './selectors/nav-selectors';

export default connect(
  (state: AppState) => ({
    openSocket: openSocketSelector(state),
    getClientResponses: clientResponsesSelector(state),
    activeThread: activeThreadSelector(state),
    sessionStateFunc: sessionStateFuncSelector(state),
    sessionIdentification: sessionIdentificationSelector(state),
    cookie: state.cookie,
    urlPrefix: state.urlPrefix,
    logInExtraInfo: logInExtraInfoSelector(state),
    connection: state.connection,
  }),
  null,
  true,
)(Socket);
