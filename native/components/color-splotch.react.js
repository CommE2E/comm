// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';
import { SquircleView } from 'react-native-figma-squircle';

type Props = {
  +color: string,
  +size?: 'large' | 'small' | 'profile' | 'micro',
};
function ColorSplotch(props: Props): React.Node {
  const { color, size } = props;

  const style = React.useMemo(() => {
    if (size === 'profile') {
      return styles.profile;
    } else if (size === 'micro') {
      return styles.micro;
    }
    return styles.large;
  }, [size]);

  const squircleParams = React.useMemo(
    () => ({
      cornerSmoothing: 0.95,
      cornerRadius: 10,
      fillColor: `#${color}`,
    }),
    [color],
  );

  const colorSplotch = React.useMemo(
    () => <SquircleView style={style} squircleParams={squircleParams} />,
    [squircleParams, style],
  );

  return colorSplotch;
}

const styles = StyleSheet.create({
  large: {
    height: 25,
    width: 25,
  },
  micro: {
    height: 6,
    width: 6,
  },
  profile: {
    height: 36,
    width: 36,
  },
});

export default ColorSplotch;
