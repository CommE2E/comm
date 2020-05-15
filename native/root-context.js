// @flow

import * as React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import PropTypes from 'prop-types';

export type RootContextType = {|
  detectUnsupervisedBackground?: ?(alreadyClosed: boolean) => boolean,
  setNavStateInitialized: () => void,
|};

const RootContext = React.createContext<?RootContextType>(null);

function withRootContext<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(
  Component: ComponentType,
): React.ComponentType<
  $Diff<React.ElementConfig<ComponentType>, { rootContext: ?RootContextType }>,
> &
  ComponentType {
  function RootContextHOC(
    props: $Diff<
      React.ElementConfig<ComponentType>,
      { rootContext: ?RootContextType },
    >,
  ) {
    return (
      <RootContext.Consumer>
        {value => <Component {...props} rootContext={value} />}
      </RootContext.Consumer>
    );
  }
  const MemoizedRootContextHOC = React.memo(RootContextHOC);
  hoistNonReactStatics(MemoizedRootContextHOC, Component);
  // $FlowFixMe React.memo typing fixed in later version of Flow
  return MemoizedRootContextHOC;
}

const rootContextPropType = PropTypes.shape({
  detectUnsupervisedBackground: PropTypes.func,
  setNavStateInitialized: PropTypes.func.isRequired,
});

export { RootContext, withRootContext, rootContextPropType };
