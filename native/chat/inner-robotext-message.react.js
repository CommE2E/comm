// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, TouchableWithoutFeedback, View } from 'react-native';

import type { ReactionInfo } from 'lib/selectors/chat-selectors.js';
import { threadInfoSelector } from 'lib/selectors/thread-selectors.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import {
  type EntityText,
  entityTextToRawString,
  entityTextToReact,
  useResolvedEntityText,
} from 'lib/utils/entity-text.js';

import { DummyInlineEngagementNode } from './inline-engagement.react.js';
import { useNavigateToThread } from './message-list-types.js';
import Markdown from '../markdown/markdown.react.js';
import { inlineMarkdownRules } from '../markdown/rules.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useOverlayStyles } from '../themes/colors.js';
import type { ChatRobotextMessageInfoItemWithHeight } from '../types/chat-types.js';
import { useNavigateToUserProfileBottomSheet } from '../user-profile/user-profile-utils.js';

function dummyNodeForRobotextMessageHeightMeasurement(
  robotext: EntityText,
  threadID: string,
  sidebarInfo: ?ThreadInfo,
  reactions: ReactionInfo,
): React.Element<typeof View> {
  return (
    <View>
      <View style={unboundStyles.robotextContainer}>
        <Text style={unboundStyles.dummyRobotext}>
          {entityTextToRawString(robotext, { threadID })}
        </Text>
      </View>
      <DummyInlineEngagementNode
        sidebarInfo={sidebarInfo}
        reactions={reactions}
        deleted={false}
      />
    </View>
  );
}

type InnerRobotextMessageProps = {
  +item: ChatRobotextMessageInfoItemWithHeight,
  +onPress: () => void,
  +onLongPress?: () => void,
};
function InnerRobotextMessage(props: InnerRobotextMessageProps): React.Node {
  const { item, onLongPress, onPress } = props;
  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const styles = useOverlayStyles(unboundStyles);

  const { messageInfos, robotext } = item;
  const { threadID } = messageInfos[0];
  const resolvedRobotext = useResolvedEntityText(robotext);
  invariant(
    resolvedRobotext,
    'useResolvedEntityText only returns falsey when passed falsey',
  );
  const textParts = React.useMemo(() => {
    const darkColor = activeTheme === 'dark';
    return entityTextToReact(resolvedRobotext, threadID, {
      renderText: ({ text }) => (
        <Markdown
          style={styles.robotext}
          rules={inlineMarkdownRules(darkColor)}
        >
          {text}
        </Markdown>
      ),
      renderThread: ({ id, name }) => <ThreadEntity id={id} name={name} />,
      renderUser: ({ userID, usernameText }) => (
        <UserEntity userID={userID} usernameText={usernameText} />
      ),
      renderColor: ({ hex }) => <ColorEntity color={hex} />,
      renderFarcasterUser: ({ farcasterUsername }) => (
        <Text>{farcasterUsername}</Text>
      ),
    });
  }, [resolvedRobotext, activeTheme, threadID, styles.robotext]);

  return (
    <TouchableWithoutFeedback onPress={onPress} onLongPress={onLongPress}>
      <View style={styles.robotextContainer}>
        <Text style={styles.robotext}>{textParts}</Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

type ThreadEntityProps = {
  +id: string,
  +name: string,
};
function ThreadEntity(props: ThreadEntityProps) {
  const threadID = props.id;
  const threadInfo = useSelector(state => threadInfoSelector(state)[threadID]);

  const styles = useOverlayStyles(unboundStyles);

  const navigateToThread = useNavigateToThread();
  const onPressThread = React.useCallback(() => {
    invariant(threadInfo, 'onPressThread should have threadInfo');
    navigateToThread({ threadInfo });
  }, [threadInfo, navigateToThread]);

  if (!threadInfo) {
    return <Text>{props.name}</Text>;
  }
  return (
    <Text style={styles.link} onPress={onPressThread}>
      {props.name}
    </Text>
  );
}

type UserEntityProps = {
  +userID: string,
  +usernameText: string,
};
function UserEntity(props: UserEntityProps) {
  const { userID, usernameText } = props;

  const styles = useOverlayStyles(unboundStyles);

  const navigateToUserProfileBottomSheet =
    useNavigateToUserProfileBottomSheet();

  const onPressUser = React.useCallback(
    () => navigateToUserProfileBottomSheet(userID),
    [navigateToUserProfileBottomSheet, userID],
  );

  return (
    <Text style={styles.link} onPress={onPressUser}>
      {usernameText}
    </Text>
  );
}

function ColorEntity(props: { +color: string }) {
  const colorStyle = { color: props.color };
  return <Text style={colorStyle}>{props.color}</Text>;
}

const unboundStyles = {
  link: {
    color: 'link',
  },
  robotextContainer: {
    paddingTop: 6,
    paddingBottom: 11,
    paddingHorizontal: 24,
  },
  robotext: {
    color: 'listForegroundSecondaryLabel',
    fontFamily: 'Arial',
    fontSize: 15,
    textAlign: 'center',
  },
  dummyRobotext: {
    fontFamily: 'Arial',
    fontSize: 15,
    textAlign: 'center',
  },
};

const MemoizedInnerRobotextMessage: React.ComponentType<InnerRobotextMessageProps> =
  React.memo<InnerRobotextMessageProps>(InnerRobotextMessage);

export {
  dummyNodeForRobotextMessageHeightMeasurement,
  MemoizedInnerRobotextMessage as InnerRobotextMessage,
};
