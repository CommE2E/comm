// @flow

import * as React from 'react';

import type { AppNavigationProp } from '../navigation/app-navigator.react';
import type { TooltipModalParamList } from '../navigation/route-names';

type TooltipActions = {
  // Hiding will keep the Tooltip ReactNav screen open, which means that the
  // background will still be dimmed. But it will hide the actual tooltip menu.
  +hideTooltip: () => void,
  // Dismiss the tooltip will dismiss the ReactNav screen. This will start the
  // OverlayNavigator animation to dismiss the screen.
  +dismissTooltip: () => void,
};
function useTooltipActions<RouteName: $Keys<TooltipModalParamList>>(
  navigation: AppNavigationProp<RouteName>,
  tooltipRouteKey: string,
): TooltipActions {
  const { clearOverlayModals, setRouteParams } = navigation;

  const hideTooltip = React.useCallback(() => {
    setRouteParams(tooltipRouteKey, { hideTooltip: true });
  }, [setRouteParams, tooltipRouteKey]);

  const dismissTooltip = React.useCallback(() => {
    clearOverlayModals([tooltipRouteKey]);
  }, [clearOverlayModals, tooltipRouteKey]);

  return React.useMemo(
    () => ({
      hideTooltip,
      dismissTooltip,
    }),
    [hideTooltip, dismissTooltip],
  );
}

export { useTooltipActions };
