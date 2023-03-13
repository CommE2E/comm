// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Extrapolate,
  interpolateNode,
} from 'react-native-reanimated';

import useInlineEngagementText from 'lib/hooks/inline-engagement-text.react.js';
import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { stringForReactionList } from 'lib/shared/reaction-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import {
  inlineEngagementStyle,
  inlineEngagementCenterStyle,
  inlineEngagementRightStyle,
  inlineEngagementLeftStyle,
  composedMessageStyle,
  avatarOffset,
} from './chat-constants.js';
import { useNavigateToThread } from './message-list-types.js';
import CommIcon from '../components/comm-icon.react.js';
import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react.js';
import { MessageReactionsModalRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';

type Props = {
  +threadInfo: ?ThreadInfo,
  +reactions?: ReactionInfo,
  +disabled?: boolean,
  +positioning?: 'left' | 'right',
  +label?: ?string,
  +shouldRenderAvatars?: boolean,
};
function InlineEngagement(props: Props): React.Node {
  const {
    disabled = false,
    reactions,
    threadInfo,
    positioning,
    shouldRenderAvatars,
    label,
  } = props;
  const repliesText = useInlineEngagementText(threadInfo);

  const navigateToThread = useNavigateToThread();
  const { navigate } = useNavigation();

  const styles = useStyles(unboundStyles);

  const unreadStyle = threadInfo?.currentUser.unread ? styles.unread : null;
  const repliesStyles = React.useMemo(
    () => [styles.repliesText, unreadStyle],
    [styles.repliesText, unreadStyle],
  );

  const onPressThread = React.useCallback(() => {
    if (threadInfo && !disabled) {
      navigateToThread({ threadInfo });
    }
  }, [disabled, navigateToThread, threadInfo]);

  const sidebarItem = React.useMemo(() => {
    if (!threadInfo) {
      return null;
    }
    return (
      <GestureTouchableOpacity
        onPress={onPressThread}
        activeOpacity={0.7}
        style={styles.sidebar}
      >
        <CommIcon style={styles.icon} size={14} name="sidebar-filled" />
        <Text style={repliesStyles}>{repliesText}</Text>
      </GestureTouchableOpacity>
    );
  }, [
    threadInfo,
    onPressThread,
    styles.sidebar,
    styles.icon,
    repliesStyles,
    repliesText,
  ]);

  const onPressReactions = React.useCallback(() => {
    navigate<'MessageReactionsModal'>({
      name: MessageReactionsModalRouteName,
      params: { reactions },
    });
  }, [navigate, reactions]);

  const marginLeft = React.useMemo(
    () => (sidebarItem ? styles.reactionMarginLeft : null),
    [sidebarItem, styles.reactionMarginLeft],
  );

  const reactionList = React.useMemo(() => {
    if (!reactions || Object.keys(reactions).length === 0) {
      return null;
    }

    const reactionText = stringForReactionList(reactions);
    const reactionItems = <Text style={styles.reaction}>{reactionText}</Text>;

    return (
      <GestureTouchableOpacity
        style={[styles.reactionsContainer, marginLeft]}
        onPress={onPressReactions}
        activeOpacity={0.7}
      >
        {reactionItems}
      </GestureTouchableOpacity>
    );
  }, [
    marginLeft,
    onPressReactions,
    reactions,
    styles.reaction,
    styles.reactionsContainer,
  ]);

  const isLeft = positioning === 'left';

  const editedLabel = React.useMemo(() => {
    if (!label) {
      return null;
    }

    const labelLeftRight = isLeft
      ? styles.messageLabelLeft
      : styles.messageLabelRight;

    return <Text style={[styles.messageLabel, labelLeftRight]}>{label}</Text>;
  }, [isLeft, label, styles]);

  const container = React.useMemo(() => {
    if (!sidebarItem && !reactionList) {
      return null;
    }
    return (
      <View style={styles.container}>
        {sidebarItem}
        {reactionList}
      </View>
    );
  }, [reactionList, sidebarItem, styles.container]);

  const inlineEngagementPositionStyle = [styles.inlineEngagement];
  if (isLeft) {
    inlineEngagementPositionStyle.push(styles.leftInlineEngagement);
  } else {
    inlineEngagementPositionStyle.push(styles.rightInlineEngagement);
  }
  if (shouldRenderAvatars) {
    inlineEngagementPositionStyle.push({ marginLeft: avatarOffset });
  }

  let body;
  if (isLeft) {
    body = (
      <>
        {editedLabel}
        {container}
      </>
    );
  } else {
    body = (
      <>
        {container}
        {editedLabel}
      </>
    );
  }

  return <View style={inlineEngagementPositionStyle}>{body}</View>;
}

const unboundStyles = {
  container: {
    flexDirection: 'row',
    height: inlineEngagementStyle.height,
    borderRadius: 16,
    backgroundColor: 'inlineEngagementBackground',
    alignSelf: 'baseline',
    alignItems: 'center',
    padding: 8,
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  rightInlineEngagement: {
    alignSelf: 'flex-end',
    position: 'relative',
    right: inlineEngagementRightStyle.marginRight,
    top: inlineEngagementRightStyle.topOffset,
  },
  leftInlineEngagement: {
    justifyContent: 'flex-start',
    position: 'relative',
    top: inlineEngagementLeftStyle.topOffset,
  },
  sidebar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineEngagement: {
    flexDirection: 'row',
    marginBottom: inlineEngagementStyle.marginBottom,
    marginTop: inlineEngagementStyle.marginTop,
    alignItems: 'center',
  },
  icon: {
    color: 'inlineEngagementLabel',
    marginRight: 4,
  },
  repliesText: {
    color: 'inlineEngagementLabel',
    fontSize: 14,
    lineHeight: 22,
  },
  reaction: {
    color: 'inlineEngagementLabel',
    fontSize: 14,
    lineHeight: 22,
  },
  reactionMarginLeft: {
    marginLeft: 12,
  },
  reactionsContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageLabel: {
    color: 'messageLabel',
    paddingHorizontal: 3,
    fontSize: 13,
    top: 10,
  },
  messageLabelLeft: {
    marginLeft: 9,
    marginRight: 4,
  },
  messageLabelRight: {
    marginRight: 10,
    marginLeft: 4,
  },
  avatarOffset: {
    width: avatarOffset,
  },
};

type TooltipInlineEngagementProps = {
  +item: ChatMessageInfoItemWithHeight,
  +isOpeningSidebar: boolean,
  +progress: Animated.Node,
  +windowWidth: number,
  +positioning: 'left' | 'right' | 'center',
  +initialCoordinates: {
    +x: number,
    +y: number,
    +width: number,
    +height: number,
  },
};

function TooltipInlineEngagement(
  props: TooltipInlineEngagementProps,
): React.Node {
  const {
    item,
    isOpeningSidebar,
    progress,
    windowWidth,
    initialCoordinates,
    positioning,
  } = props;
  const inlineEngagementStyles = React.useMemo(() => {
    if (positioning === 'left') {
      return {
        position: 'absolute',
        top:
          inlineEngagementStyle.marginTop + inlineEngagementLeftStyle.topOffset,
        left: composedMessageStyle.marginLeft,
      };
    } else if (positioning === 'right') {
      return {
        position: 'absolute',
        right:
          inlineEngagementRightStyle.marginRight +
          composedMessageStyle.marginRight,
        top:
          inlineEngagementStyle.marginTop +
          inlineEngagementRightStyle.topOffset,
      };
    } else if (positioning === 'center') {
      return {
        alignSelf: 'center',
        top: inlineEngagementCenterStyle.topOffset,
      };
    }
  }, [positioning]);
  const inlineEngagementContainer = React.useMemo(() => {
    const opacity = isOpeningSidebar
      ? 0
      : interpolateNode(progress, {
          inputRange: [0, 1],
          outputRange: [1, 0],
          extrapolate: Extrapolate.CLAMP,
        });
    return {
      position: 'absolute',
      width: windowWidth,
      top: initialCoordinates.height,
      left: -initialCoordinates.x,
      opacity,
    };
  }, [
    initialCoordinates.height,
    initialCoordinates.x,
    isOpeningSidebar,
    progress,
    windowWidth,
  ]);
  return (
    <Animated.View style={inlineEngagementContainer}>
      <Animated.View style={inlineEngagementStyles}>
        <InlineEngagement threadInfo={item.threadCreatedFromMessage} disabled />
      </Animated.View>
    </Animated.View>
  );
}

export { InlineEngagement, TooltipInlineEngagement };
