// @flow

import {
  StackRouter,
  type NavigationAction,
  type NavigationState,
  type NavigationRouteConfigMap,
  type NavigationStackRouterConfig,
} from 'react-navigation';

type LogInAction = {|
  +type: 'LOG_IN',
|};
type LogOutAction = {|
  +type: 'LOG_OUT',
|};
export type RootRouterNavigationAction =
  | NavigationAction
  | LogInAction
  | LogOutAction;

const defaultConfig = Object.freeze({});
function RootRouter(
  routeConfigMap: NavigationRouteConfigMap,
  stackConfig?: NavigationStackRouterConfig = defaultConfig,
) {
  const stackRouter = StackRouter(routeConfigMap, stackConfig);
  return {
    ...stackRouter,
    getStateForAction: (
      action: RootRouterNavigationAction,
      lastState: ?NavigationState,
    ) => {
      if (action.type === 'LOG_IN') {
        return lastState;
      } else if (action.type === 'LOG_OUT') {
        return lastState;
      } else {
        return stackRouter.getStateForAction(action, lastState);
      }
    },
  };
}

export default RootRouter;
