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

  const { params } = route;
  const { item } = params;
  const { threadInfo } = item;

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

    // If there is not a valid routeKey or the most recent routeName is
    // not included in PinnableMessageTooltipRouteNames, we want to
    // just navigate to the toggle pin modal as normal.
    if (!routeKey || !PinnableMessageTooltipRouteNames.includes(routeName)) {
      navigation.navigate(TogglePinModalRouteName, {
        threadInfo,
        item,
      });
      return;
    }

    // Otherwise, we want to replace the tooltip overlay with the pin modal.
    navigation.dispatch({
      ...StackActions.replace(TogglePinModalRouteName, {
        threadInfo,
        item,
      }),
      source: routeKey,
    });
  }, [navigation, overlayContext, threadInfo, item]);
}

export { useNavigateToPinModal };
