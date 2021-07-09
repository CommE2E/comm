// @flow

import type { DispatchFunctions, ActionFunc } from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { createNavigateToThreadAction } from './message-list-types';
import { getSidebarThreadInfo } from './utils';
import type { MessageTooltipRouteNames } from '../navigation/route-names';

function navigateToSidebar<RouteName: MessageTooltipRouteNames>(
  route: TooltipRoute<RouteName>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: <F>(serverCall: ActionFunc<F>) => F,
  inputState: ?InputState,
  navigation: AppNavigationProp<RouteName>,
  viewerID: ?string,
) {
  const threadInfo = getSidebarThreadInfo(route.params.item, viewerID);
  navigation.navigate(createNavigateToThreadAction({ threadInfo }));
}

export { navigateToSidebar };
