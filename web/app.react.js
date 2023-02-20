// @flow

import 'basscss/css/basscss.min.css';
import './theme.css';
import { config as faConfig } from '@fortawesome/fontawesome-svg-core';
import classnames from 'classnames';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch } from 'react-redux';
import { WagmiConfig } from 'wagmi';

import {
  fetchEntriesActionTypes,
  updateCalendarQueryActionTypes,
} from 'lib/actions/entry-actions.js';
import {
  ModalProvider,
  useModalContext,
} from 'lib/components/modal-provider.react.js';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors.js';
import { unreadCount } from 'lib/selectors/thread-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import { registerConfig } from 'lib/utils/config.js';

import Calendar from './calendar/calendar.react.js';
import Chat from './chat/chat.react.js';
import { TooltipProvider } from './chat/tooltip-provider.js';
import NavigationArrows from './components/navigation-arrows.react.js';
import electron from './electron.js';
import InputStateContainer from './input/input-state-container.react.js';
import LoadingIndicator from './loading-indicator.react.js';
import { MenuProvider } from './menu-provider.react.js';
import AppsDirectory from './modals/apps/apps-directory-modal.react.js';
import UpdateModalHandler from './modals/update-modal.react.js';
import SettingsSwitcher from './navigation-panels/settings-switcher.react.js';
import Topbar from './navigation-panels/topbar.react.js';
import { updateNavInfoActionType } from './redux/action-types.js';
import DeviceIDUpdater from './redux/device-id-updater.js';
import DisconnectedBarVisibilityHandler from './redux/disconnected-bar-visibility-handler.js';
import DisconnectedBar from './redux/disconnected-bar.js';
import FocusHandler from './redux/focus-handler.react.js';
import PolicyAcknowledgmentHandler from './redux/policy-acknowledgment-handler.js';
import { useSelector } from './redux/redux-utils.js';
import VisibilityHandler from './redux/visibility-handler.react.js';
import history from './router-history.js';
import AccountSettings from './settings/account-settings.react.js';
import DangerZone from './settings/danger-zone.react.js';
import CommunityPicker from './sidebar/community-picker.react.js';
import Splash from './splash/splash.react.js';
import './typography.css';
import css from './style.css';
import getTitle from './title/getTitle.js';
import { type NavInfo } from './types/nav-types.js';
import { canonicalURLFromReduxState, navInfoFromURL } from './url-utils.js';
import { WagmiENSCacheProvider, wagmiClient } from './utils/wagmi-utils.js';

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
    if (loggedIn !== prevProps.loggedIn) {
      electron?.clearHistory();
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
            <WagmiConfig client={wagmiClient}>
              <WagmiENSCacheProvider>
                <FocusHandler />
                <VisibilityHandler />
                <DeviceIDUpdater />
                <PolicyAcknowledgmentHandler />
                {content}
                {this.props.modals}
              </WagmiENSCacheProvider>
            </WagmiConfig>
          </MenuProvider>
        </TooltipProvider>
      </DndProvider>
    );
  }

  onHeaderDoubleClick = () => electron?.doubleClickTopBar();
  stopDoubleClickPropagation = electron ? e => e.stopPropagation() : null;

  renderMainContent() {
    const mainContent = this.getMainContentWithSwitcher();

    let navigationArrows = null;
    if (electron) {
      navigationArrows = <NavigationArrows />;
    }

    const headerClasses = classnames({
      [css.header]: true,
      [css['electron-draggable']]: electron,
    });

    const wordmarkClasses = classnames({
      [css.wordmark]: true,
      [css['electron-non-draggable']]: electron,
    });

    return (
      <div className={css.layout}>
        <DisconnectedBarVisibilityHandler />
        <DisconnectedBar />
        <UpdateModalHandler />
        <header
          className={headerClasses}
          onDoubleClick={this.onHeaderDoubleClick}
        >
          <div className={css['main-header']}>
            <h1 className={wordmarkClasses}>
              <a
                title="Comm Home"
                aria-label="Go to Comm Home"
                onClick={this.onWordmarkClicked}
                onDoubleClick={this.stopDoubleClickPropagation}
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
        <InputStateContainer>{mainContent}</InputStateContainer>
        <div className={css.sidebar}>
          <CommunityPicker />
        </div>
      </div>
    );
  }

  getMainContentWithSwitcher() {
    const { tab, settingsSection } = this.props.navInfo;
    let mainContent;

    if (tab === 'settings') {
      if (settingsSection === 'account') {
        mainContent = <AccountSettings />;
      } else if (settingsSection === 'danger-zone') {
        mainContent = <DangerZone />;
      }
      return (
        <div className={css['main-content-container']}>
          <div className={css.switcher}>
            <SettingsSwitcher />
          </div>
          <div className={css['main-content']}>{mainContent}</div>
        </div>
      );
    }

    if (tab === 'calendar') {
      mainContent = <Calendar url={this.props.location.pathname} />;
    } else if (tab === 'chat') {
      mainContent = <Chat />;
    } else if (tab === 'apps') {
      mainContent = <AppsDirectory />;
    }

    const mainContentClass = classnames(
      css['main-content-container'],
      css['main-content-container-column'],
    );
    return (
      <div className={mainContentClass}>
        <Topbar />
        <div className={css['main-content']}>{mainContent}</div>
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
      electron?.setBadge(boundUnreadCount === 0 ? null : boundUnreadCount);
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
