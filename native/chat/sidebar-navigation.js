// @flow

import invariant from 'invariant';

import type {
  DispatchFunctions,
  ActionFunc,
  BoundServerCall,
} from 'lib/utils/action-utils';

import type { InputState } from '../input/input-state';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { MessageListRouteName } from '../navigation/route-names';
import type { TooltipRoute } from '../navigation/tooltip.react';

function onPressGoToSidebar(
  route:
    | TooltipRoute<'RobotextMessageTooltipModal'>
    | TooltipRoute<'TextMessageTooltipModal'>
    | TooltipRoute<'MultimediaTooltipModal'>,
  dispatchFunctions: DispatchFunctions,
  bindServerCall: (serverCall: ActionFunc) => BoundServerCall,
  inputState: ?InputState,
  navigation:
    | AppNavigationProp<'RobotextMessageTooltipModal'>
    | AppNavigationProp<'TextMessageTooltipModal'>
    | AppNavigationProp<'MultimediaTooltipModal'>,
) {
  let threadCreatedFromMessage;
  // Necessary for Flow...
  if (route.name === 'RobotextMessageTooltipModal') {
    threadCreatedFromMessage = route.params.item.threadCreatedFromMessage;
  } else {
    threadCreatedFromMessage = route.params.item.threadCreatedFromMessage;
  }

  invariant(
    threadCreatedFromMessage,
    'threadCreatedFromMessage should be set in onPressGoToSidebar',
  );

  navigation.navigate({
    name: MessageListRouteName,
    params: {
      threadInfo: threadCreatedFromMessage,
    },
    key: `${MessageListRouteName}${threadCreatedFromMessage.id}`,
  });
}

export { onPressGoToSidebar };
