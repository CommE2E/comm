// @flow

import * as React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

type Props = {|
  title: ?string,
  message: string,
|};
function InAppNotif(props: Props) {
  const title = props.title
    ? <Text style={styles.title}>{props.title}{"\n"}</Text>
    : null;
  return (
    <View style={styles.notif}>
      <Text style={styles.text}>
        {title}
        {props.message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notif: {
    textAlign: 'left',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
    width: '100%',
  },
  text: {
    ...Platform.select({
      ios: {
        fontSize: 16,
        marginTop: 16,
        marginBottom: 6,
        color: 'black',
      },
      default: {
        fontSize: 18,
        marginVertical: 16,
      },
    }),
    marginHorizontal: 10,
  },
  title: {
    color: 'black',
    fontWeight: 'bold',
  },
});

export default InAppNotif;
