// @flow

import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';

import type { IdentityPlatformDetails } from 'lib/types/identity-service-types.js';
import { identityDeviceTypes } from 'lib/types/identity-service-types.js';

import Pill from '../components/pill.react.js';
import SWMIcon from '../components/swmansion-icon.react.js';
import { useStyles, useColors } from '../themes/colors.js';

type Props = {
  +deviceID: string,
  +platformDetails: ?IdentityPlatformDetails,
  +isPrimary: boolean,
};

function LinkedDevicesListItem(props: Props): React.Node {
  const { deviceID, platformDetails, isPrimary } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const deviceType = platformDetails?.deviceType;

  const deviceIcon = React.useMemo(() => {
    let name;
    switch (deviceType) {
      case identityDeviceTypes.IOS:
      case identityDeviceTypes.ANDROID:
        name = 'phone';
        break;
      case identityDeviceTypes.KEYSERVER:
        name = 'cloud';
        break;
      case identityDeviceTypes.WEB:
        name = 'globe-1';
        break;
      default:
        name = 'question';
    }
    return (
      <SWMIcon name={name} size={12} color={colors.panelForegroundLabel} />
    );
  }, [deviceType, colors.panelForegroundLabel]);

  const label = React.useMemo(() => {
    let baseLabel = deviceID.substr(0, 7);
    if (isPrimary) {
      baseLabel += ' (primary)';
    }
    return baseLabel;
  }, [deviceID, isPrimary]);

  const deviceListItem = React.useMemo(
    () => (
      <TouchableOpacity style={styles.listItemContainer}>
        <View style={styles.pillContainer}>
          <Pill
            label={label}
            backgroundColor={colors.codeBackground}
            icon={deviceIcon}
          />
        </View>
      </TouchableOpacity>
    ),
    [
      styles.listItemContainer,
      styles.pillContainer,
      label,
      colors.codeBackground,
      deviceIcon,
    ],
  );

  return deviceListItem;
}

const unboundStyles = {
  listItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  pillContainer: {
    flex: 1,
    alignItems: 'baseline',
  },
};

export default LinkedDevicesListItem;
