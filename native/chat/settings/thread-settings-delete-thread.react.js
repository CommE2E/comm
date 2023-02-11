// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import type { ResolvedThreadInfo } from 'lib/types/thread-types.js';

import Button from '../../components/button.react.js';
import { DeleteThreadRouteName } from '../../navigation/route-names.js';
import { useColors, useStyles } from '../../themes/colors.js';
import type { ViewStyle } from '../../types/styles.js';
import type { ThreadSettingsNavigate } from './thread-settings.react.js';

type Props = {
  +threadInfo: ResolvedThreadInfo,
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
