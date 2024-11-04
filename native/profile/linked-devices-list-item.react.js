// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';

import {
  type IdentityPlatformDetails,
  identityDeviceTypes,
} from 'lib/types/identity-service-types.js';

import Pill from '../components/pill.react.js';
import SWMIcon from '../components/swmansion-icon.react.js';
import { LinkedDevicesBottomSheetRouteName } from '../navigation/route-names.js';
import { useStyles, useColors } from '../themes/colors.js';

type Props = {
  +deviceID: string,
  +platformDetails: ?IdentityPlatformDetails,
  +isPrimary: boolean,
  +isThisDevice: boolean,
  +shouldAllowDeviceRemoval: boolean,
};

function LinkedDevicesListItem(props: Props): React.Node {
  const {
    deviceID,
    platformDetails,
    isPrimary,
    isThisDevice,
    shouldAllowDeviceRemoval,
  } = props;

  const styles = useStyles(unboundStyles);
  const colors = useColors();

  const { navigate } = useNavigation();

  const onPress = React.useCallback(() => {
    if (!shouldAllowDeviceRemoval) {
      return;
    }
    navigate<'LinkedDevicesBottomSheet'>({
      name: LinkedDevicesBottomSheetRouteName,
      params: {
        deviceID,
        shouldDisplayRemoveButton: shouldAllowDeviceRemoval,
      },
    });
  }, [deviceID, navigate, shouldAllowDeviceRemoval]);

  const deviceType = platformDetails?.deviceType;

  const deviceIcon = React.useMemo(() => {
    let name;
    if (
      deviceType === identityDeviceTypes.IOS ||
      deviceType === identityDeviceTypes.ANDROID
    ) {
      name = 'phone';
    } else if (deviceType === identityDeviceTypes.KEYSERVER) {
      name = 'cloud';
    } else if (deviceType === identityDeviceTypes.WEB) {
      name = 'globe-1';
    } else {
      name = 'question';
    }
    return (
      <SWMIcon name={name} size={12} color={colors.panelForegroundLabel} />
    );
  }, [deviceType, colors.panelForegroundLabel]);

  const label = React.useMemo(() => {
    const baseLabel = deviceID.substr(0, 7);

    const labelAttributes = [];
    if (isPrimary) {
      labelAttributes.push('primary');
    }
    if (isThisDevice) {
      labelAttributes.push('this device');
    }

    if (labelAttributes.length === 0) {
      return baseLabel;
    }

    const joinedAttributes = labelAttributes.join(', ');
    const finalLabel = `${baseLabel} (${joinedAttributes})`;
    return finalLabel;
  }, [deviceID, isPrimary, isThisDevice]);

  const deviceListItem = React.useMemo(
    () => (
      <TouchableOpacity style={styles.listItemContainer} onPress={onPress}>
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
      onPress,
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
