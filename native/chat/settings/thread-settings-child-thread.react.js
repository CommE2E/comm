// @flow

import * as React from 'react';
import { View, Platform } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types';

import Button from '../../components/button.react';
import ColorSplotch from '../../components/color-splotch.react';
import { SingleLine } from '../../components/single-line.react';
import ThreadIcon from '../../components/thread-icon.react';
import { MessageListRouteName } from '../../navigation/route-names';
import { useColors, useStyles } from '../../themes/colors';
import type { ThreadSettingsNavigate } from './thread-settings.react';

type Props = {|
  +threadInfo: ThreadInfo,
  +navigate: ThreadSettingsNavigate,
  +firstListItem: boolean,
  +lastListItem: boolean,
|};
function ThreadSettingsChildThread(props: Props) {
  const { navigate, threadInfo } = props;
  const onPress = React.useCallback(() => {
    navigate({
      name: MessageListRouteName,
      params: { thread: { threadInfo } },
      key: `${MessageListRouteName}${threadInfo.id}`,
    });
  }, [navigate, threadInfo]);

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const firstItem = props.firstListItem ? null : styles.topBorder;
  const lastItem = props.lastListItem ? styles.lastButton : null;
  return (
    <View style={styles.container}>
      <Button onPress={onPress} style={[styles.button, firstItem, lastItem]}>
        <View style={styles.leftSide}>
          <ColorSplotch color={threadInfo.color} />
          <SingleLine style={styles.text}>{threadInfo.uiName}</SingleLine>
        </View>
        <ThreadIcon
          threadType={threadInfo.type}
          color={colors.panelForegroundSecondaryLabel}
        />
      </Button>
    </View>
  );
}

const unboundStyles = {
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 8,
    paddingLeft: 12,
    paddingRight: 10,
    alignItems: 'center',
  },
  topBorder: {
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
  },
  container: {
    backgroundColor: 'panelForeground',
    flex: 1,
    paddingHorizontal: 12,
  },
  lastButton: {
    paddingBottom: Platform.OS === 'ios' ? 12 : 10,
    paddingTop: 8,
  },
  leftSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    color: 'link',
    fontSize: 16,
    paddingLeft: 8,
  },
};

export default ThreadSettingsChildThread;
