// @flow

import type {
  StackNavigationProp,
  ParamListBase,
  StackAction,
  Route,
  StackOptions,
} from '@react-navigation/stack';

import { StackRouter } from '@react-navigation/native';

import { removeScreensFromStack } from '../utils/navigation-utils';
import { clearOverlayModalsActionType } from './action-types';

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
  ParamList: ParamListBase,
  RouteName: string,
> = $ReadOnly<{|
  ...StackNavigationProp<ParamList, RouteName, {||}, {||}>,
  +clearOverlayModals: (keys: $ReadOnlyArray<string>) => void,
|}>;

function OverlayRouter(options: StackOptions) {
  const stackRouter = StackRouter(options);
  return {
    ...stackRouter,
    getStateForAction: (
      lastState,
      action,
      options,
    ) => {
      if (action.type === clearOverlayModalsActionType) {
        const { keys } = action.payload;
        if (!lastState) {
          return lastState;
        }
        return removeScreensFromStack(
          lastState,
          (route: Route<>) =>
            keys.includes(route.key) ? 'remove' : 'keep',
        );
      } else {
        return stackRouter.getStateForAction(lastState, action, options);
      }
    },
    actionCreators: {
      ...stackRouter.actionCreators,
      clearOverlayModals: (keys: $ReadOnlyArray<string>) => ({
        type: clearOverlayModalsActionType,
        payload: { keys },
      }),
    },
  };
}

export default OverlayRouter;
