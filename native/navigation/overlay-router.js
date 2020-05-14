// @flow

import { StackRouter } from '@react-navigation/native';

import { removeScreensFromStack } from '../utils/navigation-utils';
import { clearOverlayModalsActionType } from './action-types';

function OverlayRouter(options) {
  const stackRouter = StackRouter(options);
  return {
    ...stackRouter,
    getStateForAction: (
      lastState,
      action,
      options,
    ) => {
      if (action.type === clearOverlayModalsActionType) {
        const { keys } = action;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(
          lastState,
          (route: NavigationRoute) =>
            keys.includes(route.key) ? 'remove' : 'keep',
        );
      } else {
        return stackRouter.getStateForAction(lastState, action, options);
      }
    },
    actionCreators: {
      ...stackRouter.actionCreators,
      clearOverlayModals: (
        keys: $ReadOnlyArray<string>,
        preserveFocus: boolean,
      ) => ({
        type: clearOverlayModalsActionType,
        keys,
        preserveFocus,
      }),
    },
  };
}

export default OverlayRouter;
