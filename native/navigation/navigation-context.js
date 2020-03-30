// @flow

import type { NavigationState, NavigationDispatch } from 'react-navigation';

import * as React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';

export type NavContextType = {|
  state: NavigationState,
  dispatch: NavigationDispatch,
|};

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
  const MemoizedNavContextHOC = React.memo(NavContextHOC);
  hoistNonReactStatics(MemoizedNavContextHOC, Component);
  // $FlowFixMe React.memo typing fixed in later version of Flow
  return MemoizedNavContextHOC;
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
    hoistNonReactStatics(MemoizedNavConnectedComponent, Component);
    // $FlowFixMe React.memo typing fixed in later version of Flow
    return withNavContext(MemoizedNavConnectedComponent);
  };
}

export { NavContext, withNavContext, connectNav };
