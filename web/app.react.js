// @flow

import 'basscss/css/basscss.min.css';
import './theme.css';
import { config as faConfig } from '@fortawesome/fontawesome-svg-core';
import classnames from 'classnames';
import _isEqual from 'lodash/fp/isEqual.js';
import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import {
  fetchEntriesActionTypes,
  updateCalendarQueryActionTypes,
} from 'lib/actions/entry-actions.js';
import { ChatMentionContextProvider } from 'lib/components/chat-mention-provider.react.js';
import { EditUserAvatarProvider } from 'lib/components/edit-user-avatar-provider.react.js';
import { FarcasterChannelPrefetchHandler } from 'lib/components/farcaster-channel-prefetch-handler.react.js';
import { FarcasterDataHandler } from 'lib/components/farcaster-data-handler.react.js';
import { GlobalSearchIndexProvider } from 'lib/components/global-search-index-provider.react.js';
import {
  ModalProvider,
  useModalContext,
} from 'lib/components/modal-provider.react.js';
import { NeynarClientProvider } from 'lib/components/neynar-client-provider.react.js';
import PlatformDetailsSynchronizer from 'lib/components/platform-details-synchronizer.react.js';
import { QRAuthProvider } from 'lib/components/qr-auth-provider.react.js';
import { StaffContextProvider } from 'lib/components/staff-provider.react.js';
import SyncCommunityStoreHandler from 'lib/components/sync-community-store-handler.react.js';
import { DBOpsHandler } from 'lib/handlers/db-ops-handler.react.js';
import { HoldersHandler } from 'lib/handlers/holders-handler.react.js';
import { TunnelbrokerDeviceTokenHandler } from 'lib/handlers/tunnelbroker-device-token-handler.react.js';
import { UserInfosHandler } from 'lib/handlers/user-infos-handler.react.js';
import { IdentitySearchProvider } from 'lib/identity-search/identity-search-context.js';
import {
  createLoadingStatusSelector,
  combineLoadingStatuses,
} from 'lib/selectors/loading-selectors.js';
import { isLoggedIn } from 'lib/selectors/user-selectors.js';
import { extractMajorDesktopVersion } from 'lib/shared/version-utils.js';
import type { SecondaryTunnelbrokerConnection } from 'lib/tunnelbroker/secondary-tunnelbroker-connection.js';
import { TunnelbrokerProvider } from 'lib/tunnelbroker/tunnelbroker-context.js';
import type { LoadingStatus } from 'lib/types/loading-types.js';
import type { WebNavInfo } from 'lib/types/nav-types.js';
import type { Dispatch } from 'lib/types/redux-types.js';
import type { MessageToDeviceRequest } from 'lib/types/tunnelbroker/message-to-device-request-types.js';
import { getConfig, registerConfig } from 'lib/utils/config.js';
import { useDispatch } from 'lib/utils/redux-utils.js';
import { infoFromURL } from 'lib/utils/url-utils.js';
import { AlchemyENSCacheProvider } from 'lib/utils/wagmi-utils.js';

import QRCodeLogin from './account/qr-code-login.react.js';
import AppThemeWrapper from './app-theme-wrapper.react.js';
import { authoritativeKeyserverID } from './authoritative-keyserver.js';
import WebEditThreadAvatarProvider from './avatars/web-edit-thread-avatar-provider.react.js';
import Calendar from './calendar/calendar.react.js';
import Chat from './chat/chat.react.js';
import { EditModalProvider } from './chat/edit-message-provider.js';
import { MemberListSidebarProvider } from './chat/member-list-sidebar/member-list-sidebar-provider.react.js';
import { AutoJoinCommunityHandler } from './components/auto-join-community-handler.react.js';
import CommunitiesRefresher from './components/communities-refresher.react.js';
import DMActivityHandler from './components/dm-activity-handler.react.js';
import LogOutIfMissingCSATHandler from './components/log-out-if-missing-csat-handler.react.js';
import NavigationArrows from './components/navigation-arrows.react.js';
import MinVersionHandler from './components/version-handler.react.js';
import { olmAPI } from './crypto/olm-api.js';
import { sqliteAPI } from './database/sqlite-api.js';
import electron from './electron.js';
import InputStateContainer from './input/input-state-container.react.js';
import InviteLinkHandler from './invite-links/invite-link-handler.react.js';
import InviteLinksRefresher from './invite-links/invite-links-refresher.react.js';
import LoadingIndicator from './loading-indicator.react.js';
import { MenuProvider } from './menu-provider.react.js';
import UpdateModalHandler from './modals/update-modal.react.js';
import SettingsSwitcher from './navigation-panels/settings-switcher.react.js';
import Topbar from './navigation-panels/topbar.react.js';
import BadgeHandler from './push-notif/badge-handler.react.js';
import encryptedNotifUtilsAPI from './push-notif/encrypted-notif-utils-api.js';
import { PushNotificationsHandler } from './push-notif/push-notifs-handler.js';
import { updateNavInfoActionType } from './redux/action-types.js';
import DisconnectedBar from './redux/disconnected-bar.js';
import FocusHandler from './redux/focus-handler.react.js';
import { KeyserverReachabilityHandler } from './redux/keyserver-reachability-handler.js';
import { persistConfig } from './redux/persist.js';
import PolicyAcknowledgmentHandler from './redux/policy-acknowledgment-handler.js';
import { useSelector } from './redux/redux-utils.js';
import VisibilityHandler from './redux/visibility-handler.react.js';
import history from './router-history.js';
import { MessageSearchStateProvider } from './search/message-search-state-provider.react.js';
import AccountSettings from './settings/account-settings.react.js';
import DangerZone from './settings/danger-zone.react.js';
import KeyserverSelectionList from './settings/keyserver-selection-list.react.js';
import { getCommSharedWorker } from './shared-worker/shared-worker-provider.js';
import CommunityPicker from './sidebar/community-picker.react.js';
import Splash from './splash/splash.react.js';
import './typography.css';
import css from './style.css';
import { TooltipProvider } from './tooltips/tooltip-provider.js';
import { canonicalURLFromReduxState, navInfoFromURL } from './url-utils.js';
import {
  composeTunnelbrokerQRAuthMessage,
  generateQRAuthAESKey,
  parseTunnelbrokerQRAuthMessage,
  useHandleSecondaryDeviceLogInError,
} from './utils/qr-code-utils.js';
import { useWebLock, TUNNELBROKER_LOCK_NAME } from './web-lock.js';

// We want Webpack's css-loader and style-loader to handle the Fontawesome CSS,
// so we disable the autoAddCss logic and import the CSS file. Otherwise every
// icon flashes huge for a second before the CSS is loaded.
import '@fortawesome/fontawesome-svg-core/styles.css';

faConfig.autoAddCss = false;
const desktopDetails = electron?.version
  ? { majorDesktopVersion: extractMajorDesktopVersion(electron?.version) }
  : null;

registerConfig({
  // We can't securely cache credentials on web
  resolveKeyserverSessionInvalidationUsingNativeCredentials: null,
  setSessionIDOnRequest: true,
  // Never reset the calendar range
  calendarRangeInactivityLimit: null,
  platformDetails: {
    platform: electron?.platform ?? 'web',
    codeVersion: 144,
    stateVersion: persistConfig.version,
    ...desktopDetails,
  },
  authoritativeKeyserverID,
  olmAPI,
  sqliteAPI,
  encryptedNotifUtilsAPI,
  showAlert: (title: string, message: string) =>
    window.alert(`${title}: ${message}`),
});

const versionBroadcast = new BroadcastChannel('comm_version');
versionBroadcast.postMessage(getConfig().platformDetails.codeVersion);
versionBroadcast.onmessage = (event: MessageEvent) => {
  if (event.data && event.data !== getConfig().platformDetails.codeVersion) {
    location.reload();
  }
};

// Start initializing the shared worker immediately
void getCommSharedWorker();

type BaseProps = {
  +location: {
    +pathname: string,
    ...
  },
};
type Props = {
  ...BaseProps,
  // Redux state
  +navInfo: WebNavInfo,
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
      const urlInfo = infoFromURL(pathname);
      const newNavInfo = navInfoFromURL(urlInfo, { navInfo });
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

  render(): React.Node {
    let content;
    if (this.props.loggedIn) {
      content = (
        <>
          <WebEditThreadAvatarProvider>
            <EditUserAvatarProvider>
              <StaffContextProvider>
                <MemberListSidebarProvider>
                  {this.renderMainContent()}
                  {this.props.modals}
                </MemberListSidebarProvider>
              </StaffContextProvider>
            </EditUserAvatarProvider>
          </WebEditThreadAvatarProvider>
        </>
      );
    } else {
      content = (
        <>
          {this.renderLoginPage()}
          {this.props.modals}
        </>
      );
    }
    return (
      <DndProvider backend={HTML5Backend}>
        <EditModalProvider>
          <MenuProvider>
            <TooltipProvider>
              <MessageSearchStateProvider>
                <ChatMentionContextProvider>
                  <GlobalSearchIndexProvider>
                    <FocusHandler />
                    <VisibilityHandler />
                    <PolicyAcknowledgmentHandler />
                    <PushNotificationsHandler />
                    <InviteLinkHandler />
                    <InviteLinksRefresher />
                    <CommunitiesRefresher />
                    <MinVersionHandler />
                    <PlatformDetailsSynchronizer />
                    <LogOutIfMissingCSATHandler />
                    <UserInfosHandler />
                    <TunnelbrokerDeviceTokenHandler />
                    <FarcasterChannelPrefetchHandler />
                    <FarcasterDataHandler />
                    <AutoJoinCommunityHandler />
                    <SyncCommunityStoreHandler />
                    <DMActivityHandler />
                    <HoldersHandler />
                    {content}
                  </GlobalSearchIndexProvider>
                </ChatMentionContextProvider>
              </MessageSearchStateProvider>
            </TooltipProvider>
          </MenuProvider>
        </EditModalProvider>
      </DndProvider>
    );
  }

  onHeaderDoubleClick = (): void => electron?.doubleClickTopBar();
  stopDoubleClickPropagation: ?(SyntheticEvent<HTMLAnchorElement>) => void =
    electron ? e => e.stopPropagation() : null;

  renderLoginPage(): React.Node {
    const { loginMethod } = this.props.navInfo;

    if (loginMethod === 'qr-code') {
      return <QRCodeLogin />;
    }

    return <Splash />;
  }

  renderMainContent(): React.Node {
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
      [css['wordmark-macos']]: electron?.platform === 'macos',
    });

    return (
      <div className={css.layout}>
        <KeyserverReachabilityHandler />
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

  getMainContentWithSwitcher(): React.Node {
    const { tab, settingsSection } = this.props.navInfo;
    let mainContent: React.Node;

    if (tab === 'settings') {
      if (settingsSection === 'account') {
        mainContent = <AccountSettings />;
      } else if (settingsSection === 'friend-list') {
        mainContent = null;
      } else if (settingsSection === 'block-list') {
        mainContent = null;
      } else if (settingsSection === 'keyservers') {
        mainContent = <KeyserverSelectionList />;
      } else if (settingsSection === 'build-info') {
        mainContent = null;
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

const WEB_TUNNELBROKER_CHANNEL = new BroadcastChannel('shared-tunnelbroker');
const WEB_TUNNELBROKER_MESSAGE_TYPES = Object.freeze({
  SEND_MESSAGE: 'send-message',
  MESSAGE_STATUS: 'message-status',
});

function useOtherTabsTunnelbrokerConnection(): SecondaryTunnelbrokerConnection {
  const onSendMessageCallbacks = React.useRef<
    Set<(MessageToDeviceRequest) => mixed>,
  >(new Set());

  const onMessageStatusCallbacks = React.useRef<
    Set<(messageID: string, error: ?string) => mixed>,
  >(new Set());

  React.useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      if (typeof event.data !== 'object' || !event.data) {
        console.log(
          'Invalid message received from shared ' +
            'tunnelbroker broadcast channel',
          event.data,
        );
        return;
      }
      const data = event.data;
      if (data.type === WEB_TUNNELBROKER_MESSAGE_TYPES.SEND_MESSAGE) {
        if (typeof data.message !== 'object' || !data.message) {
          console.log(
            'Invalid tunnelbroker message request received ' +
              'from shared tunnelbroker broadcast channel',
            event.data,
          );
          return;
        }
        // We know that the input was already validated
        const message: MessageToDeviceRequest = (data.message: any);

        for (const callback of onSendMessageCallbacks.current) {
          callback(message);
        }
      } else if (data.type === WEB_TUNNELBROKER_MESSAGE_TYPES.MESSAGE_STATUS) {
        if (typeof data.messageID !== 'string') {
          console.log(
            'Missing message id in message status message ' +
              'from shared tunnelbroker broadcast channel',
          );
          return;
        }
        const messageID = data.messageID;

        if (
          typeof data.error !== 'string' &&
          data.error !== null &&
          data.error !== undefined
        ) {
          console.log(
            'Invalid error in message status message ' +
              'from shared tunnelbroker broadcast channel',
            data.error,
          );
          return;
        }
        const error = data.error;

        for (const callback of onMessageStatusCallbacks.current) {
          callback(messageID, error);
        }
      } else {
        console.log(
          'Invalid message type ' +
            'from shared tunnelbroker broadcast channel',
          data,
        );
      }
    };

    WEB_TUNNELBROKER_CHANNEL.addEventListener('message', messageHandler);
    return () =>
      WEB_TUNNELBROKER_CHANNEL.removeEventListener('message', messageHandler);
  }, [onMessageStatusCallbacks, onSendMessageCallbacks]);

  return React.useMemo(
    () => ({
      sendMessage: message =>
        WEB_TUNNELBROKER_CHANNEL.postMessage({
          type: WEB_TUNNELBROKER_MESSAGE_TYPES.SEND_MESSAGE,
          message,
        }),
      onSendMessage: callback => {
        onSendMessageCallbacks.current.add(callback);
        return () => {
          onSendMessageCallbacks.current.delete(callback);
        };
      },
      setMessageStatus: (messageID, error) => {
        WEB_TUNNELBROKER_CHANNEL.postMessage({
          type: WEB_TUNNELBROKER_MESSAGE_TYPES.MESSAGE_STATUS,
          messageID,
          error,
        });
      },
      onMessageStatus: callback => {
        onMessageStatusCallbacks.current.add(callback);
        return () => {
          onMessageStatusCallbacks.current.delete(callback);
        };
      },
    }),
    [onMessageStatusCallbacks, onSendMessageCallbacks],
  );
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

    const dispatch = useDispatch();
    const modalContext = useModalContext();
    const modals = React.useMemo(
      () =>
        modalContext.modals.map(([modal, key]) => (
          <React.Fragment key={key}>{modal}</React.Fragment>
        )),
      [modalContext.modals],
    );

    const { lockStatus, releaseLockOrAbortRequest } = useWebLock(
      TUNNELBROKER_LOCK_NAME,
    );

    const secondaryTunnelbrokerConnection: SecondaryTunnelbrokerConnection =
      useOtherTabsTunnelbrokerConnection();

    const handleSecondaryDeviceLogInError =
      useHandleSecondaryDeviceLogInError();

    return (
      <AppThemeWrapper>
        <AlchemyENSCacheProvider>
          <NeynarClientProvider apiKey={process.env.COMM_NEYNAR_KEY}>
            <TunnelbrokerProvider
              shouldBeClosed={lockStatus !== 'acquired'}
              onClose={releaseLockOrAbortRequest}
              secondaryTunnelbrokerConnection={secondaryTunnelbrokerConnection}
            >
              <BadgeHandler />
              <IdentitySearchProvider>
                <QRAuthProvider
                  parseTunnelbrokerQRAuthMessage={
                    parseTunnelbrokerQRAuthMessage
                  }
                  composeTunnelbrokerQRAuthMessage={
                    composeTunnelbrokerQRAuthMessage
                  }
                  generateAESKey={generateQRAuthAESKey}
                  onLogInError={handleSecondaryDeviceLogInError}
                >
                  <App
                    {...props}
                    navInfo={navInfo}
                    entriesLoadingStatus={entriesLoadingStatus}
                    loggedIn={loggedIn}
                    activeThreadCurrentlyUnread={activeThreadCurrentlyUnread}
                    dispatch={dispatch}
                    modals={modals}
                  />
                </QRAuthProvider>
                <DBOpsHandler />
              </IdentitySearchProvider>
            </TunnelbrokerProvider>
          </NeynarClientProvider>
        </AlchemyENSCacheProvider>
      </AppThemeWrapper>
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
