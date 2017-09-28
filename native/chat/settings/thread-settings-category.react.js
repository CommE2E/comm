// @flow

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Props = {|
  type: "full" | "outline",
  title: string,
  children?: React.Element<*>,
|};
function ThreadSettingsCategory(props: Props) {
  const contentStyle = props.type === "full"
    ? styles.fullContent
    : styles.outlineContent;
  return (
    <View style={styles.category}>
      <Text style={styles.title}>
        {props.title.toUpperCase()}
      </Text>
      <View style={contentStyle}>
        {props.children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  category: {
    marginVertical: 12,
  },
  title: {
    paddingLeft: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
  },
  fullContent: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    paddingHorizontal: 24,
    paddingVertical: 6,
    backgroundColor: "white",
  },
  outlineContent: {
  },
});

export default ThreadSettingsCategory;
