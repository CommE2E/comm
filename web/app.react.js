// @flow

import 'basscss/css/basscss.min.css';
import './theme.css';
import { config as faConfig } from '@fortawesome/fontawesome-svg-core';
import _isEqual from 'lodash/fp/isEqual';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch } from 'react-redux';

import {
  fetchEntriesActionTypes,
  updateCalendarQueryActionTypes,
} from 'lib/actions/entry-actions';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors';
import {
  mostRecentReadThreadSelector,
  unreadCount,
} from 'lib/selectors/thread-selectors';
import { isLoggedIn } from 'lib/selectors/user-selectors';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { Dispatch } from 'lib/types/redux-types';
import { registerConfig } from 'lib/utils/config';

import AppsDirectory from './apps/apps-directory.react';
import Calendar from './calendar/calendar.react';
import Chat from './chat/chat.react';
import InputStateContainer from './input/input-state-container.react';
import LoadingIndicator from './loading-indicator.react';
import { ModalProvider, useModalContext } from './modals/modal-provider.react';
import DisconnectedBar from './redux/disconnected-bar';
import DisconnectedBarVisibilityHandler from './redux/disconnected-bar-visibility-handler';
import FocusHandler from './redux/focus-handler.react';
import { useSelector } from './redux/redux-utils';
import VisibilityHandler from './redux/visibility-handler.react';
import history from './router-history';
import LeftLayoutAside from './sidebar/left-layout-aside.react';
import Splash from './splash/splash.react';
import './typography.css';
import css from './style.css';
import getTitle from './title/getTitle';
import { type NavInfo, updateNavInfoActionType } from './types/nav-types';
import { canonicalURLFromReduxState, navInfoFromURL } from './url-utils';

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

type BaseProps = {
  +location: {
    +pathname: string,
    ...
  },
};
type Props = {
  ...BaseProps,
  // Redux state
  +navInfo: NavInfo,
  +entriesLoadingStatus: LoadingStatus,
  +loggedIn: boolean,
  +mostRecentReadThread: ?string,
  +activeThreadCurrentlyUnread: boolean,
  // Redux dispatch functions
  +dispatch: Dispatch,
  +modal: ?React.Node,
};
class App extends React.PureComponent<Props> {
  componentDidMount() {
    const {
      navInfo,
      location: { pathname },
      loggedIn,
    } = this.props;
    const newURL = canonicalURLFromReduxState(navInfo, pathname, loggedIn);
    if (pathname !== newURL) {
      history.replace(newURL);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const {
      navInfo,
      location: { pathname },
      loggedIn,
    } = this.props;
    if (!_isEqual(navInfo)(prevProps.navInfo)) {
      const newURL = canonicalURLFromReduxState(navInfo, pathname, loggedIn);
      if (newURL !== pathname) {
        history.push(newURL);
      }
    } else if (pathname !== prevProps.location.pathname) {
      const newNavInfo = navInfoFromURL(pathname, { navInfo });
      if (!_isEqual(newNavInfo)(navInfo)) {
        this.props.dispatch({
          type: updateNavInfoActionType,
          payload: newNavInfo,
        });
      }
    } else if (loggedIn !== prevProps.loggedIn) {
      const newURL = canonicalURLFromReduxState(navInfo, pathname, loggedIn);
      if (newURL !== pathname) {
        history.replace(newURL);
      }
    }
  }

  render() {
    let content;
    if (this.props.loggedIn) {
      content = this.renderMainContent();
    } else {
      content = <Splash />;
    }
    return (
      <DndProvider backend={HTML5Backend}>
        <FocusHandler />
        <VisibilityHandler />
        {content}
        {this.props.modal}
      </DndProvider>
    );
  }

  renderMainContent() {
    let mainContent;
    if (this.props.navInfo.tab === 'calendar') {
      mainContent = <Calendar url={this.props.location.pathname} />;
    } else if (this.props.navInfo.tab === 'chat') {
      mainContent = <Chat />;
    } else if (this.props.navInfo.tab === 'apps') {
      mainContent = <AppsDirectory />;
    }

    return (
      <div className={css.layout}>
        <DisconnectedBarVisibilityHandler />
        <DisconnectedBar />
        <header className={css['header']}>
          <div className={css['main-header']}>
            <h1>Comm</h1>
            <div className={css['upper-right']}>
              <LoadingIndicator
                status={this.props.entriesLoadingStatus}
                size="medium"
                loadingClassName={css['page-loading']}
                errorClassName={css['page-error']}
              />
            </div>
          </div>
        </header>
        <InputStateContainer>
          <div className={css['main-content-container']}>
            <div className={css['main-content']}>{mainContent}</div>
          </div>
        </InputStateContainer>
        <LeftLayoutAside />
      </div>
    );
  }
}

const fetchEntriesLoadingStatusSelector = createLoadingStatusSelector(
  fetchEntriesActionTypes,
);
const updateCalendarQueryLoadingStatusSelector = createLoadingStatusSelector(
  updateCalendarQueryActionTypes,
);

const ConnectedApp: React.ComponentType<BaseProps> = React.memo<BaseProps>(
  function ConnectedApp(props) {
    const activeChatThreadID = useSelector(
      state => state.navInfo.activeChatThreadID,
    );
    const navInfo = useSelector(state => state.navInfo);

    const fetchEntriesLoadingStatus = useSelector(
      fetchEntriesLoadingStatusSelector,
    );
    const updateCalendarQueryLoadingStatus = useSelector(
      updateCalendarQueryLoadingStatusSelector,
    );
    const entriesLoadingStatus = combineLoadingStatuses(
      fetchEntriesLoadingStatus,
      updateCalendarQueryLoadingStatus,
    );

    const loggedIn = useSelector(isLoggedIn);
    const mostRecentReadThread = useSelector(mostRecentReadThreadSelector);
    const activeThreadCurrentlyUnread = useSelector(
      state =>
        !activeChatThreadID ||
        !!state.threadStore.threadInfos[activeChatThreadID]?.currentUser.unread,
    );

    const boundUnreadCount = useSelector(unreadCount);
    React.useEffect(() => {
      document.title = getTitle(boundUnreadCount);
    }, [boundUnreadCount]);

    const dispatch = useDispatch();
    const modalContext = useModalContext();

    return (
      <App
        {...props}
        navInfo={navInfo}
        entriesLoadingStatus={entriesLoadingStatus}
        loggedIn={loggedIn}
        mostRecentReadThread={mostRecentReadThread}
        activeThreadCurrentlyUnread={activeThreadCurrentlyUnread}
        dispatch={dispatch}
        modal={modalContext.modal}
      />
    );
  },
);

function AppWithProvider(props: BaseProps): React.Node {
  return (
    <ModalProvider>
      <ConnectedApp {...props} />
    </ModalProvider>
  );
}

export default AppWithProvider;
