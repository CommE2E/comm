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
import type { ThreadInfo } from 'lib/types/thread-types.js';

import {
  inlineEngagementLabelStyle,
  inlineEngagementStyle,
  inlineEngagementCenterStyle,
  inlineEngagementRightStyle,
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
  +positioning?: 'left' | 'right' | 'center',
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

  const isLeft = positioning === 'left';
  const isRight = positioning === 'right';
  const isCenter = positioning === 'center';

  const navigateToThread = useNavigateToThread();
  const { navigate } = useNavigation();

  const styles = useStyles(unboundStyles);

  const editedLabel = React.useMemo(() => {
    if (!label) {
      return null;
    }

    const labelLeftRight = isLeft
      ? styles.messageLabelLeft
      : styles.messageLabelRight;

    return (
      <View>
        <Text style={[styles.messageLabel, labelLeftRight]}>{label}</Text>
      </View>
    );
  }, [isLeft, label, styles]);

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

  const repliesText = useInlineEngagementText(sidebarThreadInfo);

  const sidebarStyle = React.useMemo(() => {
    const stylesResult = [styles.sidebar];

    if (!reactions || Object.keys(reactions).length === 0) {
      return stylesResult;
    }

    if (isRight) {
      stylesResult.push(styles.sidebarMarginLeft);
    } else {
      stylesResult.push(styles.sidebarMarginRight);
    }

    return stylesResult;
  }, [
    isRight,
    reactions,
    styles.sidebar,
    styles.sidebarMarginLeft,
    styles.sidebarMarginRight,
  ]);

  const sidebarItem = React.useMemo(() => {
    if (!sidebarThreadInfo) {
      return null;
    }
    return (
      <GestureTouchableOpacity
        onPress={onPressSidebar}
        activeOpacity={0.7}
        style={sidebarStyle}
      >
        <CommIcon style={styles.icon} size={14} name="sidebar-filled" />
        <Text style={repliesStyles}>{repliesText}</Text>
      </GestureTouchableOpacity>
    );
  }, [
    sidebarThreadInfo,
    onPressSidebar,
    sidebarStyle,
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

  const reactionStyle = React.useMemo(() => {
    const stylesResult = [styles.reactionsContainer];

    if (isRight) {
      stylesResult.push(styles.reactionsContainerMarginLeft);
    } else {
      stylesResult.push(styles.reactionsContainerMarginRight);
    }

    return stylesResult;
  }, [
    isRight,
    styles.reactionsContainer,
    styles.reactionsContainerMarginLeft,
    styles.reactionsContainerMarginRight,
  ]);

  const reactionList = React.useMemo(() => {
    if (!reactions || Object.keys(reactions).length === 0) {
      return null;
    }

    return Object.keys(reactions).map(reaction => {
      const numOfReacts = reactions[reaction].users.length;
      return (
        <GestureTouchableOpacity
          style={reactionStyle}
          onPress={onPressReactions}
          activeOpacity={0.7}
          key={reaction}
        >
          <Text style={styles.reaction}>{`${reaction} ${numOfReacts}`}</Text>
        </GestureTouchableOpacity>
      );
    });
  }, [onPressReactions, reactionStyle, reactions, styles.reaction]);

  const inlineEngagementPositionStyle = React.useMemo(() => {
    const styleResult = [styles.inlineEngagement];
    if (isRight) {
      styleResult.push(styles.rightInlineEngagement);
    } else if (isCenter) {
      styleResult.push(styles.centerInlineEngagement);
    }
    return styleResult;
  }, [
    isCenter,
    isRight,
    styles.centerInlineEngagement,
    styles.inlineEngagement,
    styles.rightInlineEngagement,
  ]);

  return (
    <View style={inlineEngagementPositionStyle}>
      {editedLabel}
      {sidebarItem}
      {reactionList}
    </View>
  );
}

const unboundStyles = {
  inlineEngagement: {
    flexDirection: 'row',
    marginBottom: inlineEngagementStyle.marginBottom,
    marginLeft: avatarOffset,
    flexWrap: 'wrap',
    top: inlineEngagementStyle.topOffset,
  },
  centerInlineEngagement: {
    marginLeft: 20,
    marginRight: 20,
    justifyContent: 'center',
  },
  rightInlineEngagement: {
    flexDirection: 'row-reverse',
    marginLeft: inlineEngagementRightStyle.marginLeft,
  },
  sidebar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'inlineEngagementBackground',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: inlineEngagementStyle.marginTop,
  },
  sidebarMarginLeft: {
    marginLeft: 4,
  },
  sidebarMarginRight: {
    marginRight: 4,
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
    backgroundColor: 'inlineEngagementBackground',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: inlineEngagementStyle.marginTop,
  },
  reactionsContainerMarginLeft: {
    marginLeft: 4,
  },
  reactionsContainerMarginRight: {
    marginRight: 4,
  },
  reaction: {
    color: 'inlineEngagementLabel',
    fontSize: 14,
    lineHeight: 22,
  },
  messageLabel: {
    color: 'messageLabel',
    paddingHorizontal: 3,
    fontSize: 13,
    top: inlineEngagementLabelStyle.topOffset,
    height: inlineEngagementLabelStyle.height,
    marginTop: inlineEngagementStyle.marginTop,
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
        top: inlineEngagementStyle.marginTop + inlineEngagementStyle.topOffset,
        left: composedMessageStyle.marginLeft,
      };
    } else if (positioning === 'right') {
      return {
        position: 'absolute',
        right:
          inlineEngagementRightStyle.marginLeft +
          composedMessageStyle.marginRight,
        top: inlineEngagementStyle.marginTop + inlineEngagementStyle.topOffset,
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
