// @flow

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {|
  type: "full" | "outline" | "unpadded",
  title: string,
  children?: React.Element<*>,
|};
function ThreadSettingsCategory(props: Props) {
  return (
    <View style={styles.category}>
      <Text style={styles.title}>
        {props.title.toUpperCase()}
      </Text>
      <View style={styles[props.type]}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  category: {
    marginVertical: 16,
  },
  title: {
    paddingLeft: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
  },
  full: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    paddingHorizontal: 24,
    paddingVertical: 6,
    backgroundColor: "white",
  },
  unpadded: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    backgroundColor: "white",
  },
  outline: {
  },
});

export default ThreadSettingsCategory;
