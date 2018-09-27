// @flow

import React from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';

import { persistConfig, codeVersion } from '../persist';

type Props = {|
|};
class BuildInfo extends React.PureComponent<Props> {

  static navigationOptions = {
    headerTitle: "Build info",
  };

  render() {
    return (
      <ScrollView contentContainerStyle={styles.scrollView}>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Release</Text>
            <Text style={styles.releaseText}>ALPHA</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Code version</Text>
            <Text style={styles.text}>{codeVersion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>State version</Text>
            <Text style={styles.text}>{persistConfig.version}</Text>
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.thanksText}>
              Thank you for helping to test the alpha!
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

}

const styles = StyleSheet.create({
  scrollView: {
    paddingTop: 24,
  },
  section: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#CCCCCC",
    paddingVertical: 6,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  label: {
    fontSize: 16,
    color: "#888888",
    paddingRight: 12,
  },
  releaseText: {
    fontSize: 16,
    color: 'red',
  },
  text: {
    fontSize: 16,
    color: 'black',
  },
  thanksText: {
    flex: 1,
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
  },
});

export default BuildInfo;
