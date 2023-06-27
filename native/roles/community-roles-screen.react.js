// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import { useRoleMemberCountsForCommunity } from 'lib/shared/thread-utils.js';
import type { ThreadInfo } from 'lib/types/thread-types.js';

import RolePanelEntry from './role-panel-entry.react.js';
import type { RolesNavigationProp } from './roles-navigator.react.js';
import Button from '../components/button.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { CreateRolesScreenRouteName } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';

export type CommunityRolesScreenParams = {
  +threadInfo: ThreadInfo,
};

type CommunityRolesScreenProps = {
  +navigation: RolesNavigationProp<'CommunityRolesScreen'>,
  +route: NavigationRoute<'CommunityRolesScreen'>,
};

function CommunityRolesScreen(props: CommunityRolesScreenProps): React.Node {
  const { threadInfo } = props.route.params;
  const styles = useStyles(unboundStyles);

  const roleNamesToMembers = useRoleMemberCountsForCommunity(threadInfo);

  const rolePanelList = React.useMemo(() => {
    const rolePanelEntries = [];

    Object.keys(roleNamesToMembers).forEach(roleName => {
      rolePanelEntries.push(
        <RolePanelEntry
          key={roleName}
          roleName={roleName}
          memberCount={roleNamesToMembers[roleName]}
        />,
      );
    });

    return rolePanelEntries;
  }, [roleNamesToMembers]);

  const navigateToCreateRole = React.useCallback(
    () =>
      props.navigation.navigate(CreateRolesScreenRouteName, {
        threadInfo,
        action: 'create_role',
      }),
    [threadInfo, props.navigation],
  );

  return (
    <View>
      <View style={styles.rolesInfoContainer}>
        <Text style={styles.rolesInfoTextFirstLine}>
          Roles help you group community members together and assign them
          certain permissions. The Admins and Members roles are set by default
          and cannot be edited or deleted.
        </Text>
        <Text style={styles.rolesInfoTextSecondLine}>
          When people join the community, they are automatically assigned the
          Members role.
        </Text>
      </View>
      <View style={styles.rolesPanel}>
        <View style={styles.rolePanelHeadersContainer}>
          <Text style={styles.rolePanelHeaderLeft}>ROLES</Text>
          <Text style={styles.rolePanelHeaderRight}>MEMBERS</Text>
        </View>
        <ScrollView style={styles.rolePanelList}>{rolePanelList}</ScrollView>
        <View style={styles.buttonContainer}>
          <Button
            style={styles.createRoleButton}
            onPress={navigateToCreateRole}
          >
            <Text style={styles.createRoleButtonText}>Create role</Text>
          </Button>
        </View>
      </View>
    </View>
  );
}

const unboundStyles = {
  rolesInfoContainer: {
    backgroundColor: 'panelForeground',
    padding: 16,
  },
  rolesInfoTextFirstLine: {
    color: 'panelBackgroundLabel',
    fontSize: 14,
    marginBottom: 14,
  },
  rolesInfoTextSecondLine: {
    color: 'panelBackgroundLabel',
    fontSize: 14,
  },
  rolesPanel: {
    marginTop: 30,
  },
  rolePanelHeadersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rolePanelHeaderLeft: {
    color: 'panelBackgroundLabel',
    fontSize: 14,
  },
  rolePanelHeaderRight: {
    color: 'panelBackgroundLabel',
    fontSize: 14,
    marginRight: 72,
  },
  rolePanelList: {
    backgroundColor: 'panelForeground',
    marginTop: 8,
    padding: 4,
    maxHeight: 325,
  },
  buttonContainer: {
    backgroundColor: 'panelForeground',
    padding: 2,
  },
  createRoleButton: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 10,
    backgroundColor: 'purpleButton',
    height: 48,
    borderRadius: 10,
  },
  createRoleButtonText: {
    color: 'whiteText',
    fontSize: 16,
    fontWeight: '500',
  },
};

export default CommunityRolesScreen;
