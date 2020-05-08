// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';
import PropTypes from 'prop-types';

export type ScrollBlockingModalStatus = 'open' | 'closed' | 'closing';
export type OverlayContextType = {|
  position: Animated.Value,
  isDismissing: boolean,
  routeIndex: number,
  scrollBlockingModalStatus: ScrollBlockingModalStatus,
|};
const OverlayContext: React.Context<?OverlayContextType> = React.createContext(
  null,
);

const overlayContextPropType = PropTypes.shape({
  // eslint-disable-next-line import/no-named-as-default-member
  position: PropTypes.instanceOf(Animated.Value).isRequired,
  isDismissing: PropTypes.bool.isRequired,
  routeIndex: PropTypes.number.isRequired,
  scrollBlockingModalStatus: PropTypes.oneOf(['open', 'closed', 'closing'])
    .isRequired,
});

function withOverlayContext<
  AllProps: {},
  ComponentType: React.ComponentType<AllProps>,
>(
  Component: ComponentType,
): React.ComponentType<
  $Diff<
    React.ElementConfig<ComponentType>,
    { overlayContext: ?OverlayContextType },
  >,
> {
  class OverlayContextHOC extends React.PureComponent<
    $Diff<
      React.ElementConfig<ComponentType>,
      { overlayContext: ?OverlayContextType },
    >,
  > {
    render() {
      return (
        <OverlayContext.Consumer>
          {value => <Component {...this.props} overlayContext={value} />}
        </OverlayContext.Consumer>
      );
    }
  }
  return OverlayContextHOC;
}

export { OverlayContext, overlayContextPropType, withOverlayContext };
