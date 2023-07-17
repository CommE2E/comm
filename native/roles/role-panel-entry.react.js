// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import * as React from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { values } from 'lib/utils/objects.js';

import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

type RolePanelEntryProps = {
  +roleName: string,
  +memberCount: number,
};

function RolePanelEntry(props: RolePanelEntryProps): React.Node {
  const { roleName, memberCount } = props;
  const styles = useStyles(unboundStyles);

  const menuButton = React.useMemo(() => {
    if (roleName === 'Admins') {
      return <View style={styles.rolePanelEmptyMenuButton} />;
    }
    return (
      <SWMansionIcon
        name="menu-horizontal"
        size={22}
        style={styles.rolePanelMenuButton}
      />
    );
  }, [roleName, styles.rolePanelEmptyMenuButton, styles.rolePanelMenuButton]);

  const optionsMap = React.useMemo(() => {
    const optionsToIcons = {};

    optionsToIcons['Edit role'] = (
      <SWMansionIcon key="edit-1" name="edit-1" size={20} />
    );

    if (Platform.OS === 'ios') {
      optionsToIcons['Cancel'] = null;
    }

    return optionsToIcons;
  }, []);

  const onOptionSelected = React.useCallback(
    (index: ?number) => {
      if (
        index === undefined ||
        index === null ||
        index === Object.keys(optionsMap).length
      ) {
        return;
      }
    },
    [optionsMap],
  );

  const activeTheme = useSelector(state => state.globalThemeInfo.activeTheme);
  const { showActionSheetWithOptions } = useActionSheet();
  const insets = useSafeAreaInsets();

  const showActionSheet = React.useCallback(() => {
    const cancelButtonIndex =
      Platform.OS === 'ios' ? Object.keys(optionsMap).length - 1 : -1;
    const containerStyle = {
      paddingBottom: insets.bottom,
    };

    showActionSheetWithOptions(
      {
        options: Object.keys(optionsMap),
        cancelButtonIndex,
        containerStyle,
        userInterfaceStyle: activeTheme ?? 'dark',
        icons: values(optionsMap),
      },
      onOptionSelected,
    );
  }, [
    optionsMap,
    onOptionSelected,
    insets.bottom,
    activeTheme,
    showActionSheetWithOptions,
  ]);

  return (
    <View style={styles.rolePanelEntry}>
      <Text style={styles.rolePanelNameEntry}>{roleName}</Text>
      <View style={styles.rolePanelCountEntryContainer}>
        <Text style={styles.rolePanelCountEntry}>
          {memberCount}
          <CommIcon name="user-filled" size={14} />
        </Text>
      </View>
      <TouchableOpacity onPress={showActionSheet}>
        {menuButton}
      </TouchableOpacity>
    </View>
  );
}

const unboundStyles = {
  rolePanelEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  rolePanelNameEntry: {
    flex: 1,
    color: 'panelForegroundLabel',
    fontWeight: '600',
    fontSize: 14,
  },
  rolePanelCountEntryContainer: {
    marginRight: 40,
    alignItmes: 'flex-end',
  },
  rolePanelCountEntry: {
    color: 'panelForegroundLabel',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 22,
    padding: 8,
  },
  rolePanelEmptyMenuButton: {
    marginRight: 22,
  },
  rolePanelMenuButton: {
    color: 'panelForegroundLabel',
  },
};

export default RolePanelEntry;
