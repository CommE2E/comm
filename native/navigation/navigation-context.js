// @flow

import type {
  CommonAction,
  PossiblyStaleNavigationState,
} from '@react-navigation/native';
import type { RootRouterNavigationAction } from './root-router';
import type { ChatRouterNavigationAction } from '../chat/chat-router';
import type { OverlayRouterNavigationAction } from './overlay-router';

import * as React from 'react';
import PropTypes from 'prop-types';

export type NavAction =
  | CommonAction
  | RootRouterNavigationAction
  | ChatRouterNavigationAction
  | OverlayRouterNavigationAction;
export type NavContextType = {|
  state: PossiblyStaleNavigationState,
  dispatch: (action: NavAction) => void,
|};

const navContextPropType = PropTypes.shape({
  state: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired,
});

const NavContext = React.createContext<?NavContextType>(null);

function withNavContext<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(
  Component: ComponentType,
): React.ComponentType<
  $Diff<React.ElementConfig<ComponentType>, { navContext: ?NavContextType }>,
> &
  ComponentType {
  function NavContextHOC(
    props: $Diff<
      React.ElementConfig<ComponentType>,
      { navContext: ?NavContextType },
    >,
  ) {
    return (
      <NavContext.Consumer>
        {value => <Component {...props} navContext={value} />}
      </NavContext.Consumer>
    );
  }
  // $FlowFixMe React.memo typing fixed in later version of Flow
  return React.memo(NavContextHOC);
}

function connectNav<
  AllProps: {},
  ConnectedProps: AllProps,
  ComponentType: React.ComponentType<$Exact<AllProps>>,
>(
  connectFunc: (
    navContext: ?NavContextType,
    ownProps: $Diff<$Exact<AllProps>, $Exact<ConnectedProps>>,
  ) => $Exact<ConnectedProps>,
): (
  Component: ComponentType,
) => React.ComponentType<$Diff<$Exact<AllProps>, $Exact<ConnectedProps>>> &
  ComponentType {
  return (Component: ComponentType) => {
    function NavConnectedComponent(props: {|
      ...$Diff<React.ElementConfig<ComponentType>, $Exact<ConnectedProps>>,
      navContext: ?NavContextType,
    |}) {
      const { navContext, ...rest } = props;
      const connectedProps = connectFunc(navContext, rest);
      return <Component {...rest} {...connectedProps} />;
    }
    NavConnectedComponent.displayName = Component.displayName
      ? `NavConnected(${Component.displayName})`
      : `NavConnectedComponent`;
    const MemoizedNavConnectedComponent = React.memo(NavConnectedComponent);
    // $FlowFixMe React.memo typing fixed in later version of Flow
    return withNavContext(MemoizedNavConnectedComponent);
  };
}

export { NavContext, withNavContext, connectNav, navContextPropType };
