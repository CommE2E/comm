// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import tinycolor from 'tinycolor2';

import { useStyles } from '../themes/colors';

type Props = {
  +label: string,
  +backgroundColor: string,
  +icon?: React.Node,
  +roundCorners?: { +left: boolean, +right: boolean },
  +fontSize?: number,
};
function Pill(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const roundLeft = props.roundCorners?.left ?? true;
  const roundRight = props.roundCorners?.right ?? true;

  const variableContainerStyles = React.useMemo(() => {
    return {
      backgroundColor: props.backgroundColor,
      borderBottomLeftRadius: roundLeft ? 8 : 0,
      borderTopLeftRadius: roundLeft ? 8 : 0,
      borderTopRightRadius: roundRight ? 8 : 0,
      borderBottomRightRadius: roundRight ? 8 : 0,
    };
  }, [props.backgroundColor, roundLeft, roundRight]);

  const combinedContainerStyles = React.useMemo(
    () => [styles.container, variableContainerStyles],
    [styles.container, variableContainerStyles],
  );

  const textColor = React.useMemo(
    () => (tinycolor(props.backgroundColor).isDark() ? 'white' : 'black'),
    [props.backgroundColor],
  );

  const fontSize = props.fontSize ?? 16;

  const combinedTextStyles = React.useMemo(
    () => [styles.label, { color: textColor, fontSize }],
    [fontSize, styles.label, textColor],
  );

  const icon = props.icon ? (
    <View style={styles.icon}>{props.icon}</View>
  ) : undefined;

  return (
    <View style={combinedContainerStyles}>
      {icon}
      <Text numberOfLines={1} style={combinedTextStyles}>
        {props.label}
      </Text>
    </View>
  );
}

const unboundStyles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  label: {
    fontWeight: 'bold',
  },
  icon: {
    paddingRight: 6,
  },
};

export default Pill;
