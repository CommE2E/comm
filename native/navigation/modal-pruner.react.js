// @flow

import type {
  PossiblyStaleNavigationState,
  PossiblyStaleRoute,
} from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';

import {
  clearRootModalsActionType,
  clearOverlayModalsActionType,
} from './action-types.js';
import type { NavContextType } from './navigation-context.js';
import { AppRouteName } from './route-names.js';

type DependencyInfo = {
  status: 'missing' | 'resolved' | 'unresolved',
  presenter: ?string,
  presenting: string[],
  parentRouteName: ?string,
};
function collectDependencyInfo(
  route: PossiblyStaleNavigationState | PossiblyStaleRoute<>,
  dependencyMap?: Map<string, DependencyInfo> = new Map(),
  parentRouteName?: ?string,
): Map<string, DependencyInfo> {
  let state, routeName;
  if (route.name === undefined) {
    state = route;
  } else if (route.state) {
    ({ state, name: routeName } = route);
  }
  if (state) {
    for (const child of state.routes) {
      collectDependencyInfo(child, dependencyMap, routeName);
    }
    return dependencyMap;
  }

  if (!route.key) {
    return dependencyMap;
  }
  const { key } = route;

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

  return dependencyMap;
}

type Props = {
  +navContext: NavContextType,
};
function ModalPruner(props: Props): null {
  const { state, dispatch } = props.navContext;

  const [pruneRootModals, pruneOverlayModals] = React.useMemo(() => {
    const dependencyMap = collectDependencyInfo(state);
    const rootModals = [],
      overlayModals = [];
    for (const [key, info] of dependencyMap) {
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
        payload: { keys: pruneRootModals },
      });
    }
    if (pruneOverlayModals.length > 0) {
      dispatch({
        type: (clearOverlayModalsActionType: 'CLEAR_OVERLAY_MODALS'),
        payload: { keys: pruneOverlayModals },
      });
    }
  }, [dispatch, pruneRootModals, pruneOverlayModals]);

  return null;
}

export default ModalPruner;
