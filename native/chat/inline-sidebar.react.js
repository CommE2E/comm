// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

import { relativeMemberInfoSelectorForMembersOfThread } from 'lib/selectors/user-selectors';
import { stringForUser } from 'lib/shared/user-utils';
import type { ThreadInfo } from 'lib/types/thread-types';
import { pluralizeAndTrim } from 'lib/utils/text-utils';

import Button from '../components/button.react';
import { useSelector } from '../redux/redux-utils';
import { useStyles } from '../themes/colors';
import { useNavigateToThread } from './message-list-types';

type Props = {
  +threadInfo: ThreadInfo,
  +positioning: 'left' | 'center' | 'right',
};
function InlineSidebar(props: Props): React.Node {
  const { threadInfo } = props;

  const navigateToThread = useNavigateToThread();
  const onPress = React.useCallback(() => {
    navigateToThread({ threadInfo });
  }, [navigateToThread, threadInfo]);

  const styles = useStyles(unboundStyles);
  let viewerIcon, nonViewerIcon, alignStyle;
  if (props.positioning === 'right') {
    viewerIcon = <Icon name="corner-down-left" size={18} style={styles.icon} />;
    alignStyle = styles.rightAlign;
  } else if (props.positioning === 'left') {
    nonViewerIcon = (
      <Icon name="corner-down-right" size={18} style={styles.icon} />
    );
    alignStyle = styles.leftAlign;
  } else {
    nonViewerIcon = (
      <Icon name="corner-down-right" size={18} style={styles.icon} />
    );
    alignStyle = styles.centerAlign;
  }

  const unreadStyle = threadInfo.currentUser.unread ? styles.unread : null;
  const repliesCount = threadInfo.repliesCount || 1;
  const repliesText = `${repliesCount} ${
    repliesCount > 1 ? 'replies' : 'reply'
  }`;

  const threadMembers = useSelector(
    relativeMemberInfoSelectorForMembersOfThread(threadInfo.id),
  );
  const sendersText = React.useMemo(() => {
    const senders = threadMembers
      .filter(member => member.isSender)
      .map(stringForUser);
    return senders.length > 0 ? `${pluralizeAndTrim(senders, 25)} sent ` : '';
  }, [threadMembers]);

  return (
    <View style={[styles.content, alignStyle]}>
      <Button style={styles.sidebar} onPress={onPress}>
        {nonViewerIcon}
        <Text style={[styles.name, unreadStyle]}>
          {sendersText}
          {repliesText}
        </Text>
        {viewerIcon}
      </Button>
    </View>
  );
}

const inlineSidebarHeight = 20;
const inlineSidebarMarginTop = 5;
const inlineSidebarMarginBottom = 3;

const unboundStyles = {
  content: {
    flexDirection: 'row',
    marginRight: 30,
    marginLeft: 10,
    flex: 1,
    height: inlineSidebarHeight,
  },
  unread: {
    color: 'listForegroundLabel',
    fontWeight: 'bold',
  },
  sidebar: {
    flexDirection: 'row',
    display: 'flex',
    alignItems: 'center',
  },
  icon: {
    color: 'listForegroundTertiaryLabel',
  },
  name: {
    paddingTop: 1,
    color: 'listForegroundTertiaryLabel',
    fontSize: 16,
    paddingLeft: 4,
    paddingRight: 2,
  },
  leftAlign: {
    justifyContent: 'flex-start',
  },
  rightAlign: {
    justifyContent: 'flex-end',
  },
  centerAlign: {
    justifyContent: 'center',
  },
};

export {
  InlineSidebar,
  inlineSidebarHeight,
  inlineSidebarMarginTop,
  inlineSidebarMarginBottom,
};
