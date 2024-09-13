// @flow

import * as React from 'react';
import { Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import type { ThreadType } from 'lib/types/thread-types-enum.js';

import { useNavigateToThread } from './message-list-types.js';
import Button from '../components/button.react.js';
import CommunityPill from '../components/community-pill.react.js';
import ThreadVisibility from '../components/thread-visibility.react.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +parentThreadInfo?: ThreadInfo,
  +childThreadType: ThreadType,
};
function ParentThreadHeader(props: Props): React.Node {
  const colors = useColors();
  const threadVisibilityColor = colors.modalForegroundLabel;
  const styles = useStyles(unboundStyles);

  const { parentThreadInfo, childThreadType } = props;

  const navigateToThread = useNavigateToThread();
  const onPressParentThread = React.useCallback(() => {
    if (!parentThreadInfo) {
      return;
    }
    navigateToThread({ threadInfo: parentThreadInfo });
  }, [parentThreadInfo, navigateToThread]);

  let parentThreadButton;
  if (parentThreadInfo) {
    parentThreadButton = (
      <>
        <Text style={styles.within}>within</Text>
        <Button onPress={onPressParentThread}>
          <CommunityPill community={parentThreadInfo} />
        </Button>
      </>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsHorizontalScrollIndicator={false}
        horizontal={true}
      >
        <ThreadVisibility
          threadType={childThreadType}
          color={threadVisibilityColor}
        />
        {parentThreadButton}
      </ScrollView>
    </View>
  );
}

const height = 48;
const unboundStyles = {
  container: {
    height,
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderBottomColor: 'panelForegroundBorder',
  },
  contentContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  within: {
    color: 'modalSubtextLabel',
    fontSize: 16,
    paddingHorizontal: 6,
  },
};

export default ParentThreadHeader;
