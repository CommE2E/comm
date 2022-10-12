// @flow

import type {
  StackAction,
  Route,
  Router,
  StackRouterOptions,
  StackNavigationState,
  RouterConfigOptions,
} from '@react-navigation/native';
import { StackRouter, CommonActions } from '@react-navigation/native';

import { clearOverlayModalsActionType } from './action-types';
import { removeScreensFromStack } from './navigation-utils';

type ClearOverlayModalsAction = {
  +type: 'CLEAR_OVERLAY_MODALS',
  +payload: {
    +keys: $ReadOnlyArray<string>,
  },
};
export type OverlayRouterNavigationAction =
  | StackAction
  | ClearOverlayModalsAction;

export type OverlayRouterExtraNavigationHelpers = {
  +clearOverlayModals: (keys: $ReadOnlyArray<string>) => void,
  +goBackOnce: () => void,
};

function OverlayRouter(
  routerOptions: StackRouterOptions,
): Router<StackNavigationState, OverlayRouterNavigationAction> {
  const {
    getStateForAction: baseGetStateForAction,
    actionCreators: baseActionCreators,
    ...rest
  } = StackRouter(routerOptions);
  return {
    ...rest,
    getStateForAction: (
      lastState: StackNavigationState,
      action: OverlayRouterNavigationAction,
      options: RouterConfigOptions,
    ) => {
      if (action.type === clearOverlayModalsActionType) {
        const { keys } = action.payload;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(lastState, (route: Route<>) =>
          keys.includes(route.key) ? 'remove' : 'keep',
        );
      } else {
        return baseGetStateForAction(lastState, action, options);
      }
    },
    actionCreators: {
      ...baseActionCreators,
      clearOverlayModals: (keys: $ReadOnlyArray<string>) => ({
        type: clearOverlayModalsActionType,
        payload: { keys },
      }),
      goBackOnce: () => state => ({
        ...CommonActions.goBack(),
        target: state.key,
      }),
    },
  };
}

export default OverlayRouter;
