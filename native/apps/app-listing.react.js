// @flow

import * as React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';

import {
  disableAppActionType,
  enableAppActionType,
} from 'lib/reducers/enabled-apps-reducer';
import type { SupportedApps } from 'lib/types/enabled-apps';

import SWMansionIcon from '../components/swmansion-icon.react';
import { useStyles } from '../themes/colors';

type Props = {|
  +id: SupportedApps,
  +available: boolean,
  +enabled: boolean,
  +appName: string,
  +appIcon: 'calendar' | 'document-filled' | 'check-round' | 'package',
  +appCopy: string,
|};
function AppListing(props: Props): React.Node {
  const { id, available, enabled, appName, appIcon, appCopy } = props;
  const styles = useStyles(unboundStyles);
  const dispatch = useDispatch();

  const textColor = available ? 'white' : 'gray';

  const enableApp = React.useCallback(
    () => dispatch({ type: enableAppActionType, payload: id }),
    [dispatch, id],
  );

  const disableApp = React.useCallback(
    () => dispatch({ type: disableAppActionType, payload: id }),
    [dispatch, id],
  );

  let callToAction;
  if (available) {
    callToAction = (
      <TouchableOpacity onPress={enabled ? disableApp : enableApp}>
        <SWMansionIcon
          name={enabled ? 'check-circle' : 'plus-circle'}
          style={styles.plusIcon}
        />
      </TouchableOpacity>
    );
  } else {
    callToAction = <Text style={styles.comingSoon}>{`coming\nsoon!`}</Text>;
  }

  return (
    <View style={styles.cell}>
      <View style={styles.appContent}>
        <SWMansionIcon
          name={appIcon}
          style={[styles.appIcon, { color: textColor }]}
        />
        <View>
          <Text style={[styles.appName, { color: textColor }]}>{appName}</Text>
          <Text style={[styles.appCopy, { color: textColor }]}>{appCopy}</Text>
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
    fontSize: 36,
    paddingRight: 18,
  },
  plusIcon: {
    fontSize: 24,
    color: 'white',
  },
  appName: {
    fontSize: 20,
  },
  appCopy: {
    fontSize: 12,
  },
  comingSoon: {
    color: 'gray',
    fontSize: 10,
    textAlign: 'center',
  },
};

export default AppListing;
