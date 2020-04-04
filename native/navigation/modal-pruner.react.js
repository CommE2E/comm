// @flow

import type { NavContextType } from './navigation-context';
import type { NavigationState, NavigationRoute } from 'react-navigation';

import * as React from 'react';
import invariant from 'invariant';

import { AppRouteName } from './route-names';
import {
  clearRootModalsActionType,
  clearOverlayModalsActionType,
} from './action-types';

type DependencyInfo = {|
  status: 'missing' | 'resolved' | 'unresolved',
  presenter: ?string,
  presenting: string[],
  parentRouteName: ?string,
|};
function collectDependencyInfo(
  route: NavigationState | NavigationRoute,
  dependencyMap?: Map<string, DependencyInfo> = new Map(),
  parentRouteName?: ?string,
): Map<string, DependencyInfo> {
  if (route.key && typeof route.key === 'string') {
    const key = route.key;
    const presenter =
      route.params && route.params.presentedFrom
        ? route.params.presentedFrom
        : null;
    invariant(
      presenter === null || typeof presenter === 'string',
      'presentedFrom should be a string',
    );
    let status = 'resolved';
    if (presenter) {
      const presenterInfo = dependencyMap.get(presenter);
      if (!presenterInfo) {
        status = 'unresolved';
        dependencyMap.set(presenter, {
          status: 'missing',
          presenter: undefined,
          presenting: [key],
          parentRouteName: undefined,
        });
      } else if (presenterInfo) {
        status = presenterInfo.status;
        presenterInfo.presenting.push(key);
      }
    }
    const existingInfo = dependencyMap.get(key);
    const presenting = existingInfo ? existingInfo.presenting : [];
    dependencyMap.set(key, {
      status,
      presenter,
      presenting,
      parentRouteName,
    });
    if (status === 'resolved') {
      const toResolve = [...presenting];
      while (toResolve.length > 0) {
        const presentee = toResolve.pop();
        const dependencyInfo = dependencyMap.get(presentee);
        invariant(dependencyInfo, 'could not find presentee');
        dependencyInfo.status = 'resolved';
        toResolve.push(...dependencyInfo.presenting);
      }
    }
  }
  const routeName =
    route.routeName && typeof route.routeName === 'string'
      ? route.routeName
      : undefined;
  if (route.routes) {
    route.routes.forEach(child =>
      collectDependencyInfo(child, dependencyMap, routeName),
    );
  }
  return dependencyMap;
}

type Props = {|
  navContext: NavContextType,
|};
function ModalPruner(props: Props) {
  const { state, dispatch } = props.navContext;

  const [pruneRootModals, pruneOverlayModals] = React.useMemo(() => {
    const dependencyMap = collectDependencyInfo(state);
    const rootModals = [],
      overlayModals = [];
    for (let [key, info] of dependencyMap) {
      if (info.status !== 'unresolved') {
        continue;
      }
      if (!info.parentRouteName) {
        rootModals.push(key);
      } else if (info.parentRouteName === AppRouteName) {
        overlayModals.push(key);
      }
    }
    return [rootModals, overlayModals];
  }, [state]);

  React.useEffect(() => {
    if (pruneRootModals.length > 0) {
      dispatch({
        type: (clearRootModalsActionType: 'CLEAR_ROOT_MODALS'),
        keys: pruneRootModals,
        preserveFocus: true,
      });
    }
    if (pruneOverlayModals.length > 0) {
      dispatch({
        type: (clearOverlayModalsActionType: 'CLEAR_OVERLAY_MODALS'),
        keys: pruneOverlayModals,
        preserveFocus: true,
      });
    }
  }, [dispatch, pruneRootModals, pruneOverlayModals]);

  return null;
}

export default ModalPruner;
