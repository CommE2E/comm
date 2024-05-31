// @flow

import * as React from 'react';
import { Text } from 'react-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';

import Button from '../components/button.react.js';
import { useStyles } from '../themes/colors.js';
import { AnimatedView } from '../types/styles.js';

type Props = {
  +onSave: () => void,
  +disabled: boolean,
};
function CalendarInputBar(props: Props): React.Node {
  const styles = useStyles(unboundStyles);
  const inactiveStyle = props.disabled ? styles.inactiveContainer : undefined;
  const style = React.useMemo(
    () => [styles.container, inactiveStyle],
    [styles.container, inactiveStyle],
  );
  return (
    <AnimatedView
      style={style}
      pointerEvents={props.disabled ? 'none' : 'auto'}
      entering={FadeIn}
      exiting={FadeOut}
    >
      <Button onPress={props.onSave} iosActiveOpacity={0.5}>
        <Text style={styles.saveButtonText}>Save</Text>
      </Button>
    </AnimatedView>
  );
}

const unboundStyles = {
  container: {
    alignItems: 'flex-end',
    backgroundColor: 'listInputBar',
  },
  inactiveContainer: {
    opacity: 0,
    height: 0,
  },
  saveButtonText: {
    color: 'link',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 5,
    padding: 8,
  },
};

export default CalendarInputBar;
