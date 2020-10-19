// @flow

import type { ThreadInfo } from 'lib/types/thread-types';
import type { ThreadSettingsNavigate } from './thread-settings.react';

import * as React from 'react';
import { Text, View, Platform } from 'react-native';

import Button from '../../components/button.react';
import { DeleteThreadRouteName } from '../../navigation/route-names';
import { useColors, useStyles } from '../../themes/colors';

type Props = {|
  +threadInfo: ThreadInfo,
  +navigate: ThreadSettingsNavigate,
  +firstActionButton: boolean,
|};
function ThreadSettingsDeleteThread(props: Props) {
  const { navigate, threadInfo } = props;
  const onPress = React.useCallback(() => {
    navigate({
      name: DeleteThreadRouteName,
      params: { threadInfo },
      key: `${DeleteThreadRouteName}${threadInfo.id}`,
    });
  }, [navigate, threadInfo]);

  const styles = useStyles(unboundStyles);
  const borderStyle = props.firstActionButton ? null : styles.topBorder;

  const colors = useColors();
  const { panelIosHighlightUnderlay } = colors;

  return (
    <View style={styles.container}>
      <Button
        onPress={onPress}
        style={[styles.button, borderStyle]}
        iosFormat="highlight"
        iosHighlightUnderlayColor={panelIosHighlightUnderlay}
      >
        <Text style={styles.text}>Delete thread...</Text>
      </Button>
    </View>
  );
}

const unboundStyles = {
  topBorder: {
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
  },
  button: {
    flexDirection: 'row',
    paddingBottom: Platform.OS === 'ios' ? 14 : 12,
    paddingHorizontal: 12,
    paddingTop: 10,
  },
  container: {
    backgroundColor: 'panelForeground',
    paddingHorizontal: 12,
  },
  text: {
    color: 'redText',
    flex: 1,
    fontSize: 16,
  },
};

export default ThreadSettingsDeleteThread;
