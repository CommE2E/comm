// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';
import PropTypes from 'prop-types';

type ScrollBlockingModalStatus = 'open' | 'closed' | 'closing';
export type OverlayContextType = {|
  // position and isDismissing are local to the current route
  +position: Animated.Value,
  +isDismissing: boolean,
  // The rest are global to the entire OverlayNavigator
  +visibleOverlays: $ReadOnlyArray<{|
    +routeKey: string,
    +routeName: string,
    +position: Animated.Value,
    +presentedFrom: ?string,
  |}>,
  +scrollBlockingModalStatus: ScrollBlockingModalStatus,
  +setScrollBlockingModalStatus: ScrollBlockingModalStatus => void,
|};
const OverlayContext: React.Context<?OverlayContextType> = React.createContext(
  null,
);

// eslint-disable-next-line import/no-named-as-default-member
const animatedValuePropType = PropTypes.instanceOf(Animated.Value);
const overlayContextPropType = PropTypes.shape({
  position: animatedValuePropType.isRequired,
  isDismissing: PropTypes.bool.isRequired,
  visibleOverlays: PropTypes.arrayOf(
    PropTypes.exact({
      routeKey: PropTypes.string.isRequired,
      routeName: PropTypes.string.isRequired,
      position: animatedValuePropType.isRequired,
      presentedFrom: PropTypes.string,
    }),
  ).isRequired,
  scrollBlockingModalStatus: PropTypes.oneOf(['open', 'closed', 'closing'])
    .isRequired,
  setScrollBlockingModalStatus: PropTypes.func.isRequired,
});

export { OverlayContext, overlayContextPropType };
