// @flow

import * as React from 'react';
import { Text, View, Switch } from 'react-native';
import { useDispatch } from 'react-redux';

import { updateReportsEnabledActionType } from 'lib/reducers/enabled-reports-reducer';

import { useStyles } from '../themes/colors';
import { useIsCrashReportingEnabled } from '../utils/crash-utils';

function ToggleCrashReports() {
  const styles = useStyles(unboundStyles);
  const dispatch = useDispatch();
  const crashReportsEnabled = useIsCrashReportingEnabled();

  const onCrashReportsToggled = React.useCallback(
    (value) => {
      dispatch({
        type: updateReportsEnabledActionType,
        payload: { crashReports: value },
      });
    },
    [dispatch],
  );

  return (
    <View style={styles.submenuButton}>
      <Text style={styles.submenuText}>Send crash reports</Text>
      <Switch
        value={crashReportsEnabled}
        onValueChange={onCrashReportsToggled}
      />
    </View>
  );
}

const unboundStyles = {
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

export default ToggleCrashReports;
