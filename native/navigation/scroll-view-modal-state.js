// @flow

import * as React from 'react';
import PropTypes from 'prop-types';

export type ScrollViewModalStatus = 'open' | 'closed' | 'closing';

export type ScrollViewModalState = {|
  modalState: ScrollViewModalStatus,
  setModalState: (modalState: ScrollViewModalStatus) => void,
|};

const scrollViewModalStatePropType = PropTypes.shape({
  modalState: PropTypes.oneOf(['open', 'closed', 'closing']).isRequired,
  setModalState: PropTypes.func.isRequired,
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
