// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { useStyles } from '../themes/colors.js';
import ToggleReport from './toggle-report.react.js';

// eslint-disable-next-line no-unused-vars
function PrivacyPreferences(props: { ... }): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContentContainer}
      style={styles.scrollView}
    >
      <Text style={styles.header}>REPORTS</Text>
      <View style={styles.section}>
        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Toggle crash reports</Text>
          <ToggleReport reportType="crashReports" />
        </View>

        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Toggle media reports</Text>
          <ToggleReport reportType="mediaReports" />
        </View>

        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Toggle inconsistency reports</Text>
          <ToggleReport reportType="inconsistencyReports" />
        </View>
      </View>
    </ScrollView>
  );
}

const unboundStyles = {
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
    marginVertical: 2,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submenuText: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
  },
};

export default PrivacyPreferences;
