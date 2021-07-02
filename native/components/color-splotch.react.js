// @flow

import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {|
  +color: string,
  +size?: 'large' | 'small' | 'profile' | 'micro',
|};
function ColorSplotch(props: Props) {
  const style = React.useMemo(() => {
    const baseStyles = [styles.splotch, { backgroundColor: `#${props.color}` }];
    if (props.size === 'small') {
      return [...baseStyles, styles.small];
    } else if (props.size === 'profile') {
      return [...baseStyles, styles.profile];
    } else if (props.size === 'micro') {
      return [...baseStyles, styles.micro];
    }
    return [...baseStyles, styles.large];
  }, [props.color, props.size]);

  return <View style={style} />;
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
  small: {
    height: 18,
    width: 18,
  },
  splotch: {
    borderRadius: 8,
  },
});

export default ColorSplotch;
