// @flow

import * as React from 'react';
import {
  Text,
  StyleSheet,
} from 'react-native';

import { longAbsoluteDate } from 'lib/utils/date-utils';

type Props = {|
  time: number,
  color: 'light' | 'dark',
|};
function Timestamp(props: Props) {
  const style = props.color === 'light'
    ? [ styles.timestamp, styles.light ]
    : [ styles.timestamp, styles.dark ];
  return (
    <Text style={style} numberOfLines={1}>
      {longAbsoluteDate(props.time).toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  timestamp: {
    fontSize: 14,
    paddingVertical: 3,
    alignSelf: 'center',
    height: 26,
  },
  dark: {
    color: '#777777',
  },
  light: {
    color: 'white',
  },
});

export default Timestamp;
