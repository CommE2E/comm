// @flow

import * as React from 'react';
import Animated from 'react-native-reanimated';

type ScrollBlockingModalStatus = 'open' | 'closed' | 'closing';
export type OverlayContextType = {
  // position and isDismissing are local to the current route
  +position: Animated.Node,
  +isDismissing: boolean,
  // The rest are global to the entire OverlayNavigator
  +visibleOverlays: $ReadOnlyArray<{
    +routeKey: string,
    +routeName: string,
    +position: Animated.Value,
    +presentedFrom: ?string,
  }>,
  +scrollBlockingModalStatus: ScrollBlockingModalStatus,
  +setScrollBlockingModalStatus: ScrollBlockingModalStatus => void,
};
const OverlayContext: React.Context<?OverlayContextType> =
  React.createContext(null);

export { OverlayContext };
