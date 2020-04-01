// @flow

import type { AppState } from '../redux/redux-setup';

import * as React from 'react';
import { useSelector } from 'react-redux';
import { Alert } from 'react-native';

import { NavContext } from '../navigation/navigation-context';
import {
  assertNavigationRouteNotLeafNode,
  getThreadIDFromRoute,
} from '../utils/navigation-utils';
import { useActiveThread } from '../navigation/nav-selectors';

function ThreadScreenPruner() {
  const rawThreadInfos = useSelector(
    (state: AppState) => state.threadStore.threadInfos,
  );

  const navContext = React.useContext(NavContext);

  const chatRoute = React.useMemo(() => {
    if (!navContext) {
      return null;
    }
    const { state } = navContext;
    const appRoute = assertNavigationRouteNotLeafNode(state.routes[0]);
    const tabRoute = assertNavigationRouteNotLeafNode(appRoute.routes[0]);
    return assertNavigationRouteNotLeafNode(tabRoute.routes[1]);
  }, [navContext]);

  const inStackThreadIDs = React.useMemo(() => {
    const threadIDs = new Set();
    if (!chatRoute) {
      return threadIDs;
    }
    for (let route of chatRoute.routes) {
      const threadID = getThreadIDFromRoute(route);
      if (threadID) {
        threadIDs.add(threadID);
      }
    }
    return threadIDs;
  }, [chatRoute]);

  const pruneThreadIDs = React.useMemo(() => {
    const threadIDs = [];
    for (let threadID of inStackThreadIDs) {
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
        'Thread invalidated',
        'You no longer have permission to view this thread :(',
        [{ text: 'OK' }],
      );
    }
    navContext.dispatch({
      type: 'CLEAR_INVALIDATED_THREADS',
      threadIDs: pruneThreadIDs,
    });
  }, [pruneThreadIDs, navContext, activeThreadID]);

  return null;
}

export default ThreadScreenPruner;
