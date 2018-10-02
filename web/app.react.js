// @flow

import type { LoadingStatus } from 'lib/types/loading-types';
import { type AppState, type NavInfo, navInfoPropType } from './redux-setup';
import type {
  DispatchActionPayload,
  DispatchActionPromise,
} from 'lib/utils/action-utils';
import { type VerifyField, verifyField } from 'lib/types/verify-types';
import {
  type CalendarQuery,
  type CalendarQueryUpdateResult,
  calendarQueryPropType,
} from 'lib/types/entry-types';
import type {
  ActivityUpdate,
  UpdateActivityResult,
} from 'lib/types/activity-types';

import * as React from 'react';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';
import PropTypes from 'prop-types';
import Visibility from 'visibilityjs';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faCalendar from '@fortawesome/fontawesome-free-solid/faCalendar';
import faChat from '@fortawesome/fontawesome-free-solid/faComments';
import classNames from 'classnames';
import fontawesome from '@fortawesome/fontawesome';

import { getDate } from 'lib/utils/date-utils';
import { currentCalendarQuery } from 'lib/selectors/nav-selectors';
import {
  fetchEntriesActionTypes,
  updateCalendarQueryActionTypes,
  updateCalendarQuery,
} from 'lib/actions/entry-actions';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors';
import { connect } from 'lib/utils/redux-utils';
import { registerConfig } from 'lib/utils/config';
import {
  includeDeletedSelector,
} from 'lib/selectors/calendar-filter-selectors';
import {
  mostRecentReadThreadSelector,
  unreadCount,
} from 'lib/selectors/thread-selectors';
import {
  updateActivityActionTypes,
  updateActivity,
} from 'lib/actions/ping-actions';

import { activeThreadSelector } from './selectors/nav-selectors';
import { canonicalURLFromReduxState, navInfoFromURL } from './url-utils';
import css from './style.css';
import AccountBar from './account-bar.react';
import Calendar from './calendar/calendar.react';
import ResetPasswordModal from './modals/account/reset-password-modal.react';
import VerificationSuccessModal
  from './modals/account/verification-success-modal.react';
import LoadingIndicator from './loading-indicator.react';
import history from './router-history';
import { updateNavInfoActionType } from './redux-setup';
import Splash from './splash/splash.react';
import Chat from './chat/chat.react';
import Socket from './socket.react';

// We want Webpack's css-loader and style-loader to handle the Fontawesome CSS,
// so we disable the autoAddCss logic and import the CSS file.
fontawesome.config = { autoAddCss: false };
import '@fortawesome/fontawesome/styles.css';

registerConfig({
  // We can't securely cache credentials on web, so we have no way to recover
  // from a cookie invalidation
  resolveInvalidatedCookie: null,
  // We use httponly cookies on web to protect against XSS attacks, so we have
  // no access to the cookies from JavaScript
  setCookieOnRequest: false,
  setSessionIDOnRequest: true,
  // Never reset the calendar range
  calendarRangeInactivityLimit: null,
  platformDetails: { platform: "web" },
});

type Props = {
  location: {
    pathname: string,
  },
  // Redux state
  navInfo: NavInfo,
  verifyField: ?VerifyField,
  entriesLoadingStatus: LoadingStatus,
  currentCalendarQuery: () => CalendarQuery,
  loggedIn: bool,
  includeDeleted: bool,
  mostRecentReadThread: ?string,
  activeThread: ?string,
  activeThreadCurrentlyUnread: bool,
  activeThreadLatestMessage: ?string,
  viewerID: ?string,
  unreadCount: number,
  actualizedCalendarQuery: CalendarQuery,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
  dispatchActionPromise: DispatchActionPromise,
  // async functions that hit server APIs
  updateCalendarQuery: (
    calendarQuery: CalendarQuery,
    reduxAlreadyUpdated?: bool,
  ) => Promise<CalendarQueryUpdateResult>,
  updateActivity: (
    activityUpdates: $ReadOnlyArray<ActivityUpdate>,
  ) => Promise<UpdateActivityResult>,
};
type State = {|
  currentModal: ?React.Node,
  visible: bool,
|};
class App extends React.PureComponent<Props, State> {

  static propTypes = {
    location: PropTypes.shape({
      pathname: PropTypes.string.isRequired,
    }).isRequired,
    navInfo: navInfoPropType.isRequired,
    verifyField: PropTypes.number,
    entriesLoadingStatus: PropTypes.string.isRequired,
    currentCalendarQuery: PropTypes.func.isRequired,
    loggedIn: PropTypes.bool.isRequired,
    includeDeleted: PropTypes.bool.isRequired,
    mostRecentReadThread: PropTypes.string,
    activeThread: PropTypes.string,
    activeThreadCurrentlyUnread: PropTypes.bool.isRequired,
    activeThreadLatestMessage: PropTypes.string,
    viewerID: PropTypes.string,
    unreadCount: PropTypes.number.isRequired,
    actualizedCalendarQuery: calendarQueryPropType.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
    dispatchActionPromise: PropTypes.func.isRequired,
    updateCalendarQuery: PropTypes.func.isRequired,
    updateActivity: PropTypes.func.isRequired,
  };
  state = {
    currentModal: null,
    visible: true,
  };
  actualizedCalendarQuery: CalendarQuery;

  constructor(props: Props) {
    super(props);
    this.actualizedCalendarQuery = props.actualizedCalendarQuery;
  }

  componentDidMount() {
    if (this.props.navInfo.verify) {
      if (this.props.verifyField === verifyField.RESET_PASSWORD) {
        this.showResetPasswordModal();
      } else if (this.props.verifyField === verifyField.EMAIL) {
        const newURL = canonicalURLFromReduxState(
          {
            ...this.props.navInfo,
            verify: null,
          },
          this.props.location.pathname,
        );
        history.replace(newURL);
        this.setModal(
          <VerificationSuccessModal onClose={this.clearModal} />
        );
      }
    }

    if (this.props.loggedIn) {
      const newURL = canonicalURLFromReduxState(
        this.props.navInfo,
        this.props.location.pathname,
      );
      if (this.props.location.pathname !== newURL) {
        history.replace(newURL);
      }
    } else if (this.props.location.pathname !== '/') {
      history.replace('/');
    }

    Visibility.change(this.onVisibilityChange);
  }

  onVisibilityChange = (e, state: string) => {
    this.setState({ visible: state === "visible" });
    if (state !== "visible") {
      this.closingApp();
    }
  }

  static updateFocusedThreads(
    props: Props,
    oldActiveThread: ?string,
    oldActiveThreadLatestMessage: ?string,
  ) {
    if (!props.loggedIn) {
      return;
    }
    const updates = [];
    if (props.activeThread) {
      updates.push({
        focus: true,
        threadID: props.activeThread,
      });
    }
    if (oldActiveThread && oldActiveThread !== props.activeThread) {
      updates.push({
        focus: false,
        threadID: oldActiveThread,
        latestMessage: oldActiveThreadLatestMessage,
      });
    }
    if (updates.length === 0) {
      return;
    }
    props.dispatchActionPromise(
      updateActivityActionTypes,
      props.updateActivity(updates),
    );
  }

  closingApp() {
    if (!this.props.loggedIn || !this.props.activeThread) {
      return;
    }
    const updates = [{
      focus: false,
      threadID: this.props.activeThread,
      latestMessage: this.props.activeThreadLatestMessage,
    }];
    this.props.dispatchActionPromise(
      updateActivityActionTypes,
      this.props.updateActivity(updates),
    );
  }

  componentDidUpdate(prevProps: Props) {
    if (this.props.verifyField === verifyField.RESET_PASSWORD) {
      if (prevProps.navInfo.verify && !this.props.navInfo.verify) {
        this.clearModal();
      } else if (!prevProps.navInfo.verify && this.props.navInfo.verify) {
        this.showResetPasswordModal();
      }
    }
  }

  showResetPasswordModal() {
    const newURL = canonicalURLFromReduxState(
      {
        ...this.props.navInfo,
        verify: null,
      },
      this.props.location.pathname,
    );
    const onClose = () => history.push(newURL);
    const onSuccess = () => history.replace(newURL);
    this.setModal(
      <ResetPasswordModal onClose={onClose} onSuccess={onSuccess} />
    );
  }

  componentWillReceiveProps(nextProps: Props) {
    if (
      nextProps.actualizedCalendarQuery !== this.props.actualizedCalendarQuery
    ) {
      this.actualizedCalendarQuery = nextProps.actualizedCalendarQuery;
    }

    if (nextProps.loggedIn) {
      if (nextProps.location.pathname !== this.props.location.pathname) {
        const newNavInfo = navInfoFromURL(
          nextProps.location.pathname,
          nextProps.navInfo,
        );
        if (!_isEqual(newNavInfo)(nextProps.navInfo)) {
          this.props.dispatchActionPayload(updateNavInfoActionType, newNavInfo);
        }
      } else if (!_isEqual(nextProps.navInfo)(this.props.navInfo)) {
        const newURL = canonicalURLFromReduxState(
          nextProps.navInfo,
          nextProps.location.pathname,
        );
        if (newURL !== nextProps.location.pathname) {
          history.push(newURL);
        }
      }

      const calendarQuery = nextProps.currentCalendarQuery();
      if (
        !_isEqual(calendarQuery)(this.actualizedCalendarQuery) &&
        !_isEqual(calendarQuery)(nextProps.actualizedCalendarQuery)
      ) {
        this.actualizedCalendarQuery = calendarQuery;
        nextProps.dispatchActionPromise(
          updateCalendarQueryActionTypes,
          nextProps.updateCalendarQuery(calendarQuery, true),
          undefined,
          { calendarQuery },
        );
      }
    }

    const justLoggedIn = nextProps.loggedIn && !this.props.loggedIn;
    if (justLoggedIn) {
      const newURL = canonicalURLFromReduxState(
        nextProps.navInfo,
        nextProps.location.pathname,
      );
      if (nextProps.location.pathname !== newURL) {
        history.replace(newURL);
      }
    } else if (nextProps.activeThread !== this.props.activeThread) {
      App.updateFocusedThreads(
        nextProps,
        this.props.activeThread,
        this.props.activeThreadLatestMessage,
      );
    }

    const justLoggedOut = !nextProps.loggedIn && this.props.loggedIn;
    if (justLoggedOut && nextProps.location.pathname !== '/') {
      history.replace('/');
    }
  }

  render() {
    let content;
    if (this.props.loggedIn) {
      content = this.renderMainContent();
    } else {
      content = (
        <Splash
          setModal={this.setModal}
          currentModal={this.state.currentModal}
        />
      );
    }
    return (
      <React.Fragment>
        <Socket active={this.props.loggedIn && this.state.visible} />
        {content}
        {this.state.currentModal}
      </React.Fragment>
    );
  }

  renderMainContent() {
    const calendarNavClasses = classNames({
      [css['current-tab']]: this.props.navInfo.tab === "calendar",
    });
    const chatNavClasses = classNames({
      [css['current-tab']]: this.props.navInfo.tab === "chat",
    });

    let mainContent;
    if (this.props.navInfo.tab === "calendar") {
      mainContent = (
        <Calendar
          setModal={this.setModal}
          url={this.props.location.pathname}
        />
      );
    } else if (this.props.navInfo.tab === "chat") {
      mainContent = (
        <Chat />
      );
    }

    const { viewerID, unreadCount } = this.props;
    invariant(viewerID, "should be set");
    let chatBadge = null;
    if (unreadCount > 0) {
      chatBadge = (
        <div className={css.chatBadge}>
          {unreadCount}
        </div>
      );
    }

    return (
      <React.Fragment>
        <header className={css['header']}>
          <div className={css['main-header']}>
            <h1>SquadCal</h1>
            <ul className={css['nav-bar']}>
              <li className={calendarNavClasses}>
                <div><a onClick={this.onClickCalendar}>
                  <FontAwesomeIcon
                    icon={faCalendar}
                    className={css['nav-bar-icon']}
                  />
                  Calendar
                </a></div>
              </li>
              <li className={chatNavClasses}>
                <div><a onClick={this.onClickChat}>
                  <FontAwesomeIcon
                    icon={faChat}
                    className={css['nav-bar-icon']}
                  />
                  Chat
                  {chatBadge}
                </a></div>
              </li>
            </ul>
            <div className={css['upper-right']}>
              <LoadingIndicator
                status={this.props.entriesLoadingStatus}
                size="medium"
                loadingClassName={css['page-loading']}
                errorClassName={css['page-error']}
              />
              <AccountBar setModal={this.setModal} />
            </div>
          </div>
        </header>
        <div className={css['main-content-container']}>
          <div className={css['main-content']}>
            {mainContent}
          </div>
        </div>
      </React.Fragment>
    );
  }

  setModal = (modal: ?React.Node) => {
    this.setState({ currentModal: modal });
  }

  clearModal = () => {
    this.setModal(null);
  }

  onClickCalendar = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPayload(
      updateNavInfoActionType,
      {
        ...this.props.navInfo,
        tab: "calendar",
      },
    );
  }

  onClickChat = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPayload(
      updateNavInfoActionType,
      {
        ...this.props.navInfo,
        tab: "chat",
        activeChatThreadID: this.props.activeThreadCurrentlyUnread
          ? this.props.mostRecentReadThread
          : this.props.navInfo.activeChatThreadID,
      },
    );
  }

}

const fetchEntriesLoadingStatusSelector
  = createLoadingStatusSelector(fetchEntriesActionTypes);
const updateCalendarQueryLoadingStatusSelector
  = createLoadingStatusSelector(updateCalendarQueryActionTypes);

export default connect(
  (state: AppState) => {
    const activeChatThreadID = state.navInfo.activeChatThreadID;
    return {
      navInfo: state.navInfo,
      verifyField: state.verifyField,
      entriesLoadingStatus: combineLoadingStatuses(
        fetchEntriesLoadingStatusSelector(state),
        updateCalendarQueryLoadingStatusSelector(state),
      ),
      currentCalendarQuery: currentCalendarQuery(state),
      loggedIn: !!(state.currentUserInfo &&
        !state.currentUserInfo.anonymous && true),
      includeDeleted: includeDeletedSelector(state),
      mostRecentReadThread: mostRecentReadThreadSelector(state),
      activeThread: activeThreadSelector(state),
      activeThreadCurrentlyUnread: !activeChatThreadID ||
        state.threadStore.threadInfos[activeChatThreadID].currentUser.unread,
      activeThreadLatestMessage:
        activeChatThreadID && state.messageStore.threads[activeChatThreadID]
          ? state.messageStore.threads[activeChatThreadID].messageIDs[0]
          : null,
      viewerID: state.currentUserInfo && state.currentUserInfo.id,
      unreadCount: unreadCount(state),
      actualizedCalendarQuery: state.entryStore.actualizedCalendarQuery,
    };
  },
  { updateCalendarQuery, updateActivity },
)(App);
