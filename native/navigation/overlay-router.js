// @flow

import type {
  StackNavigationProp,
  ParamListBase,
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

type ClearOverlayModalsAction = {|
  +type: 'CLEAR_OVERLAY_MODALS',
  +payload: {|
    +keys: $ReadOnlyArray<string>,
  |},
|};
export type OverlayRouterNavigationAction =
  | StackAction
  | ClearOverlayModalsAction;

export type OverlayRouterNavigationProp<
  ParamList: ParamListBase = ParamListBase,
  RouteName: string = string,
> = {|
  ...StackNavigationProp<ParamList, RouteName, {||}, {||}>,
  +clearOverlayModals: (keys: $ReadOnlyArray<string>) => void,
  +goBackOnce: () => void,
|};

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
