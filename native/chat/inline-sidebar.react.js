// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Extrapolate,
  interpolateNode,
} from 'react-native-reanimated';

import useInlineSidebarText from 'lib/hooks/inline-sidebar-text.react';
import type { MessageReactionInfo } from 'lib/selectors/chat-selectors';
import { stringForReactionList } from 'lib/shared/reaction-utils';
import type { ThreadInfo } from 'lib/types/thread-types';

import CommIcon from '../components/comm-icon.react';
import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react';
import { useStyles } from '../themes/colors';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types';
import {
  inlineSidebarStyle,
  inlineSidebarCenterStyle,
  inlineSidebarRightStyle,
  composedMessageStyle,
} from './chat-constants';
import { useNavigateToThread } from './message-list-types';

type Props = {
  +threadInfo: ?ThreadInfo,
  +reactions?: $ReadOnlyMap<string, MessageReactionInfo>,
  +disabled?: boolean,
};
function InlineSidebar(props: Props): React.Node {
  const { disabled = false, reactions, threadInfo } = props;
  const { repliesText } = useInlineSidebarText(threadInfo);

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
    height: inlineSidebarStyle.height,
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
    backgroundColor: 'inlineSidebarBackground',
    padding: 8,
    borderRadius: 16,
    height: inlineSidebarStyle.height,
  },
  icon: {
    color: 'inlineSidebarLabel',
    marginRight: 4,
  },
  repliesText: {
    color: 'inlineSidebarLabel',
    fontSize: 14,
    lineHeight: 22,
  },
  repliesMarginRight: {
    marginRight: 12,
  },
  reaction: {
    marginLeft: 4,
    color: 'inlineSidebarLabel',
  },
  reactionsContainer: {
    display: 'flex',
    flexDirection: 'row',
    marginLeft: -4,
  },
};

type TooltipInlineSidebarProps = {
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

function TooltipInlineSidebar(props: TooltipInlineSidebarProps): React.Node {
  const {
    item,
    isOpeningSidebar,
    progress,
    windowWidth,
    initialCoordinates,
    positioning,
  } = props;
  const inlineSidebarStyles = React.useMemo(() => {
    if (positioning === 'left') {
      return {
        position: 'absolute',
        top: inlineSidebarStyle.marginTop + inlineSidebarRightStyle.topOffset,
        left: composedMessageStyle.marginLeft,
      };
    } else if (positioning === 'right') {
      return {
        position: 'absolute',
        right:
          inlineSidebarRightStyle.marginRight +
          composedMessageStyle.marginRight,
        top: inlineSidebarStyle.marginTop + inlineSidebarRightStyle.topOffset,
      };
    } else if (positioning === 'center') {
      return {
        alignSelf: 'center',
        top: inlineSidebarCenterStyle.topOffset,
      };
    }
  }, [positioning]);
  const inlineSidebarContainer = React.useMemo(() => {
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
    <Animated.View style={inlineSidebarContainer}>
      <Animated.View style={inlineSidebarStyles}>
        <InlineSidebar threadInfo={item.threadCreatedFromMessage} disabled />
      </Animated.View>
    </Animated.View>
  );
}

export { InlineSidebar, TooltipInlineSidebar };
