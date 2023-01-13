// @flow

import * as React from 'react';
import { Text, View } from 'react-native';

import SWMansionIcon from '../components/swmansion-icon.react';
import { StaffContext } from '../staff/staff-context';
import { useStyles, useColors } from '../themes/colors';
import { isStaffRelease, useStaffCanSee } from '../utils/staff-utils';

let alchemyAPIKey = 'NULL';
try {
  // $FlowExpectedError file may not exist
  const apiKey: string = require('../facts/alchemy').key;
  alchemyAPIKey = apiKey;
} catch (e) {}

function LoggedOutStaffInfo(): React.Node {
  const staffCanSee = useStaffCanSee();
  const { staffUserHasBeenLoggedIn } = React.useContext(StaffContext);
  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const checkIcon = React.useMemo(
    () => (
      <SWMansionIcon
        name="check-circle"
        size={20}
        color={colors.vibrantGreenButton}
      />
    ),
    [colors.vibrantGreenButton],
  );
  const crossIcon = React.useMemo(
    () => (
      <SWMansionIcon
        name="cross-circle"
        size={20}
        color={colors.vibrantRedButton}
      />
    ),
    [colors.vibrantRedButton],
  );

  const isDevBuildStyle = React.useMemo(() => {
    return [
      styles.infoText,
      __DEV__ ? styles.infoTextTrue : styles.infoTextFalse,
    ];
  }, [styles.infoText, styles.infoTextFalse, styles.infoTextTrue]);

  const isStaffReleaseStyle = React.useMemo(() => {
    return [
      styles.infoText,
      isStaffRelease ? styles.infoTextTrue : styles.infoTextFalse,
    ];
  }, [styles.infoText, styles.infoTextFalse, styles.infoTextTrue]);

  const hasStaffUserLoggedInStyle = React.useMemo(() => {
    return [
      styles.infoText,
      staffUserHasBeenLoggedIn ? styles.infoTextTrue : styles.infoTextFalse,
    ];
  }, [
    staffUserHasBeenLoggedIn,
    styles.infoText,
    styles.infoTextFalse,
    styles.infoTextTrue,
  ]);

  const alchemyAPIKeyStyle = React.useMemo(() => {
    return [
      styles.infoText,
      alchemyAPIKey ? styles.infoTextTrue : styles.infoTextFalse,
    ];
  }, [styles.infoText, styles.infoTextFalse, styles.infoTextTrue]);

  let loggedOutStaffInfo = null;
  if (staffCanSee || staffUserHasBeenLoggedIn) {
    loggedOutStaffInfo = (
      <View>
        <View style={styles.infoBadge}>
          <View style={styles.cell}>
            {__DEV__ ? checkIcon : crossIcon}
            <Text style={isDevBuildStyle}>__DEV__</Text>
          </View>
          <View style={styles.cell}>
            {isStaffRelease ? checkIcon : crossIcon}
            <Text style={isStaffReleaseStyle}>isStaffRelease</Text>
          </View>
          <View style={styles.cell}>
            {staffUserHasBeenLoggedIn ? checkIcon : crossIcon}
            <Text style={hasStaffUserLoggedInStyle}>
              staffUserHasBeenLoggedIn
            </Text>
          </View>
          <View style={styles.cell}>
            {alchemyAPIKey ? checkIcon : crossIcon}
            <Text style={alchemyAPIKeyStyle}>{alchemyAPIKey}</Text>
          </View>
        </View>
      </View>
    );
  }

  return loggedOutStaffInfo;
}

const unboundStyles = {
  cell: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBadge: {
    backgroundColor: 'codeBackground',
    borderRadius: 6,
    justifyContent: 'flex-start',
    marginBottom: 10,
    marginTop: 10,
    padding: 8,
  },
  infoText: {
    fontFamily: 'OpenSans-Semibold',
    fontSize: 14,
    lineHeight: 24,
    paddingLeft: 4,
    textAlign: 'left',
  },
  infoTextFalse: {
    color: 'vibrantRedButton',
  },
  infoTextTrue: {
    color: 'vibrantGreenButton',
  },
};

export default LoggedOutStaffInfo;
