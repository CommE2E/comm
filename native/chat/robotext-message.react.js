// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';

import {
  chatMessageItemKey,
  chatMessageItemHasEngagement,
  chatMessageInfoItemTargetableMessageInfo,
} from 'lib/shared/chat-message-item-utils.js';
import { useCanCreateSidebarFromMessage } from 'lib/shared/sidebar-utils.js';

import { inlineEngagementCenterStyle } from './chat-constants.js';
import type { ChatNavigationProp } from './chat.react.js';
import { InlineEngagement } from './inline-engagement.react.js';
import { InnerRobotextMessage } from './inner-robotext-message.react.js';
import { Timestamp } from './timestamp.react.js';
import { getMessageTooltipKey, useContentAndHeaderOpacity } from './utils.js';
import { ChatContext } from '../chat/chat-context.js';
import { KeyboardContext } from '../keyboard/keyboard-state.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react';
import { OverlayContext } from '../navigation/overlay-context.js';
import { RobotextMessageTooltipModalRouteName } from '../navigation/route-names.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import { fixedTooltipHeight } from '../tooltip/tooltip.react.js';
import type { ChatRobotextMessageInfoItemWithHeight } from '../types/chat-types.js';
import type { VerticalBounds } from '../types/layout-types.js';
import { AnimatedView } from '../types/styles.js';

type Props = {
  ...React.ElementConfig<typeof View>,
  +item: ChatRobotextMessageInfoItemWithHeight,
  +navigation:
    | ChatNavigationProp<'MessageList'>
    | AppNavigationProp<'TogglePinModal'>
    | ChatNavigationProp<'PinnedMessagesScreen'>
    | ChatNavigationProp<'MessageSearch'>,
  +route:
    | NavigationRoute<'MessageList'>
    | NavigationRoute<'TogglePinModal'>
    | NavigationRoute<'PinnedMessagesScreen'>
    | NavigationRoute<'MessageSearch'>,
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
    timestamp = <Timestamp item={item} display="lowContrast" />;
  }

  const styles = useStyles(unboundStyles);
  const targetableMessageInfo = chatMessageInfoItemTargetableMessageInfo(item);
  let inlineEngagement = null;
  if (chatMessageItemHasEngagement(item, item.threadInfo.id)) {
    inlineEngagement = (
      <View style={styles.sidebar}>
        <InlineEngagement
          messageInfo={targetableMessageInfo}
          threadInfo={item.threadInfo}
          sidebarThreadInfo={item.threadCreatedFromMessage}
          reactions={item.reactions}
          positioning="center"
        />
      </View>
    );
  }

  const chatContext = React.useContext(ChatContext);
  const keyboardState = React.useContext(KeyboardContext);
  const key = chatMessageItemKey(item);
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
    targetableMessageInfo,
  );

  const visibleEntryIDs = React.useMemo(() => {
    const result = [];

    if (item.threadCreatedFromMessage || canCreateSidebarFromMessage) {
      result.push('sidebar');
    }

    return result;
  }, [item.threadCreatedFromMessage, canCreateSidebarFromMessage]);

  const openRobotextTooltipModal = React.useCallback(
    (
      x: number,
      y: number,
      width: number,
      height: number,
      pageX: number,
      pageY: number,
    ) => {
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
      const aboveMargin = 30;
      const aboveSpace = fixedTooltipHeight + aboveMargin;

      let margin = 0;
      if (
        messageBottom + belowSpace > boundsBottom &&
        messageTop - aboveSpace > boundsTop
      ) {
        margin = aboveMargin;
      }

      const currentInputBarHeight =
        chatContext?.chatInputBarHeights.get(item.threadInfo.id) ?? 0;

      props.navigation.navigate<'RobotextMessageTooltipModal'>({
        name: RobotextMessageTooltipModalRouteName,
        params: {
          presentedFrom: props.route.key,
          initialCoordinates: coordinates,
          verticalBounds,
          visibleEntryIDs,
          tooltipLocation: 'fixed',
          margin,
          item,
          chatInputBarHeight: currentInputBarHeight,
        },
        key: getMessageTooltipKey(item),
      });
    },
    [
      item,
      props.navigation,
      props.route.key,
      verticalBounds,
      visibleEntryIDs,
      chatContext,
    ],
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
      toggleFocus(key);
    }

    invariant(overlayContext, 'RobotextMessage should have OverlayContext');
    overlayContext.setScrollBlockingModalStatus('open');
    viewRef.current?.measure(openRobotextTooltipModal);
  }, [
    focused,
    key,
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

  const viewStyle: { height?: number } = {};
  if (!__DEV__) {
    // We don't force view height in dev mode because we
    // want to measure it in Message to see if it's correct
    viewStyle.height = item.contentHeight;
  }

  return (
    <View {...viewProps}>
      <AnimatedView style={{ opacity: contentAndHeaderOpacity }}>
        {timestamp}
      </AnimatedView>
      <View onLayout={onLayout} ref={viewRef} style={viewStyle}>
        <AnimatedView style={{ opacity: contentAndHeaderOpacity }}>
          <InnerRobotextMessage
            item={item}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        </AnimatedView>
      </View>
      {inlineEngagement}
    </View>
  );
}

const unboundStyles = {
  sidebar: {
    marginTop: inlineEngagementCenterStyle.topOffset,
    marginBottom: -inlineEngagementCenterStyle.topOffset,
    alignSelf: 'center',
  },
};

export { RobotextMessage };
