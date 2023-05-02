// @flow

import { StackActions, useNavigation } from '@react-navigation/native';
import * as React from 'react';

import type { OverlayContextType } from '../navigation/overlay-context.js';
import {
  type NavigationRoute,
  PinnableMessageTooltipRouteNames,
  TogglePinModalRouteName,
} from '../navigation/route-names.js';

function useNavigateToPinModal(
  overlayContext: ?OverlayContextType,
  route:
    | NavigationRoute<'TextMessageTooltipModal'>
    | NavigationRoute<'MultimediaMessageTooltipModal'>,
): () => mixed {
  const navigation = useNavigation();

  return React.useCallback(() => {
    // Since the most recent overlay is the tooltip modal, prior to opening the
    // toggle pin modal, we want to dismiss it so the overlay is not visible
    // once the toggle pin modal is closed. This is also necessary with the
    // TextMessageTooltipModal, since otherwise the toggle pin modal fails to
    // render the message since we 'hide' the original message and
    // show another message on top when the tooltip is active, and this
    // state carries through into the modal.
    const mostRecentOverlay = overlayContext?.visibleOverlays?.slice(-1)[0];
    const routeName = mostRecentOverlay?.routeName;
    const routeKey = mostRecentOverlay?.routeKey;

    // Check if the most recent routeName is included in
    // PinnableMessageTooltipRouteNames. If it is, we want to replace the
    // tooltip overlay with the toggle pin modal. Further, if routeKey is
    // undefined, we want to avoid the replace action and just navigate.
    if (routeKey && PinnableMessageTooltipRouteNames.includes(routeName)) {
      navigation.dispatch({
        ...StackActions.replace(TogglePinModalRouteName, {
          threadInfo: route.params.item.threadInfo,
          item: route.params.item,
        }),
        source: routeKey,
      });
      return;
    }

    // Otherwise, we can just navigate to the toggle pin modal.
    navigation.navigate(TogglePinModalRouteName, {
      threadInfo: route.params.item.threadInfo,
      item: route.params.item,
    });
  }, [navigation, overlayContext, route]);
}

export { useNavigateToPinModal };
