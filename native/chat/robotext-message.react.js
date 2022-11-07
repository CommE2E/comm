// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import { messageKey } from 'lib/shared/message-utils';
import { useCanCreateSidebarFromMessage } from 'lib/shared/thread-utils';

import { KeyboardContext } from '../keyboard/keyboard-state';
import { OverlayContext } from '../navigation/overlay-context';
import { RobotextMessageTooltipModalRouteName } from '../navigation/route-names';
import type { NavigationRoute } from '../navigation/route-names';
import { fixedTooltipHeight } from '../navigation/tooltip.react';
import { useStyles } from '../themes/colors';
import type { ChatRobotextMessageInfoItemWithHeight } from '../types/chat-types';
import type { VerticalBounds } from '../types/layout-types';
import { AnimatedView } from '../types/styles';
import { inlineSidebarCenterStyle } from './chat-constants';
import type { ChatNavigationProp } from './chat.react';
import { InlineSidebar } from './inline-sidebar.react';
import { InnerRobotextMessage } from './inner-robotext-message.react';
import { Timestamp } from './timestamp.react';
import { getMessageTooltipKey, useContentAndHeaderOpacity } from './utils';

type Props = {
  ...React.ElementConfig<typeof View>,
  +item: ChatRobotextMessageInfoItemWithHeight,
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
  +focused: boolean,
  +toggleFocus: (messageKey: string) => void,
  +verticalBounds: ?VerticalBounds,
};
function RobotextMessage(props: Props): React.Node {
  const {
    item,
    navigation,
    route,
    focused,
    toggleFocus,
    verticalBounds,
    ...viewProps
  } = props;

  let timestamp = null;
  if (focused || item.startsConversation) {
    timestamp = (
      <Timestamp time={item.messageInfo.time} display="lowContrast" />
    );
  }

  const styles = useStyles(unboundStyles);
  let inlineSidebar = null;
  if (item.threadCreatedFromMessage) {
    inlineSidebar = (
      <View style={styles.sidebar}>
        <InlineSidebar threadInfo={item.threadCreatedFromMessage} />
      </View>
    );
  }

  const keyboardState = React.useContext(KeyboardContext);
  const key = messageKey(item.messageInfo);
  const onPress = React.useCallback(() => {
    const didDismiss =
      keyboardState && keyboardState.dismissKeyboardIfShowing();
    if (!didDismiss) {
      toggleFocus(key);
    }
  }, [keyboardState, toggleFocus, key]);

  const overlayContext = React.useContext(OverlayContext);
  const viewRef = React.useRef<?React.ElementRef<typeof View>>();

  const canCreateSidebarFromMessage = useCanCreateSidebarFromMessage(
    item.threadInfo,
    item.messageInfo,
  );
  const visibleEntryIDs = React.useMemo(() => {
    if (item.threadCreatedFromMessage) {
      return ['open_sidebar'];
    } else if (canCreateSidebarFromMessage) {
      return ['create_sidebar'];
    }
    return [];
  }, [item.threadCreatedFromMessage, canCreateSidebarFromMessage]);

  const openRobotextTooltipModal = React.useCallback(
    (x, y, width, height, pageX, pageY) => {
      invariant(
        verticalBounds,
        'verticalBounds should be present in openRobotextTooltipModal',
      );
      const coordinates = { x: pageX, y: pageY, width, height };

      const messageTop = pageY;
      const messageBottom = pageY + height;
      const boundsTop = verticalBounds.y;
      const boundsBottom = verticalBounds.y + verticalBounds.height;

      const belowMargin = 20;
      const belowSpace = fixedTooltipHeight + belowMargin;
      const { isViewer } = item.messageInfo.creator;
      const aboveMargin = isViewer ? 30 : 50;
      const aboveSpace = fixedTooltipHeight + aboveMargin;

      let margin = 0;
      if (
        messageBottom + belowSpace > boundsBottom &&
        messageTop - aboveSpace > boundsTop
      ) {
        margin = aboveMargin;
      }

      props.navigation.navigate<'RobotextMessageTooltipModal'>({
        name: RobotextMessageTooltipModalRouteName,
        params: {
          presentedFrom: props.route.key,
          initialCoordinates: coordinates,
          verticalBounds,
          visibleEntryIDs,
          location: 'fixed',
          margin,
          item,
        },
        key: getMessageTooltipKey(item),
      });
    },
    [item, props.navigation, props.route.key, verticalBounds, visibleEntryIDs],
  );

  const onLongPress = React.useCallback(() => {
    if (keyboardState && keyboardState.dismissKeyboardIfShowing()) {
      return;
    }

    if (visibleEntryIDs.length === 0) {
      return;
    }

    if (!viewRef.current || !verticalBounds) {
      return;
    }

    if (!focused) {
      toggleFocus(messageKey(item.messageInfo));
    }

    invariant(overlayContext, 'RobotextMessage should have OverlayContext');
    overlayContext.setScrollBlockingModalStatus('open');
    viewRef.current?.measure(openRobotextTooltipModal);
  }, [
    focused,
    item,
    keyboardState,
    overlayContext,
    toggleFocus,
    verticalBounds,
    viewRef,
    visibleEntryIDs,
    openRobotextTooltipModal,
  ]);

  const onLayout = React.useCallback(() => {}, []);

  const contentAndHeaderOpacity = useContentAndHeaderOpacity(item);

  return (
    <View {...viewProps}>
      <AnimatedView style={{ opacity: contentAndHeaderOpacity }}>
        {timestamp}
      </AnimatedView>
      <View onLayout={onLayout} ref={viewRef}>
        <AnimatedView style={{ opacity: contentAndHeaderOpacity }}>
          <InnerRobotextMessage
            item={item}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        </AnimatedView>
      </View>
      {inlineSidebar}
    </View>
  );
}

const unboundStyles = {
  sidebar: {
    marginTop: inlineSidebarCenterStyle.topOffset,
    marginBottom: -inlineSidebarCenterStyle.topOffset,
    alignSelf: 'center',
  },
};

export { RobotextMessage };
