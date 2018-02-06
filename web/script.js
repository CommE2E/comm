// @flow

import 'babel-polyfill';
import 'isomorphic-fetch';

import type { Store } from 'redux';
import type { RawThreadInfo } from 'lib/types/thread-types';
import type { RawEntryInfo } from 'lib/types/entry-types';
import type {
  RawMessageInfo,
  MessageTruncationStatus,
} from 'lib/types/message-types';
import type { AppState, Action } from './redux-setup';
import type { UserInfo, CurrentUserInfo } from 'lib/types/user-types';

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import { Router, Route } from 'react-router';
import { AppContainer } from 'react-hot-loader';
import thunk from 'redux-thunk';
import {
  composeWithDevTools,
} from 'redux-devtools-extension/logOnlyInProduction';
import _keyBy from 'lodash/fp/keyBy';
import invariant from 'invariant';

import { daysToEntriesFromEntryInfos } from 'lib/reducers/entry-reducer';
import { registerConfig } from 'lib/utils/config';
import { assertVerifyField } from 'lib/utils/verify-utils';
import {
  startDateForYearAndMonth,
  endDateForYearAndMonth,
} from 'lib/utils/date-utils';
import { newSessionID } from 'lib/selectors/session-selectors';
import { freshMessageStore } from 'lib/reducers/message-reducer';

import { reducer } from './redux-setup';

import App from './app.react';
import history from './router-history';

declare var current_user_info: CurrentUserInfo;
declare var thread_infos: {[id: string]: RawThreadInfo};
declare var entry_infos: RawEntryInfo[];
declare var month: number;
declare var year: number;
declare var verify_code: ?string;
declare var verify_field: ?number;
declare var reset_password_username: string;
declare var home: bool;
declare var thread_id: ?string;
declare var current_as_of: number;
declare var message_infos: RawMessageInfo[];
declare var truncation_status: {[threadID: string]: MessageTruncationStatus};
declare var user_infos: {[id: string]: UserInfo};

registerConfig({
  // We can use paths local to the <base href> on web
  urlPrefix: "",
  // We can't securely cache credentials on web, so we have no way to recover
  // from a cookie invalidation
  resolveInvalidatedCookie: null,
  // We use httponly cookies on web to protect against XSS attacks, so we have
  // no access to the cookies from JavaScript
  getNewCookie: null,
  setCookieOnRequest: false,
  // Never reset the calendar range
  calendarRangeInactivityLimit: null,
  clientSupportsMessages: false,
});

const entryInfos = _keyBy('id')(entry_infos);
const daysToEntries = daysToEntriesFromEntryInfos(entry_infos);
const startDate = startDateForYearAndMonth(year, month);
const endDate = endDateForYearAndMonth(year, month);
const messageStore = freshMessageStore(
  message_infos,
  truncation_status,
  thread_infos,
);

const store: Store<AppState, Action> = createStore(
  reducer,
  ({
    navInfo: {
      startDate,
      endDate,
      home,
      threadID: thread_id,
      verify: verify_code,
    },
    currentUserInfo: current_user_info,
    sessionID: newSessionID(),
    verifyField: verify_field ? assertVerifyField(verify_field) : verify_field,
    resetPasswordUsername: reset_password_username,
    entryStore: {
      entryInfos,
      daysToEntries,
      lastUserInteractionCalendar: Date.now(),
    },
    lastUserInteraction: { sessionReset: Date.now() },
    threadInfos: thread_infos,
    userInfos: user_infos,
    messageStore,
    drafts: {},
    currentAsOf: current_as_of,
    loadingStatuses: {},
    cookie: undefined,
    deviceToken: null,
  }: AppState),
  composeWithDevTools({})(applyMiddleware(thunk)),
);

const root = document.getElementById('react-root');
invariant(root, "cannot find id='react-root' element!");

const render = (Component) => ReactDOM.render(
  <AppContainer>
    <Provider store={store}>
      <Router history={history}>
        <Route path="*" component={Component} />
      </Router>
    </Provider>
  </AppContainer>,
  root,
);
render(App);

declare var module: { hot?: {
  accept: (string, Function) => void,
} };
if (module.hot) {
  module.hot.accept('./app.react', () => render(App));
}
