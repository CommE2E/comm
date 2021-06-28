// @flow

import * as React from 'react';
import { View, Text } from 'react-native';

import type { ThreadInfo, ThreadType } from 'lib/types/thread-types';

import Button from '../components/button.react';
import CommunityPill from '../components/community-pill.react';
import ThreadVisibility from '../components/thread-visibility.react';
import { useColors, useStyles } from '../themes/colors';
import { useNavigateToThread } from './message-list-types';

type Props = {|
  +parentThreadInfo: ThreadInfo,
  +childThreadType: ThreadType,
|};
function ParentThreadHeader(props: Props): React.Node {
  const colors = useColors();
  const threadVisibilityColor = colors.modalForegroundLabel;
  const styles = useStyles(unboundStyles);

  const { parentThreadInfo, childThreadType } = props;

  const navigateToThread = useNavigateToThread();
  const onPressParentThread = React.useCallback(() => {
    navigateToThread({ threadInfo: parentThreadInfo });
  }, [parentThreadInfo, navigateToThread]);

  return (
    <View style={styles.parentThreadRow}>
      <ThreadVisibility
        threadType={childThreadType}
        color={threadVisibilityColor}
      />
      <Text style={styles.parentThreadLabel}>within</Text>
      <Button onPress={onPressParentThread}>
        <CommunityPill community={parentThreadInfo} />
      </Button>
    </View>
  );
}

const unboundStyles = {
  parentThreadRow: {
    alignItems: 'center',
    backgroundColor: 'modalSubtext',
    flexDirection: 'row',
    paddingLeft: 12,
    paddingVertical: 6,
  },
  parentThreadLabel: {
    color: 'modalSubtextLabel',
    fontSize: 16,
    paddingHorizontal: 6,
  },
  parentThreadName: {
    color: 'modalForegroundLabel',
    fontSize: 16,
    paddingLeft: 6,
  },
};

export default ParentThreadHeader;
