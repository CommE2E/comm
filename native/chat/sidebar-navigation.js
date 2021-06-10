// @flow

import type { DispatchFunctions, ActionFunc } from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { MessageListRouteName } from '../navigation/route-names';
import type { TooltipRoute } from '../navigation/tooltip.react';
import { getSidebarThreadInfo } from './utils';

function navigateToSidebar(
  route:
    | TooltipRoute<'RobotextMessageTooltipModal'>
    | TooltipRoute<'TextMessageTooltipModal'>
    | TooltipRoute<'MultimediaTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: <F>(serverCall: ActionFunc<F>) => F,
  inputState: ?InputState,
  navigation:
    | AppNavigationProp<'RobotextMessageTooltipModal'>
    | AppNavigationProp<'TextMessageTooltipModal'>
    | AppNavigationProp<'MultimediaTooltipModal'>,
  viewerID: ?string,
) {
  const threadInfo = getSidebarThreadInfo(route.params.item, viewerID);
  // Necessary for Flow...
  // eslint-disable-next-line no-empty
  if (route.name === 'RobotextMessageTooltipModal') {
  }

  navigation.navigate({
    name: MessageListRouteName,
    params: {
      threadInfo,
    },
    key: `${MessageListRouteName}${threadInfo.id}`,
  });
}

export { navigateToSidebar };
