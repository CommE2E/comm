// @flow

import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import tinycolor from 'tinycolor2';

import { threadLabel } from 'lib/shared/thread-utils.js';
import type { ThreadType } from 'lib/types/thread-types.js';

import Pill from './pill.react.js';
import ThreadIcon from './thread-icon.react.js';

type Props = {
  +threadType: ThreadType,
  +color: string,
};
function ThreadVisibility(props: Props): React.Node {
  const { threadType, color } = props;
  const label = threadLabel(threadType);

  const iconColor = React.useMemo(
    () => (tinycolor(color).isDark() ? 'white' : 'black'),
    [color],
  );

  const icon = React.useMemo(
    () => <ThreadIcon threadType={threadType} color={iconColor} />,
    [iconColor, threadType],
  );

  return (
    <View style={styles.container}>
      <Pill icon={icon} label={label} backgroundColor={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});

export default ThreadVisibility;
