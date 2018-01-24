// @flow

import * as React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import invariant from 'invariant';

export type CategoryType = "full" | "outline" | "unpadded";
type HeaderProps = {|
  type: CategoryType,
  title: string,
|};
function ThreadSettingsCategoryHeader(props: HeaderProps) {
  let contentStyle, paddingStyle;
  if (props.type === "full") {
    contentStyle = styles.fullHeader;
    paddingStyle = styles.fullHeaderPadding;
  } else if (props.type === "outline") {
  } else if (props.type === "unpadded") {
    contentStyle = styles.fullHeader;
  } else {
    invariant(false, "invalid ThreadSettingsCategory type");
  }
  return (
    <View>
      <View style={[ styles.header, contentStyle ]}>
        <Text style={styles.title}>
          {props.title.toUpperCase()}
        </Text>
      </View>
      <View style={paddingStyle} />
    </View>
  );
}

type FooterProps = {|
  type: CategoryType,
|};
function ThreadSettingsCategoryFooter(props: FooterProps) {
  let contentStyle, paddingStyle;
  if (props.type === "full") {
    contentStyle = styles.fullFooter;
    paddingStyle = styles.fullFooterPadding;
  } else if (props.type === "outline") {
  } else if (props.type === "unpadded") {
    contentStyle = styles.fullFooter;
    paddingStyle = styles.unpaddedFooterPadding;
  } else {
    invariant(false, "invalid ThreadSettingsCategory type");
  }
  return (
    <View>
      <View style={paddingStyle} />
      <View style={[ styles.footer, contentStyle ]} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 16,
  },
  footer: {
    marginBottom: 16,
  },
  title: {
    paddingLeft: 24,
    paddingBottom: 3,
    fontSize: 12,
    fontWeight: "400",
    color: "#888888",
  },
  fullHeader: {
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
  },
  fullHeaderPadding: {
    backgroundColor: "white",
    height: 6,
  },
  fullFooter: {
    borderTopWidth: 1,
    borderColor: "#CCCCCC",
  },
  fullFooterPadding: {
    backgroundColor: "white",
    height: 6,
  },
  unpaddedFooterPadding: {
    backgroundColor: "white",
    height: 4,
  },
});

export {
  ThreadSettingsCategoryHeader,
  ThreadSettingsCategoryFooter,
};
