// @flow

import type { LoadingStatus } from 'lib/types/loading-types';
import type { DispatchActionPayload } from 'lib/utils/action-utils';
import {
  verifyField,
  type ServerVerificationResult,
  serverVerificationResultPropType,
} from 'lib/types/verify-types';

import * as React from 'react';
import invariant from 'invariant';
import _isEqual from 'lodash/fp/isEqual';
import PropTypes from 'prop-types';
import Visibility from 'visibilityjs';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faComments } from '@fortawesome/free-solid-svg-icons';
import { config as faConfig } from '@fortawesome/fontawesome-svg-core';
import classNames from 'classnames';
import HTML5Backend from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

import {
  fetchEntriesActionTypes,
  updateCalendarQueryActionTypes,
} from 'lib/actions/entry-actions';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors';
import { connect } from 'lib/utils/redux-utils';
import { registerConfig } from 'lib/utils/config';
import {
  mostRecentReadThreadSelector,
  unreadCount,
} from 'lib/selectors/thread-selectors';
import {
  backgroundActionType,
  foregroundActionType,
} from 'lib/reducers/foreground-reducer';

import { canonicalURLFromReduxState, navInfoFromURL } from './url-utils';
import css from './style.css';
import AccountBar from './account-bar.react';
import Calendar from './calendar/calendar.react';
import ResetPasswordModal from './modals/account/reset-password-modal.react';
import VerificationModal from './modals/account/verification-modal.react';
import LoadingIndicator from './loading-indicator.react';
import history from './router-history';
import {
  type AppState,
  type NavInfo,
  navInfoPropType,
  updateNavInfoActionType,
} from './redux-setup';
import Splash from './splash/splash.react';
import Chat from './chat/chat.react';

// We want Webpack's css-loader and style-loader to handle the Fontawesome CSS,
// so we disable the autoAddCss logic and import the CSS file. Otherwise every
// icon flashes huge for a second before the CSS is loaded.
import '@fortawesome/fontawesome-svg-core/styles.css';
faConfig.autoAddCss = false;

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
  platformDetails: { platform: 'web' },
});

type Props = {
  location: {
    pathname: string,
  },
  // Redux state
  navInfo: NavInfo,
  serverVerificationResult: ?ServerVerificationResult,
  entriesLoadingStatus: LoadingStatus,
  loggedIn: boolean,
  mostRecentReadThread: ?string,
  activeThreadCurrentlyUnread: boolean,
  viewerID: ?string,
  unreadCount: number,
  // Redux dispatch functions
  dispatchActionPayload: DispatchActionPayload,
};
type State = {|
  currentModal: ?React.Node,
|};
class App extends React.PureComponent<Props, State> {
  static propTypes = {
    location: PropTypes.shape({
      pathname: PropTypes.string.isRequired,
    }).isRequired,
    navInfo: navInfoPropType.isRequired,
    serverVerificationResult: serverVerificationResultPropType,
    entriesLoadingStatus: PropTypes.string.isRequired,
    loggedIn: PropTypes.bool.isRequired,
    mostRecentReadThread: PropTypes.string,
    activeThreadCurrentlyUnread: PropTypes.bool.isRequired,
    viewerID: PropTypes.string,
    unreadCount: PropTypes.number.isRequired,
    dispatchActionPayload: PropTypes.func.isRequired,
  };
  state = {
    currentModal: null,
  };

  componentDidMount() {
    const { navInfo, serverVerificationResult } = this.props;
    if (navInfo.verify && serverVerificationResult) {
      if (serverVerificationResult.field === verifyField.RESET_PASSWORD) {
        this.showResetPasswordModal();
      } else {
        const newURL = canonicalURLFromReduxState(
          { ...navInfo, verify: null },
          this.props.location.pathname,
        );
        history.replace(newURL);
        this.setModal(<VerificationModal onClose={this.clearModal} />);
      }
    }

    if (this.props.loggedIn) {
      const newURL = canonicalURLFromReduxState(
        navInfo,
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
    if (state === 'visible') {
      this.props.dispatchActionPayload(foregroundActionType, null);
    } else {
      this.props.dispatchActionPayload(backgroundActionType, null);
    }
  };

  componentDidUpdate(prevProps: Props) {
    if (this.props.loggedIn) {
      if (this.props.location.pathname !== prevProps.location.pathname) {
        const newNavInfo = navInfoFromURL(this.props.location.pathname, {
          navInfo: this.props.navInfo,
        });
        if (!_isEqual(newNavInfo)(this.props.navInfo)) {
          this.props.dispatchActionPayload(updateNavInfoActionType, newNavInfo);
        }
      } else if (!_isEqual(this.props.navInfo)(prevProps.navInfo)) {
        const newURL = canonicalURLFromReduxState(
          this.props.navInfo,
          this.props.location.pathname,
        );
        if (newURL !== this.props.location.pathname) {
          history.push(newURL);
        }
      }
    }

    const justLoggedIn = this.props.loggedIn && !prevProps.loggedIn;
    if (justLoggedIn) {
      const newURL = canonicalURLFromReduxState(
        this.props.navInfo,
        this.props.location.pathname,
      );
      if (this.props.location.pathname !== newURL) {
        history.replace(newURL);
      }
    }

    const justLoggedOut = !this.props.loggedIn && prevProps.loggedIn;
    if (justLoggedOut && this.props.location.pathname !== '/') {
      history.replace('/');
    }

    const { navInfo, serverVerificationResult } = this.props;
    if (
      serverVerificationResult &&
      serverVerificationResult.field === verifyField.RESET_PASSWORD
    ) {
      if (navInfo.verify && !prevProps.navInfo.verify) {
        this.showResetPasswordModal();
      } else if (!navInfo.verify && prevProps.navInfo.verify) {
        this.clearModal();
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
      <ResetPasswordModal onClose={onClose} onSuccess={onSuccess} />,
    );
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
      <DndProvider backend={HTML5Backend}>
        {content}
        {this.state.currentModal}
      </DndProvider>
    );
  }

  renderMainContent() {
    const calendarNavClasses = classNames({
      [css['current-tab']]: this.props.navInfo.tab === 'calendar',
    });
    const chatNavClasses = classNames({
      [css['current-tab']]: this.props.navInfo.tab === 'chat',
    });

    let mainContent;
    if (this.props.navInfo.tab === 'calendar') {
      mainContent = (
        <Calendar setModal={this.setModal} url={this.props.location.pathname} />
      );
    } else if (this.props.navInfo.tab === 'chat') {
      mainContent = <Chat setModal={this.setModal} />;
    }

    const { viewerID, unreadCount: curUnreadCount } = this.props;
    invariant(viewerID, 'should be set');
    let chatBadge = null;
    if (curUnreadCount > 0) {
      chatBadge = <div className={css.chatBadge}>{curUnreadCount}</div>;
    }

    return (
      <React.Fragment>
        <header className={css['header']}>
          <div className={css['main-header']}>
            <h1>SquadCal</h1>
            <ul className={css['nav-bar']}>
              <li className={calendarNavClasses}>
                <div>
                  <a onClick={this.onClickCalendar}>
                    <FontAwesomeIcon
                      icon={faCalendar}
                      className={css['nav-bar-icon']}
                    />
                    Calendar
                  </a>
                </div>
              </li>
              <li className={chatNavClasses}>
                <div>
                  <a onClick={this.onClickChat}>
                    <FontAwesomeIcon
                      icon={faComments}
                      className={css['nav-bar-icon']}
                    />
                    Chat
                    {chatBadge}
                  </a>
                </div>
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
          <div className={css['main-content']}>{mainContent}</div>
        </div>
      </React.Fragment>
    );
  }

  setModal = (modal: ?React.Node) => {
    this.setState({ currentModal: modal });
  };

  clearModal = () => {
    this.setModal(null);
  };

  onClickCalendar = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPayload(updateNavInfoActionType, {
      ...this.props.navInfo,
      tab: 'calendar',
    });
  };

  onClickChat = (event: SyntheticEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    this.props.dispatchActionPayload(updateNavInfoActionType, {
      ...this.props.navInfo,
      tab: 'chat',
      activeChatThreadID: this.props.activeThreadCurrentlyUnread
        ? this.props.mostRecentReadThread
        : this.props.navInfo.activeChatThreadID,
    });
  };
}

const fetchEntriesLoadingStatusSelector = createLoadingStatusSelector(
  fetchEntriesActionTypes,
);
const updateCalendarQueryLoadingStatusSelector = createLoadingStatusSelector(
  updateCalendarQueryActionTypes,
);

export default connect(
  (state: AppState) => {
    const activeChatThreadID = state.navInfo.activeChatThreadID;
    return {
      navInfo: state.navInfo,
      serverVerificationResult: state.serverVerificationResult,
      entriesLoadingStatus: combineLoadingStatuses(
        fetchEntriesLoadingStatusSelector(state),
        updateCalendarQueryLoadingStatusSelector(state),
      ),
      loggedIn: !!(
        state.currentUserInfo &&
        !state.currentUserInfo.anonymous &&
        true
      ),
      mostRecentReadThread: mostRecentReadThreadSelector(state),
      activeThreadCurrentlyUnread:
        !activeChatThreadID ||
        state.threadStore.threadInfos[activeChatThreadID].currentUser.unread,
      viewerID: state.currentUserInfo && state.currentUserInfo.id,
      unreadCount: unreadCount(state),
    };
  },
  null,
  true,
)(App);
