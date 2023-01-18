// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Extrapolate,
  interpolateNode,
} from 'react-native-reanimated';

import useInlineEngagementText from 'lib/hooks/inline-engagement-text.react';
import type { MessageReactionInfo } from 'lib/selectors/chat-selectors';
import { stringForReactionList } from 'lib/shared/reaction-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import CommIcon from '../components/comm-icon.react';
import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react';
import { useStyles } from '../themes/colors';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types';
import {
  inlineEngagementStyle,
  inlineEngagementCenterStyle,
  inlineEngagementRightStyle,
  composedMessageStyle,
} from './chat-constants';
import { useNavigateToThread } from './message-list-types';

type Props = {
  +threadInfo: ?ThreadInfo,
  +reactions?: $ReadOnlyMap<string, MessageReactionInfo>,
  +disabled?: boolean,
};
function InlineEngagement(props: Props): React.Node {
  const { disabled = false, reactions, threadInfo } = props;
  const repliesText = useInlineEngagementText(threadInfo);

  const navigateToThread = useNavigateToThread();
  const onPress = React.useCallback(() => {
    if (threadInfo && !disabled) {
      navigateToThread({ threadInfo });
    }
  }, [disabled, navigateToThread, threadInfo]);

  const styles = useStyles(unboundStyles);

  const reactionList = React.useMemo(() => {
    if (!reactions || reactions.size === 0) {
      return null;
    }

    const reactionText = stringForReactionList(reactions);
    const reactionItems = <Text style={styles.reaction}>{reactionText}</Text>;

    return <View style={styles.reactionsContainer}>{reactionItems}</View>;
  }, [reactions, styles.reaction, styles.reactionsContainer]);

  const unreadStyle = threadInfo?.currentUser.unread ? styles.unread : null;
  const marginRight = reactionList ? styles.repliesMarginRight : null;
  const repliesStyles = React.useMemo(
    () => [marginRight, styles.repliesText, unreadStyle],
    [marginRight, styles.repliesText, unreadStyle],
  );
  const noThreadInfo = !threadInfo;
  const sidebarInfo = React.useMemo(() => {
    if (noThreadInfo) {
      return null;
    }
    return (
      <>
        <CommIcon style={styles.icon} size={14} name="sidebar-filled" />
        <Text style={repliesStyles}>{repliesText}</Text>
      </>
    );
  }, [noThreadInfo, styles.icon, repliesStyles, repliesText]);
  return (
    <View style={styles.container}>
      <GestureTouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.sidebar}
      >
        {sidebarInfo}
        {reactionList}
      </GestureTouchableOpacity>
    </View>
  );
}

const unboundStyles = {
  container: {
    flexDirection: 'row',
    height: inlineEngagementStyle.height,
    display: 'flex',
    borderRadius: 16,
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  sidebar: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'inlineEngagementBackground',
    padding: 8,
    borderRadius: 16,
    height: inlineEngagementStyle.height,
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
  repliesMarginRight: {
    marginRight: 12,
  },
  reaction: {
    marginLeft: 4,
    color: 'inlineEngagementLabel',
  },
  reactionsContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginLeft: -4,
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
          inlineEngagementStyle.marginTop +
          inlineEngagementRightStyle.topOffset,
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
