// @flow

import Icon from '@expo/vector-icons/FontAwesome5';
import * as React from 'react';
import { Text, View } from 'react-native';

import { useAncestorThreads } from 'lib/shared/ancestor-threads';
import { type ThreadInfo } from 'lib/types/thread-types';

import { useColors, useStyles } from '../themes/colors';

type Props = {
  +threadInfo: ThreadInfo,
};
function ThreadAncestorsLabel(props: Props): React.Node {
  const { threadInfo } = props;
  const { unread } = threadInfo.currentUser;
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const ancestorThreads = useAncestorThreads(threadInfo);

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
    for (const thread of ancestorThreads) {
      path.push(<Text key={thread.id}>{thread.uiName}</Text>);
      path.push(
        <View key={`>${thread.id}`} style={styles.chevron}>
          {chevronIcon}
        </View>,
      );
    }
    path.pop();
    return path;
  }, [ancestorThreads, chevronIcon, styles.chevron]);

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
