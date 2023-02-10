// @flow

import Icon from '@expo/vector-icons/FontAwesome5.js';
import * as React from 'react';
import { Text, View } from 'react-native';

import { useAncestorThreads } from 'lib/shared/ancestor-threads.js';
import { type ThreadInfo } from 'lib/types/thread-types.js';
import { useResolvedThreadInfos } from 'lib/utils/entity-helpers.js';

import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +threadInfo: ThreadInfo,
};
function ThreadAncestorsLabel(props: Props): React.Node {
  const { threadInfo } = props;
  const { unread } = threadInfo.currentUser;
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const ancestorThreads = useAncestorThreads(threadInfo);
  const resolvedAncestorThreads = useResolvedThreadInfos(ancestorThreads);

  const chevronIcon = React.useMemo(
    () => (
      <Icon
        name="chevron-right"
        size={8}
        color={colors.listForegroundTertiaryLabel}
      />
    ),
    [colors.listForegroundTertiaryLabel],
  );

  const ancestorPath = React.useMemo(() => {
    const path = [];
    for (const thread of resolvedAncestorThreads) {
      path.push(<Text key={thread.id}>{thread.uiName}</Text>);
      path.push(
        <View key={`>${thread.id}`} style={styles.chevron}>
          {chevronIcon}
        </View>,
      );
    }
    path.pop();
    return path;
  }, [resolvedAncestorThreads, chevronIcon, styles.chevron]);

  const ancestorPathStyle = React.useMemo(() => {
    return unread ? [styles.pathText, styles.unread] : styles.pathText;
  }, [styles.pathText, styles.unread, unread]);

  return (
    <Text numberOfLines={1} style={ancestorPathStyle}>
      {ancestorPath}
    </Text>
  );
}

const unboundStyles = {
  pathText: {
    opacity: 0.8,
    fontSize: 12,
    color: 'listForegroundTertiaryLabel',
  },
  unread: {
    color: 'listForegroundLabel',
  },
  chevron: {
    paddingHorizontal: 3,
  },
};

export default ThreadAncestorsLabel;
