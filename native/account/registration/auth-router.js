// @flow

import type {
  StackAction,
  Route,
  Router,
  StackRouterOptions,
  StackNavigationState,
  RouterConfigOptions,
} from '@react-navigation/core';
import { StackRouter } from '@react-navigation/native';

import type { ConnectEthereumParams } from './connect-ethereum.react.js';
import { reconnectEthereumActionType } from '../../navigation/action-types.js';
import { removeScreensFromStack } from '../../navigation/navigation-utils.js';
import {
  ConnectEthereumRouteName,
  ConnectFarcasterRouteName,
} from '../../navigation/route-names.js';

type ReconnectEthereumAction = {
  +type: 'RECONNECT_ETHEREUM',
  +payload: {
    +params: ConnectEthereumParams,
  },
};
export type AuthRouterNavigationAction = StackAction | ReconnectEthereumAction;

export type AuthRouterExtraNavigationHelpers = {
  +reconnectEthereum: ConnectEthereumParams => void,
};

function AuthRouter(
  routerOptions: StackRouterOptions,
): Router<StackNavigationState, AuthRouterNavigationAction> {
  const {
    getStateForAction: baseGetStateForAction,
    actionCreators: baseActionCreators,
    ...rest
  } = StackRouter(routerOptions);
  return {
    ...rest,
    getStateForAction: (
      lastState: StackNavigationState,
      action: AuthRouterNavigationAction,
      options: RouterConfigOptions,
    ) => {
      if (action.type === reconnectEthereumActionType) {
        // First, we look to see if ConnectEthereum is already in the stack.
        // If it is, we'll pop all later screens and navigate to it.
        const routeNames = lastState.routes.map(({ name }) => name);
        if (routeNames.includes(ConnectEthereumRouteName)) {
          const newState = removeScreensFromStack(
            lastState,
            (route: Route<>) =>
              route.name === ConnectEthereumRouteName ? 'break' : 'remove',
          );
          const connectEthereumRoute = newState.routes[newState.index];
          const restRoutes = newState.routes.slice(0, -1);
          return {
            ...newState,
            routes: [
              ...restRoutes,
              {
                ...connectEthereumRoute,
                params: action.payload.params,
              },
            ],
          };
        }
        // If it's not in the stack, we'll pop up to ConnectFarcaster
        // and then push a new route
        const newState = removeScreensFromStack(lastState, (route: Route<>) =>
          route.name === ConnectFarcasterRouteName ? 'break' : 'remove',
        );
        return {
          ...newState,
          routes: [
            ...newState.routes,
            {
              name: ConnectEthereumRouteName,
              key: 'ReconnectEthereum',
              params: action.payload.params,
            },
          ],
          index: newState.index + 1,
        };
      } else {
        return baseGetStateForAction(lastState, action, options);
      }
    },
    actionCreators: {
      ...baseActionCreators,
      reconnectEthereum: (params: ConnectEthereumParams) => ({
        type: reconnectEthereumActionType,
        payload: { params },
      }),
    },
  };
}

export default AuthRouter;
