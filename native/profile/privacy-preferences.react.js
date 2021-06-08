// @flow

import * as React from 'react';
import { View, Text, ScrollView } from 'react-native';

import { useStyles } from '../themes/colors';
import ToggleCrashReports from './toggle-crash-reports.react';

function PrivacyPreferences(): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContentContainer}
      style={styles.scrollView}
    >
      <Text style={styles.header}>CRASH REPORTS</Text>
      <View style={styles.section}>
        <ToggleCrashReports />
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
};

export default PrivacyPreferences;
