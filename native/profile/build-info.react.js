// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { persistConfig, codeVersion } from '../redux/persist';
import { StaffContext } from '../staff/staff-context';
import { useStyles } from '../themes/colors';
import {
  isStaffRelease,
  useIsCurrentUserStaff,
  useStaffCanSee,
} from '../utils/staff-utils';

// eslint-disable-next-line no-unused-vars
function BuildInfo(props: { ... }): React.Node {
  const isCurrentUserStaff = useIsCurrentUserStaff();
  const { staffUserHasBeenLoggedIn } = React.useContext(StaffContext);
  const styles = useStyles(unboundStyles);
  const staffCanSee = useStaffCanSee();

  let staffCanSeeRows;
  if (staffCanSee || staffUserHasBeenLoggedIn) {
    staffCanSeeRows = (
      <>
        <View style={styles.row}>
          <Text style={styles.label}>__DEV__</Text>
          <Text style={styles.text}>{__DEV__ ? 'TRUE' : 'FALSE'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Staff Release</Text>
          <Text style={styles.text}>{isStaffRelease ? 'TRUE' : 'FALSE'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>isCurrentUserStaff</Text>
          <Text style={styles.text}>
            {isCurrentUserStaff ? 'TRUE' : 'FALSE'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>hasStaffUserLoggedIn</Text>
          <Text style={styles.text}>
            {staffUserHasBeenLoggedIn ? 'TRUE' : 'FALSE'}
          </Text>
        </View>
      </>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContentContainer}
      style={styles.scrollView}
    >
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Code version</Text>
          <Text style={styles.text}>{codeVersion}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>State version</Text>
          <Text style={styles.text}>{persistConfig.version}</Text>
        </View>
        {staffCanSeeRows}
      </View>
      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.thanksText}>Thank you for using Comm!</Text>
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
    color: 'orange',
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
