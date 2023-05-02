// @flow

import { StackActions, useNavigation } from '@react-navigation/native';
import * as React from 'react';

import type { OverlayContextType } from '../navigation/overlay-context.js';
import { TogglePinModalRouteName } from '../navigation/route-names.js';
import type { NavigationRoute } from '../navigation/route-names.js';

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
    // TetxMessageTooltipModal, since otherwise the toggle pin modal fails to
    // render the message since we 'hide' the original message and
    // show another message on top when the tooltip is active, and this
    // state carries through into the modal.
    const mostRecentOverlay = overlayContext?.visibleOverlays.slice(-1)[0];
    const routeKey = mostRecentOverlay?.routeKey;

    navigation.dispatch({
      ...StackActions.replace(TogglePinModalRouteName, {
        threadInfo: route.params.item.threadInfo,
        item: route.params.item,
      }),
      source: routeKey,
    });
  }, [navigation, overlayContext, route.params.item]);
}

export { useNavigateToPinModal };
