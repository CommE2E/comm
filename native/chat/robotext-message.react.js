// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';

import { messageKey } from 'lib/shared/message-utils';
import { relationshipBlockedInEitherDirection } from 'lib/shared/relationship-utils';
import { threadHasPermission } from 'lib/shared/thread-utils';
import type { RobotextMessageInfo } from 'lib/types/message-types';
import { type ThreadInfo, threadPermissions } from 'lib/types/thread-types';
import type { UserInfo } from 'lib/types/user-types';

import { KeyboardContext } from '../keyboard/keyboard-state';
import { OverlayContext } from '../navigation/overlay-context';
import { RobotextMessageTooltipModalRouteName } from '../navigation/route-names';
import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors';
import type { VerticalBounds } from '../types/layout-types';
import type { ChatNavigationProp } from './chat.react';
import { InlineSidebar, inlineSidebarHeight } from './inline-sidebar.react';
import { InnerRobotextMessage } from './inner-robotext-message.react';
import { robotextMessageTooltipHeight } from './robotext-message-tooltip-modal.react';
import { Timestamp } from './timestamp.react';

export type ChatRobotextMessageInfoItemWithHeight = {|
  +itemType: 'message',
  +messageShapeType: 'robotext',
  +messageInfo: RobotextMessageInfo,
  +threadInfo: ThreadInfo,
  +startsConversation: boolean,
  +startsCluster: boolean,
  +endsCluster: boolean,
  +robotext: string,
  +threadCreatedFromMessage: ?ThreadInfo,
  +contentHeight: number,
|};

function robotextMessageItemHeight(
  item: ChatRobotextMessageInfoItemWithHeight,
) {
  if (item.threadCreatedFromMessage) {
    return item.contentHeight + inlineSidebarHeight;
  }
  return item.contentHeight;
}

type Props = {|
  ...React.ElementConfig<typeof View>,
  +item: ChatRobotextMessageInfoItemWithHeight,
  +navigation: ChatNavigationProp<'MessageList'>,
  +route: NavigationRoute<'MessageList'>,
  +focused: boolean,
  +toggleFocus: (messageKey: string) => void,
  +verticalBounds: ?VerticalBounds,
|};
function RobotextMessage(props: Props) {
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
        <InlineSidebar
          threadInfo={item.threadCreatedFromMessage}
          positioning="center"
        />
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

  const messageCreatorUserInfo: ?UserInfo = useSelector(
    (state) => state.userStore.userInfos[props.item.messageInfo.creator.id],
  );
  const creatorRelationship = messageCreatorUserInfo?.relationshipStatus;
  const visibleEntryIDs = React.useMemo(() => {
    const canCreateSidebars = threadHasPermission(
      item.threadInfo,
      threadPermissions.CREATE_SIDEBARS,
    );
    const creatorRelationshipHasBlock =
      creatorRelationship &&
      relationshipBlockedInEitherDirection(creatorRelationship);

    if (item.threadCreatedFromMessage) {
      return ['open_sidebar'];
    } else if (canCreateSidebars && !creatorRelationshipHasBlock) {
      return ['create_sidebar'];
    }
    return [];
  }, [item.threadCreatedFromMessage, item.threadInfo, creatorRelationship]);

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
      const belowSpace = robotextMessageTooltipHeight + belowMargin;
      const { isViewer } = item.messageInfo.creator;
      const aboveMargin = isViewer ? 30 : 50;
      const aboveSpace = robotextMessageTooltipHeight + aboveMargin;

      let location = 'below',
        margin = 0;
      if (
        messageBottom + belowSpace > boundsBottom &&
        messageTop - aboveSpace > boundsTop
      ) {
        location = 'above';
        margin = aboveMargin;
      }

      props.navigation.navigate({
        name: RobotextMessageTooltipModalRouteName,
        params: {
          presentedFrom: props.route.key,
          initialCoordinates: coordinates,
          verticalBounds,
          visibleEntryIDs,
          location,
          margin,
          item,
        },
      });
    },
    [item, props.navigation, props.route.key, verticalBounds, visibleEntryIDs],
  );

  const onLongPress = React.useCallback(() => {
    if (visibleEntryIDs.length === 0) {
      return;
    }
    if (keyboardState && keyboardState.dismissKeyboardIfShowing()) {
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

  return (
    <View {...viewProps}>
      {timestamp}
      <View onLayout={onLayout} ref={viewRef}>
        <InnerRobotextMessage
          item={item}
          navigation={navigation}
          onPress={onPress}
          onLongPress={onLongPress}
        />
        {inlineSidebar}
      </View>
    </View>
  );
}

const unboundStyles = {
  sidebar: {
    marginTop: -5,
    marginBottom: 5,
  },
};

export { robotextMessageItemHeight, RobotextMessage };
