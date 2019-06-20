// @flow

import * as React from 'react';
import {
  Text,
  StyleSheet,
} from 'react-native';

import { longAbsoluteDate } from 'lib/utils/date-utils';

type Props = {|
  time: number,
|};
function Timestamp(props: Props) {
  return (
    <Text style={styles.conversationHeader} numberOfLines={1}>
      {longAbsoluteDate(props.time).toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  conversationHeader: {
    color: '#777777',
    fontSize: 14,
    paddingTop: 1,
    paddingBottom: 7,
    alignSelf: 'center',
    height: 26,
  },
});

export default Timestamp;
