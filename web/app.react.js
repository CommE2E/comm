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
import { unreadCount } from 'lib/selectors/thread-selectors';
import { isLoggedIn } from 'lib/selectors/user-selectors';
import type { LoadingStatus } from 'lib/types/loading-types';
import type { Dispatch } from 'lib/types/redux-types';
import { registerConfig } from 'lib/utils/config';

import AppsDirectory from './apps/apps-directory.react';
import Calendar from './calendar/calendar.react';
import Chat from './chat/chat.react';
import { TooltipProvider } from './chat/tooltip-provider';
import NavigationArrows from './components/navigation-arrows.react';
import InputStateContainer from './input/input-state-container.react';
import LoadingIndicator from './loading-indicator.react';
import { MenuProvider } from './menu-provider.react';
import { ModalProvider, useModalContext } from './modals/modal-provider.react';
import { updateNavInfoActionType } from './redux/action-types';
import DeviceIDUpdater from './redux/device-id-updater';
import DisconnectedBar from './redux/disconnected-bar';
import DisconnectedBarVisibilityHandler from './redux/disconnected-bar-visibility-handler';
import FocusHandler from './redux/focus-handler.react';
import { useSelector } from './redux/redux-utils';
import VisibilityHandler from './redux/visibility-handler.react';
import history from './router-history';
import AccountSettings from './settings/account-settings.react';
import DangerZone from './settings/danger-zone.react';
import LeftLayoutAside from './sidebar/left-layout-aside.react';
import Splash from './splash/splash.react';
import './typography.css';
import css from './style.css';
import getTitle from './title/getTitle';
import { type NavInfo } from './types/nav-types';
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
  +activeThreadCurrentlyUnread: boolean,
  // Redux dispatch functions
  +dispatch: Dispatch,
  +modals: $ReadOnlyArray<React.Node>,
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

  onWordmarkClicked = () => {
    this.props.dispatch({
      type: updateNavInfoActionType,
      payload: { tab: 'chat' },
    });
  };

  render() {
    let content;
    if (this.props.loggedIn) {
      content = this.renderMainContent();
    } else {
      content = <Splash />;
    }
    return (
      <DndProvider backend={HTML5Backend}>
        <TooltipProvider>
          <MenuProvider>
            <FocusHandler />
            <VisibilityHandler />
            <DeviceIDUpdater />
            {content}
            {this.props.modals}
          </MenuProvider>
        </TooltipProvider>
      </DndProvider>
    );
  }

  renderMainContent() {
    let mainContent;
    const { tab, settingsSection } = this.props.navInfo;
    if (tab === 'calendar') {
      mainContent = <Calendar url={this.props.location.pathname} />;
    } else if (tab === 'chat') {
      mainContent = <Chat />;
    } else if (tab === 'apps') {
      mainContent = <AppsDirectory />;
    } else if (tab === 'settings') {
      if (settingsSection === 'account') {
        mainContent = <AccountSettings />;
      } else if (settingsSection === 'danger-zone') {
        mainContent = <DangerZone />;
      }
    }

    const shouldShowNavigationArrows = false;
    let navigationArrows = null;
    if (shouldShowNavigationArrows) {
      navigationArrows = <NavigationArrows />;
    }

    return (
      <div className={css.layout}>
        <DisconnectedBarVisibilityHandler />
        <DisconnectedBar />
        <header className={css['header']}>
          <div className={css['main-header']}>
            <h1 className={css.wordmark}>
              <a
                title="Comm Home"
                aria-label="Go to Comm Home"
                onClick={this.onWordmarkClicked}
              >
                Comm
              </a>
            </h1>
            {navigationArrows}
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
    const modals = React.useMemo(
      () =>
        modalContext.modals.map(([modal, key]) => (
          <React.Fragment key={key}>{modal}</React.Fragment>
        )),
      [modalContext.modals],
    );

    return (
      <App
        {...props}
        navInfo={navInfo}
        entriesLoadingStatus={entriesLoadingStatus}
        loggedIn={loggedIn}
        activeThreadCurrentlyUnread={activeThreadCurrentlyUnread}
        dispatch={dispatch}
        modals={modals}
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
