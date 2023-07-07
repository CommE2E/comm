// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
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
  inlineEngagementLabelStyle,
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
  +sidebarThreadInfo: ?ThreadInfo,
  +reactions?: ReactionInfo,
  +disabled?: boolean,
  +positioning?: 'left' | 'right',
  +label?: ?string,
};
function InlineEngagement(props: Props): React.Node {
  const {
    disabled = false,
    reactions,
    sidebarThreadInfo,
    positioning,
    label,
  } = props;
  const repliesText = useInlineEngagementText(sidebarThreadInfo);

  const navigateToThread = useNavigateToThread();
  const { navigate } = useNavigation();

  const styles = useStyles(unboundStyles);

  const unreadStyle = sidebarThreadInfo?.currentUser.unread
    ? styles.unread
    : null;
  const repliesStyles = React.useMemo(
    () => [styles.repliesText, unreadStyle],
    [styles.repliesText, unreadStyle],
  );

  const onPressSidebar = React.useCallback(() => {
    if (sidebarThreadInfo && !disabled) {
      navigateToThread({ threadInfo: sidebarThreadInfo });
    }
  }, [disabled, navigateToThread, sidebarThreadInfo]);

  const sidebarItem = React.useMemo(() => {
    if (!sidebarThreadInfo) {
      return null;
    }
    return (
      <GestureTouchableOpacity
        onPress={onPressSidebar}
        activeOpacity={0.7}
        style={styles.sidebar}
      >
        <CommIcon style={styles.icon} size={14} name="sidebar-filled" />
        <Text style={repliesStyles}>{repliesText}</Text>
      </GestureTouchableOpacity>
    );
  }, [
    sidebarThreadInfo,
    onPressSidebar,
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
  inlineEngagement: {
    flexDirection: 'row',
    marginBottom: inlineEngagementStyle.marginBottom,
    marginTop: inlineEngagementStyle.marginTop,
    alignItems: 'center',
    marginLeft: avatarOffset,
  },
  leftInlineEngagement: {
    justifyContent: 'flex-start',
    position: 'relative',
    top: inlineEngagementLeftStyle.topOffset,
  },
  rightInlineEngagement: {
    alignSelf: 'flex-end',
    position: 'relative',
    right: inlineEngagementRightStyle.marginRight,
    top: inlineEngagementRightStyle.topOffset,
  },
  container: {
    flexDirection: 'row',
    height: inlineEngagementStyle.height,
    borderRadius: 16,
    backgroundColor: 'inlineEngagementBackground',
    alignSelf: 'baseline',
    alignItems: 'center',
    padding: 8,
  },
  sidebar: {
    flexDirection: 'row',
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
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  reactionsContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
  reaction: {
    color: 'inlineEngagementLabel',
    fontSize: 14,
    lineHeight: 22,
  },
  reactionMarginLeft: {
    marginLeft: 12,
  },
  messageLabel: {
    color: 'messageLabel',
    paddingHorizontal: 3,
    fontSize: 13,
    top: inlineEngagementLabelStyle.topOffset,
    height: inlineEngagementLabelStyle.height,
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
  // ESLint doesn't recognize that invariant always throws
  // eslint-disable-next-line consistent-return
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
    invariant(
      false,
      `${positioning} is not a valid positioning value for InlineEngagement`,
    );
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
        <InlineEngagement
          sidebarThreadInfo={item.threadCreatedFromMessage}
          disabled
        />
      </Animated.View>
    </Animated.View>
  );
}

export { InlineEngagement, TooltipInlineEngagement };
