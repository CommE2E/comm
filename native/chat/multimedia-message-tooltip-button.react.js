// @flow

import * as React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import EmojiPicker from 'rn-emoji-keyboard';

import { getAvatarForUser } from 'lib/shared/avatar-utils.js';
import { localIDPrefix } from 'lib/shared/message-utils.js';
import { useCanCreateReactionFromMessage } from 'lib/shared/reaction-utils.js';

import { avatarOffset } from './chat-constants.js';
import { TooltipInlineEngagement } from './inline-engagement.react.js';
import { InnerMultimediaMessage } from './inner-multimedia-message.react.js';
import { MessageHeader } from './message-header.react.js';
import { useSendReaction } from './reaction-message-utils.js';
import ReactionSelectionPopover from './reaction-selection-popover.react.js';
import SidebarInputBarHeightMeasurer from './sidebar-input-bar-height-measurer.react.js';
import { useAnimatedMessageTooltipButton } from './utils.js';
import Avatar from '../components/avatar.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useTooltipActions } from '../tooltip/tooltip-hooks.js';
import type { TooltipRoute } from '../tooltip/tooltip.react.js';
import { useShouldRenderAvatars } from '../utils/avatar-utils.js';

/* eslint-disable import/no-named-as-default-member */
const { Node, Extrapolate, interpolateNode } = Animated;
/* eslint-enable import/no-named-as-default-member */

function noop() {}

type Props = {
  +navigation: AppNavigationProp<'MultimediaMessageTooltipModal'>,
  +route: TooltipRoute<'MultimediaMessageTooltipModal'>,
  +progress: Node,
  +isOpeningSidebar: boolean,
};
function MultimediaMessageTooltipButton(props: Props): React.Node {
  const { navigation, route, progress, isOpeningSidebar } = props;

  const windowWidth = useSelector(state => state.dimensions.width);

  const [sidebarInputBarHeight, setSidebarInputBarHeight] =
    React.useState<?number>(null);
  const onInputBarMeasured = React.useCallback((height: number) => {
    setSidebarInputBarHeight(height);
  }, []);

  const { item, verticalBounds, initialCoordinates } = route.params;

  const { style: messageContainerStyle } = useAnimatedMessageTooltipButton({
    sourceMessage: item,
    initialCoordinates,
    messageListVerticalBounds: verticalBounds,
    progress,
    targetInputBarHeight: sidebarInputBarHeight,
  });

  const headerStyle = React.useMemo(() => {
    const bottom = initialCoordinates.height;
    const opacity = interpolateNode(progress, {
      inputRange: [0, 0.05],
      outputRange: [0, 1],
      extrapolate: Extrapolate.CLAMP,
    });
    return {
      opacity,
      position: 'absolute',
      left: -initialCoordinates.x,
      width: windowWidth,
      bottom,
    };
  }, [initialCoordinates.height, initialCoordinates.x, progress, windowWidth]);

  const inlineEngagement = React.useMemo(() => {
    if (!item.threadCreatedFromMessage) {
      return null;
    }
    return (
      <TooltipInlineEngagement
        item={item}
        positioning={item.messageInfo.creator.isViewer ? 'right' : 'left'}
        isOpeningSidebar={isOpeningSidebar}
        progress={progress}
        windowWidth={windowWidth}
        initialCoordinates={initialCoordinates}
      />
    );
  }, [initialCoordinates, isOpeningSidebar, item, progress, windowWidth]);

  const innerMultimediaMessage = React.useMemo(
    () => (
      <InnerMultimediaMessage
        item={item}
        verticalBounds={verticalBounds}
        clickable={false}
        setClickable={noop}
        onPress={navigation.goBackOnce}
        onLongPress={navigation.goBackOnce}
      />
    ),
    [item, navigation.goBackOnce, verticalBounds],
  );

  const { messageInfo, threadInfo, reactions } = item;
  const nextLocalID = useSelector(state => state.nextLocalID);
  const localID = `${localIDPrefix}${nextLocalID}`;

  const canCreateReactionFromMessage = useCanCreateReactionFromMessage(
    threadInfo,
    messageInfo,
  );

  const sendReaction = useSendReaction(
    messageInfo.id,
    localID,
    threadInfo.id,
    reactions,
  );

  const [emojiPickerOpen, setEmojiPickerOpen] = React.useState<boolean>(false);
  const openEmojiPicker = React.useCallback(() => {
    setEmojiPickerOpen(true);
  }, []);

  const reactionSelectionPopover = React.useMemo(() => {
    if (!canCreateReactionFromMessage) {
      return null;
    }

    return (
      <ReactionSelectionPopover
        navigation={navigation}
        route={route}
        openEmojiPicker={openEmojiPicker}
        sendReaction={sendReaction}
      />
    );
  }, [
    navigation,
    route,
    openEmojiPicker,
    canCreateReactionFromMessage,
    sendReaction,
  ]);

  const tooltipRouteKey = route.key;
  const { dismissTooltip } = useTooltipActions(navigation, tooltipRouteKey);

  const onEmojiSelected = React.useCallback(
    emoji => {
      sendReaction(emoji.emoji);
      dismissTooltip();
    },
    [sendReaction, dismissTooltip],
  );

  const avatarInfo = React.useMemo(
    () => getAvatarForUser(item.messageInfo.creator),
    [item.messageInfo.creator],
  );
  const shouldRenderAvatars = useShouldRenderAvatars();

  const avatar = React.useMemo(() => {
    if (item.messageInfo.creator.isViewer || !shouldRenderAvatars) {
      return null;
    }
    return (
      <View style={styles.avatarContainer}>
        <Avatar size="small" avatarInfo={avatarInfo} />
      </View>
    );
  }, [avatarInfo, item.messageInfo.creator.isViewer, shouldRenderAvatars]);

  return (
    <>
      <Animated.View style={messageContainerStyle}>
        <SidebarInputBarHeightMeasurer
          sourceMessage={item}
          onInputBarMeasured={onInputBarMeasured}
        />
        <Animated.View style={headerStyle}>
          <MessageHeader item={item} focused={true} display="modal" />
        </Animated.View>
        {avatar}
        {reactionSelectionPopover}
        {innerMultimediaMessage}
        {inlineEngagement}
      </Animated.View>
      <EmojiPicker
        onEmojiSelected={onEmojiSelected}
        open={emojiPickerOpen}
        onClose={dismissTooltip}
      />
    </>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    bottom: 0,
    left: -avatarOffset,
    position: 'absolute',
  },
});

export default MultimediaMessageTooltipButton;
