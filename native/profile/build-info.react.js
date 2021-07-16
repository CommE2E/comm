// @flow

import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';

import { persistConfig, codeVersion } from '../redux/persist';
import { useStyles } from '../themes/colors';

// eslint-disable-next-line no-unused-vars
function BuildInfo(props: { ... }): React.Node {
  const styles = useStyles(unboundStyles);
  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContentContainer}
      style={styles.scrollView}
    >
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

const unboundStyles = {
  label: {
    color: 'panelForegroundTertiaryLabel',
    fontSize: 16,
    paddingRight: 12,
  },
  releaseText: {
    color: 'redText',
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingHorizontal: 24,
    paddingVertical: 6,
  },
  text: {
    color: 'panelForegroundLabel',
    fontSize: 16,
  },
  thanksText: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
    textAlign: 'center',
  },
};

export default BuildInfo;
