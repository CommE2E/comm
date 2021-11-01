// @flow

import * as React from 'react';
import { View, Text, ScrollView, Platform } from 'react-native';

import SWMansionIcon from '../components/swmansion-icon.react';
import { useStyles } from '../themes/colors';

const CheckIcon = () => (
  <SWMansionIcon
    name="check"
    size={20}
    color="#888888"
    style={unboundStyles.icon}
  />
);

// eslint-disable-next-line no-unused-vars
function DefaultNotificationsPreferences(props: { ... }): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContentContainer}
      style={styles.scrollView}
    >
      <Text style={styles.header}>NOTIFICATIONS</Text>
      <View style={styles.section}>
        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>All</Text>
          <CheckIcon />
        </View>

        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Background</Text>
        </View>

        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>None</Text>
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
  icon: {
    lineHeight: Platform.OS === 'ios' ? 18 : 20,
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

export default DefaultNotificationsPreferences;
