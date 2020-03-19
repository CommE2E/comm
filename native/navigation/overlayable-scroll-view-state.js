// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

export type OverlayableScrollViewState = {|
  scrollDisabled: boolean,
  setScrollDisabled: (scrollDisabled: boolean) => void,
|};

const overlayableScrollViewStatePropType = PropTypes.shape({
  scrollDisabled: PropTypes.bool.isRequired,
  setScrollDisabled: PropTypes.func.isRequired,
});

const OverlayableScrollViewContext = React.createContext<?OverlayableScrollViewState>(
  null,
);

function withOverlayableScrollViewState<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(
  Component: ComponentType,
): React.ComponentType<
  $Diff<
    React.ElementConfig<ComponentType>,
    { overlayableScrollViewState: ?OverlayableScrollViewState },
  >,
> {
  class OverlayableScrollViewStateHOC extends React.PureComponent<
    $Diff<
      React.ElementConfig<ComponentType>,
      { overlayableScrollViewState: ?OverlayableScrollViewState },
    >,
  > {
    render() {
      return (
        <OverlayableScrollViewContext.Consumer>
          {value => (
            <Component {...this.props} overlayableScrollViewState={value} />
          )}
        </OverlayableScrollViewContext.Consumer>
      );
    }
  }
  return OverlayableScrollViewStateHOC;
}

export {
  overlayableScrollViewStatePropType,
  OverlayableScrollViewContext,
  withOverlayableScrollViewState,
};
