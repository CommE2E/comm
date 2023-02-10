// @flow

import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';

import {
  disableAppActionType,
  enableAppActionType,
} from 'lib/reducers/enabled-apps-reducer.js';
import type { SupportedApps } from 'lib/types/enabled-apps.js';

import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +id: SupportedApps | 'chat',
  +alwaysEnabled: boolean,
  +enabled: boolean,
  +appName: string,
  +appIcon: 'message-square' | 'calendar',
  +appCopy: string,
};
function AppListing(props: Props): React.Node {
  const { id, enabled, alwaysEnabled, appName, appIcon, appCopy } = props;
  const styles = useStyles(unboundStyles);
  const colors = useColors();
  const dispatch = useDispatch();

  const enableApp = React.useCallback(
    () => dispatch({ type: enableAppActionType, payload: id }),
    [dispatch, id],
  );

  const disableApp = React.useCallback(
    () => dispatch({ type: disableAppActionType, payload: id }),
    [dispatch, id],
  );

  const callToAction = React.useMemo(() => {
    if (alwaysEnabled) {
      return (
        <SWMansionIcon
          color={colors.modalForegroundTertiaryLabel}
          name="check-circle"
          style={styles.plusIcon}
        />
      );
    }
    return (
      <TouchableOpacity onPress={enabled ? disableApp : enableApp}>
        <SWMansionIcon
          name={enabled ? 'check-circle' : 'plus-circle'}
          color={
            enabled
              ? colors.vibrantGreenButton
              : colors.modalForegroundSecondaryLabel
          }
          style={styles.plusIcon}
        />
      </TouchableOpacity>
    );
  }, [
    alwaysEnabled,
    colors.modalForegroundSecondaryLabel,
    colors.modalForegroundTertiaryLabel,
    colors.vibrantGreenButton,
    disableApp,
    enableApp,
    enabled,
    styles.plusIcon,
  ]);

  return (
    <View style={styles.cell}>
      <View style={styles.appContent}>
        <SWMansionIcon name={appIcon} style={styles.appIcon} />
        <View>
          <Text style={styles.appName}>{appName}</Text>
          <Text style={styles.appCopy}>{appCopy}</Text>
        </View>
      </View>
      {callToAction}
    </View>
  );
}

const unboundStyles = {
  cell: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  appContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    color: 'modalForegroundLabel',
    fontSize: 36,
    paddingRight: 18,
  },
  plusIcon: {
    fontSize: 24,
  },
  appName: {
    color: 'modalForegroundLabel',
    fontSize: 20,
  },
  appCopy: {
    color: 'modalForegroundLabel',
    fontSize: 12,
  },
  comingSoon: {
    color: 'gray',
    fontSize: 10,
    textAlign: 'center',
  },
};

export default AppListing;
