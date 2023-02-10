// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Alert } from 'react-native';

import { threadIsPending } from 'lib/shared/thread-utils.js';

import { clearThreadsActionType } from '../navigation/action-types.js';
import { useActiveThread } from '../navigation/nav-selectors.js';
import { NavContext } from '../navigation/navigation-context.js';
import {
  getThreadIDFromRoute,
  getChildRouteFromNavigatorRoute,
} from '../navigation/navigation-utils.js';
import {
  AppRouteName,
  ChatRouteName,
  CommunityDrawerNavigatorRouteName,
  TabNavigatorRouteName,
} from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import type { AppState } from '../redux/state-types.js';

const ThreadScreenPruner: React.ComponentType<{}> = React.memo<{}>(
  function ThreadScreenPruner() {
    const rawThreadInfos = useSelector(
      (state: AppState) => state.threadStore.threadInfos,
    );

    const navContext = React.useContext(NavContext);

    const chatRouteState = React.useMemo(() => {
      if (!navContext) {
        return null;
      }
      const { state } = navContext;
      const appRoute = state.routes.find(route => route.name === AppRouteName);
      invariant(
        appRoute,
        'Navigation context should contain route for AppNavigator ' +
          'when ThreadScreenPruner is rendered',
      );
      const communityDrawerRoute = getChildRouteFromNavigatorRoute(
        appRoute,
        CommunityDrawerNavigatorRouteName,
      );
      if (!communityDrawerRoute) {
        return null;
      }
      const tabRoute = getChildRouteFromNavigatorRoute(
        communityDrawerRoute,
        TabNavigatorRouteName,
      );
      if (!tabRoute) {
        return null;
      }
      const chatRoute = getChildRouteFromNavigatorRoute(
        tabRoute,
        ChatRouteName,
      );
      if (!chatRoute?.state) {
        return null;
      }
      return chatRoute.state;
    }, [navContext]);

    const inStackThreadIDs = React.useMemo(() => {
      const threadIDs = new Set();
      if (!chatRouteState) {
        return threadIDs;
      }
      for (const route of chatRouteState.routes) {
        const threadID = getThreadIDFromRoute(route);
        if (threadID && !threadIsPending(threadID)) {
          threadIDs.add(threadID);
        }
      }
      return threadIDs;
    }, [chatRouteState]);

    const pruneThreadIDs = React.useMemo(() => {
      const threadIDs = [];
      for (const threadID of inStackThreadIDs) {
        if (!rawThreadInfos[threadID]) {
          threadIDs.push(threadID);
        }
      }
      return threadIDs;
    }, [inStackThreadIDs, rawThreadInfos]);

    const activeThreadID = useActiveThread();

    React.useEffect(() => {
      if (pruneThreadIDs.length === 0 || !navContext) {
        return;
      }
      if (activeThreadID && pruneThreadIDs.includes(activeThreadID)) {
        Alert.alert(
          'Chat invalidated',
          'You no longer have permission to view this chat :(',
          [{ text: 'OK' }],
          { cancelable: true },
        );
      }
      navContext.dispatch({
        type: clearThreadsActionType,
        payload: { threadIDs: pruneThreadIDs },
      });
    }, [pruneThreadIDs, navContext, activeThreadID]);

    return null;
  },
);

export default ThreadScreenPruner;
