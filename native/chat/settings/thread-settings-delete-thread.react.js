// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types';

import Button from '../../components/button.react';
import { DeleteThreadRouteName } from '../../navigation/route-names';
import { useColors, useStyles } from '../../themes/colors';
import type { ViewStyle } from '../../types/styles';
import type { ThreadSettingsNavigate } from './thread-settings.react';

type Props = {
  +threadInfo: ThreadInfo,
  +navigate: ThreadSettingsNavigate,
  +buttonStyle: ViewStyle,
};
function ThreadSettingsDeleteThread(props: Props): React.Node {
  const { navigate, threadInfo } = props;
  const onPress = React.useCallback(() => {
    navigate<'DeleteThread'>({
      name: DeleteThreadRouteName,
      params: { threadInfo },
      key: `${DeleteThreadRouteName}${threadInfo.id}`,
    });
  }, [navigate, threadInfo]);

  const colors = useColors();
  const { panelIosHighlightUnderlay } = colors;

  const styles = useStyles(unboundStyles);
  return (
    <View style={styles.container}>
      <Button
        onPress={onPress}
        style={[styles.button, props.buttonStyle]}
        iosFormat="highlight"
        iosHighlightUnderlayColor={panelIosHighlightUnderlay}
      >
        <Text style={styles.text}>Delete chat...</Text>
      </Button>
    </View>
  );
}

const unboundStyles = {
  button: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
