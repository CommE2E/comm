// @flow

import * as React from 'react';
import { Text, View, FlatList } from 'react-native';

import {
  getOwnPeerDevices,
  type DeviceIDAndPlatformDetails,
} from 'lib/selectors/user-selectors.js';

import LinkedDevicesListItem from './linked-devices-list-item.react.js';
import type { ProfileNavigationProp } from './profile.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

function keyExtractor(item: DeviceIDAndPlatformDetails) {
  return item.deviceID;
}

function renderDeviceListItem({
  item,
  index,
}: {
  +item: DeviceIDAndPlatformDetails,
  +index: number,
  ...
}) {
  return <LinkedDevicesListItem {...item} isPrimary={index === 0} />;
}

type Props = {
  +navigation: ProfileNavigationProp<'LinkedDevices'>,
  +route: NavigationRoute<'LinkedDevices'>,
};
// eslint-disable-next-line no-unused-vars
function LinkedDevices(props: Props): React.Node {
  const styles = useStyles(unboundStyles);

  const userDevicesInfos: $ReadOnlyArray<DeviceIDAndPlatformDetails> =
    useSelector(getOwnPeerDevices);

  const separatorComponent = React.useCallback(
    () => <View style={styles.separator} />,
    [styles.separator],
  );

  const userDeviceList = React.useMemo(
    () => (
      <View style={styles.container}>
        <Text style={styles.header}>USER DEVICES</Text>
        <FlatList
          data={userDevicesInfos}
          renderItem={renderDeviceListItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.deviceListContentContainer}
          ItemSeparatorComponent={separatorComponent}
        />
      </View>
    ),
    [
      separatorComponent,
      userDevicesInfos,
      styles.container,
      styles.header,
      styles.deviceListContentContainer,
    ],
  );

  return userDeviceList;
}

const unboundStyles = {
  container: {
    flex: 1,
    backgroundColor: 'panelBackground',
    paddingTop: 24,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  deviceListContentContainer: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    paddingVertical: 2,
  },
  separator: {
    backgroundColor: 'panelForegroundBorder',
    height: 1,
    marginHorizontal: 16,
  },
};

export default LinkedDevices;
