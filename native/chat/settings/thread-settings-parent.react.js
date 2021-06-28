// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import { type ThreadInfo } from 'lib/types/thread-types';

import Button from '../../components/button.react';
import ThreadPill from '../../components/thread-pill.react';
import { MessageListRouteName } from '../../navigation/route-names';
import { useStyles } from '../../themes/colors';
import type { ThreadSettingsNavigate } from './thread-settings.react';

type Props = {|
  +threadInfo: ThreadInfo,
  +parentThreadInfo: ?ThreadInfo,
  +navigate: ThreadSettingsNavigate,
|};
function ThreadSettingsParent(props: Props): React.Node {
  const { threadInfo, parentThreadInfo, navigate } = props;
  const styles = useStyles(unboundStyles);

  const onPressParentThread = React.useCallback(() => {
    invariant(parentThreadInfo, 'should be set');
    navigate({
      name: MessageListRouteName,
      params: { threadInfo: parentThreadInfo },
      key: `${MessageListRouteName}${parentThreadInfo.id}`,
    });
  }, [parentThreadInfo, navigate]);

  let parent;
  if (parentThreadInfo) {
    parent = (
      <Button onPress={onPressParentThread}>
        <ThreadPill threadInfo={parentThreadInfo} />
      </Button>
    );
  } else if (threadInfo.parentThreadID) {
    parent = (
      <Text
        style={[styles.currentValue, styles.currentValueText, styles.noParent]}
        numberOfLines={1}
      >
        Secret parent
      </Text>
    );
  } else {
    parent = (
      <Text
        style={[styles.currentValue, styles.currentValueText, styles.noParent]}
        numberOfLines={1}
      >
        No parent
      </Text>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.label} numberOfLines={1}>
        Parent
      </Text>
      {parent}
    </View>
  );
}

const unboundStyles = {
  currentValue: {
    flex: 1,
  },
  currentValueText: {
    color: 'panelForegroundSecondaryLabel',
    fontFamily: 'Arial',
    fontSize: 16,
    margin: 0,
    paddingRight: 0,
  },
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    width: 96,
  },
  noParent: {
    fontStyle: 'italic',
    paddingLeft: 2,
  },
  row: {
    backgroundColor: 'panelForeground',
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 4,
    alignItems: 'center',
  },
};

export default React.memo<Props>(ThreadSettingsParent);
