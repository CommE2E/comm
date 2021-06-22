// @flow

import React from 'react';
import { View, StyleSheet } from 'react-native';

type Props = {|
  +color: string,
  +size?: 'large' | 'small' | 'profile',
|};
function ColorSplotch(props: Props) {
  const style = React.useMemo(() => {
    const baseStyles = [styles.splotch, { backgroundColor: `#${props.color}` }];
    if (props.size === 'small') {
      return [...baseStyles, styles.small];
    } else if (props.size === 'profile') {
      return [...baseStyles, styles.profile];
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
  profile: {
    height: 48,
    width: 48,
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
