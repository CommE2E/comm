// @flow

import * as React from 'react';
import type { SharedValue } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

export type VisibleOverlay = {
  +routeKey: string,
  +routeName: string,
  // position is deprecated - use positionV2 and Reanimated V2 API
  +position: ?Animated.Value,
  +positionV2: ?SharedValue<number>,
  +shouldRenderScreenContent: boolean,
  +onExitFinish?: () => void,
  +presentedFrom: ?string,
};

export type ScrollBlockingModalStatus = 'open' | 'closed' | 'closing';

export type OverlayContextType = {
  // position and isDismissing are local to the current route
  // position is deprecated - use positionV2 and Reanimated V2 API
  +position: ?Animated.Node,
  +positionV2: ?SharedValue<number>,
  +shouldRenderScreenContent: boolean,
  +onExitFinish?: () => void,
  +isDismissing: boolean,
  // The rest are global to the entire OverlayNavigator
  +visibleOverlays: $ReadOnlyArray<VisibleOverlay>,
  +scrollBlockingModalStatus: ScrollBlockingModalStatus,
  +setScrollBlockingModalStatus: ScrollBlockingModalStatus => void,
  +resetScrollBlockingModalStatus: () => void,
};
const OverlayContext: React.Context<?OverlayContextType> =
  React.createContext(null);

export { OverlayContext };
