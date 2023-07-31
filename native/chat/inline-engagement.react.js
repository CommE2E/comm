// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Extrapolate,
  interpolateNode,
} from 'react-native-reanimated';

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { getInlineEngagementSidebarText } from 'lib/shared/inline-engagement-utils.js';
import { localIDPrefix } from 'lib/shared/message-utils.js';
import type { MessageInfo } from 'lib/types/message-types.js';
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
import { useSendReaction } from './reaction-message-utils.js';
import CommIcon from '../components/comm-icon.react.js';
import GestureTouchableOpacity from '../components/gesture-touchable-opacity.react.js';
import { MessageReactionsModalRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';
import type { ChatMessageInfoItemWithHeight } from '../types/chat-types.js';

type DummyInlineEngagementNodeProps = {
  ...React.ElementConfig<typeof View>,
  +editedLabel?: ?string,
  +sidebarInfo: ?ThreadInfo,
  +reactions: ReactionInfo,
};
function DummyInlineEngagementNode(
  props: DummyInlineEngagementNodeProps,
): React.Node {
  const { editedLabel, sidebarInfo, reactions, ...rest } = props;

  const dummyEditedLabel = React.useMemo(() => {
    if (!editedLabel) {
      return null;
    }

    return (
      <View>
        <Text
          style={[unboundStyles.messageLabel, unboundStyles.dummyMessageLabel]}
        >
          {editedLabel}
        </Text>
      </View>
    );
  }, [editedLabel]);

  const dummySidebarItem = React.useMemo(() => {
    if (!sidebarInfo) {
      return null;
    }

    const repliesText = getInlineEngagementSidebarText(sidebarInfo);
    return (
      <View style={[unboundStyles.sidebar, unboundStyles.dummySidebar]}>
        <Text style={unboundStyles.repliesText}>{repliesText}</Text>
      </View>
    );
  }, [sidebarInfo]);

  const dummyReactionsList = React.useMemo(() => {
    if (Object.keys(reactions).length === 0) {
      return null;
    }

    return Object.keys(reactions).map(reaction => {
      const numOfReacts = reactions[reaction].users.length;
      return (
        <View
          key={reaction}
          style={[
            unboundStyles.reactionsContainer,
            unboundStyles.dummyReactionContainer,
          ]}
        >
          <Text
            style={unboundStyles.reaction}
          >{`${reaction} ${numOfReacts}`}</Text>
        </View>
      );
    });
  }, [reactions]);

  const dummyContainerStyle = React.useMemo(
    () => [unboundStyles.inlineEngagement, unboundStyles.dummyInlineEngagement],
    [],
  );

  if (!dummyEditedLabel && !dummySidebarItem && !dummyReactionsList) {
    return null;
  }

  return (
    <View {...rest} style={dummyContainerStyle}>
      {dummyEditedLabel}
      {dummySidebarItem}
      {dummyReactionsList}
    </View>
  );
}

type Props = {
  +messageInfo: MessageInfo,
  +threadInfo: ThreadInfo,
  +sidebarThreadInfo: ?ThreadInfo,
  +reactions: ReactionInfo,
  +disabled?: boolean,
  +positioning?: 'left' | 'right' | 'center',
  +label?: ?string,
};
function InlineEngagement(props: Props): React.Node {
  const {
    messageInfo,
    threadInfo,
    sidebarThreadInfo,
    reactions,
    disabled = false,
    positioning,
    label,
  } = props;

  const isLeft = positioning === 'left';
  const isRight = positioning === 'right';
  const isCenter = positioning === 'center';

  const navigateToThread = useNavigateToThread();
  const { navigate } = useNavigation();

  const styles = useStyles(unboundStyles);

  const editedLabelStyle = React.useMemo(() => {
    const stylesResult = [styles.messageLabel, styles.messageLabelColor];
    if (isLeft) {
      stylesResult.push(styles.messageLabelLeft);
    } else {
      stylesResult.push(styles.messageLabelRight);
    }

    return stylesResult;
  }, [
    isLeft,
    styles.messageLabel,
    styles.messageLabelColor,
    styles.messageLabelLeft,
    styles.messageLabelRight,
  ]);

  const editedLabel = React.useMemo(() => {
    if (!label) {
      return null;
    }

    return (
      <View>
        <Text style={editedLabelStyle}>{label}</Text>
      </View>
    );
  }, [editedLabelStyle, label]);

  const unreadStyle = sidebarThreadInfo?.currentUser.unread
    ? styles.unread
    : null;
  const repliesStyles = React.useMemo(
    () => [styles.repliesText, styles.repliesTextColor, unreadStyle],
    [styles.repliesText, styles.repliesTextColor, unreadStyle],
  );

  const onPressSidebar = React.useCallback(() => {
    if (sidebarThreadInfo && !disabled) {
      navigateToThread({ threadInfo: sidebarThreadInfo });
    }
  }, [disabled, navigateToThread, sidebarThreadInfo]);

  const repliesText = getInlineEngagementSidebarText(sidebarThreadInfo);

  const sidebarStyle = React.useMemo(() => {
    const stylesResult = [styles.sidebar, styles.sidebarColor];

    if (Object.keys(reactions).length === 0) {
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
    styles.sidebarColor,
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

  const nextLocalID = useSelector(state => state.nextLocalID);
  const localID = `${localIDPrefix}${nextLocalID}`;

  const sendReaction = useSendReaction(
    messageInfo.id,
    localID,
    threadInfo.id,
    reactions,
  );

  const onPressReaction = React.useCallback(
    (reaction: string) => sendReaction(reaction),
    [sendReaction],
  );

  const onLongPressReaction = React.useCallback(() => {
    navigate<'MessageReactionsModal'>({
      name: MessageReactionsModalRouteName,
      params: { reactions },
    });
  }, [navigate, reactions]);

  const reactionStyle = React.useMemo(() => {
    const stylesResult = [
      styles.reactionsContainer,
      styles.reactionsContainerColor,
    ];

    if (isRight) {
      stylesResult.push(styles.reactionsContainerMarginLeft);
    } else {
      stylesResult.push(styles.reactionsContainerMarginRight);
    }

    return stylesResult;
  }, [
    isRight,
    styles.reactionsContainer,
    styles.reactionsContainerColor,
    styles.reactionsContainerMarginLeft,
    styles.reactionsContainerMarginRight,
  ]);

  const reactionList = React.useMemo(() => {
    if (Object.keys(reactions).length === 0) {
      return null;
    }

    return Object.keys(reactions).map(reaction => {
      const reactionInfo = reactions[reaction];
      const numOfReacts = reactionInfo.users.length;

      const style = reactionInfo.viewerReacted
        ? [...reactionStyle, styles.reactionsContainerSelected]
        : reactionStyle;

      return (
        <GestureTouchableOpacity
          style={style}
          onPress={() => onPressReaction(reaction)}
          onLongPress={onLongPressReaction}
          activeOpacity={0.7}
          key={reaction}
        >
          <Text
            style={[styles.reaction, styles.reactionColor]}
          >{`${reaction} ${numOfReacts}`}</Text>
        </GestureTouchableOpacity>
      );
    });
  }, [
    onLongPressReaction,
    onPressReaction,
    reactionStyle,
    reactions,
    styles.reaction,
    styles.reactionColor,
    styles.reactionsContainerSelected,
  ]);

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
  dummyInlineEngagement: {
    marginRight: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: inlineEngagementStyle.marginTop,
  },
  dummySidebar: {
    paddingRight: 8,
    // 14 (icon) + 4 (marginRight of icon) + 8 (original left padding)
    paddingLeft: 26,
    marginRight: 4,
  },
  sidebarColor: {
    backgroundColor: 'inlineEngagementBackground',
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
    fontSize: 14,
    lineHeight: 22,
  },
  repliesTextColor: {
    color: 'inlineEngagementLabel',
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  reactionsContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: inlineEngagementStyle.marginTop,
  },
  dummyReactionContainer: {
    marginRight: 4,
  },
  reactionsContainerColor: {
    backgroundColor: 'inlineEngagementBackground',
  },
  reactionsContainerSelected: {
    borderWidth: 1,
    borderColor: 'inlineEngagementLabel',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  reactionsContainerMarginLeft: {
    marginLeft: 4,
  },
  reactionsContainerMarginRight: {
    marginRight: 4,
  },
  reaction: {
    fontSize: 14,
    lineHeight: 22,
  },
  reactionColor: {
    color: 'inlineEngagementLabel',
  },
  messageLabel: {
    paddingHorizontal: 3,
    fontSize: 13,
    top: inlineEngagementLabelStyle.topOffset,
    height: inlineEngagementLabelStyle.height,
    marginTop: inlineEngagementStyle.marginTop,
  },
  dummyMessageLabel: {
    marginLeft: 9,
    marginRight: 4,
  },
  messageLabelColor: {
    color: 'messageLabel',
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
          messageInfo={item.messageInfo}
          threadInfo={item.threadInfo}
          sidebarThreadInfo={item.threadCreatedFromMessage}
          reactions={item.reactions}
          disabled
        />
      </Animated.View>
    </Animated.View>
  );
}

export { InlineEngagement, TooltipInlineEngagement, DummyInlineEngagementNode };
