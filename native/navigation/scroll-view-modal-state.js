// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

export type ScrollViewModalState = {|
  scrollDisabled: boolean,
  setScrollDisabled: (scrollDisabled: boolean) => void,
|};

const scrollViewModalStatePropType = PropTypes.shape({
  scrollDisabled: PropTypes.bool.isRequired,
  setScrollDisabled: PropTypes.func.isRequired,
});

const ScrollViewModalContext = React.createContext<?ScrollViewModalState>(null);

function withScrollViewModalState<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(
  Component: ComponentType,
): React.ComponentType<
  $Diff<
    React.ElementConfig<ComponentType>,
    { scrollViewModalState: ?ScrollViewModalState },
  >,
> {
  class ScrollViewModalStateHOC extends React.PureComponent<
    $Diff<
      React.ElementConfig<ComponentType>,
      { scrollViewModalState: ?ScrollViewModalState },
    >,
  > {
    render() {
      return (
        <ScrollViewModalContext.Consumer>
          {value => <Component {...this.props} scrollViewModalState={value} />}
        </ScrollViewModalContext.Consumer>
      );
    }
  }
  return ScrollViewModalStateHOC;
}

export {
  scrollViewModalStatePropType,
  ScrollViewModalContext,
  withScrollViewModalState,
};
