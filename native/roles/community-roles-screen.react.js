// @flow

import invariant from 'invariant';
import * as React from 'react';
import { View, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import type { ThreadInfo } from 'lib/types/thread-types.js';

import type { RolesNavigationProp } from './roles-navigator.react.js';
import Button from '../components/button.react.js';
import CommIcon from '../components/comm-icon.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
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

  const roleNames = React.useMemo(() => {
    const roleIDsToNames = {};

    Object.keys(threadInfo.roles).forEach(roleID => {
      roleIDsToNames[roleID] = threadInfo.roles[roleID].name;
    });

    return roleIDsToNames;
  }, [threadInfo.roles]);

  const roleNamesToMembers = React.useMemo(() => {
    const roleNamesToMemberCount = {};

    threadInfo.members.forEach(member => {
      const roleID = member.role;
      invariant(roleID, 'Community member should have a role');
      const roleName = roleNames[roleID];

      if (roleNamesToMemberCount[roleName] !== undefined) {
        roleNamesToMemberCount[roleName] += 1;
      } else {
        roleNamesToMemberCount[roleName] = 1;
      }
    });

    // For all commnity roles with no members, add them to the list with 0
    Object.keys(roleNames).forEach(roleName => {
      if (roleNamesToMemberCount[roleNames[roleName]] === undefined) {
        roleNamesToMemberCount[roleNames[roleName]] = 0;
      }
    });

    return roleNamesToMemberCount;
  }, [threadInfo.members, roleNames]);

  const rolePanelList = React.useMemo(() => {
    const rolePanelEntries = [];

    Object.keys(roleNamesToMembers).forEach(roleName => {
      rolePanelEntries.push(
        <View key={roleName} style={styles.rolePanelEntry}>
          <Text style={styles.rolePanelNameEntry}>{roleName}</Text>
          <Text style={styles.rolePanelCountEntry}>
            {roleNamesToMembers[roleName]}
            <CommIcon name="user-filled" size={14} />
          </Text>
        </View>,
      );
    });

    return rolePanelEntries;
  }, [
    roleNamesToMembers,
    styles.rolePanelEntry,
    styles.rolePanelCountEntry,
    styles.rolePanelNameEntry,
  ]);

  const navigateToCreateRole = React.useCallback(() => {}, []);

  return (
    <View>
      <View style={styles.rolesInfoContainer}>
        <Text style={styles.rolesInfoText}>
          Roles help you group community members together and assign them
          certain permissions. The Admins and Members roles are set by default
          and cannot be edited or deleted. {'\n\n'}
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
            <Text style={styles.createRoleButtonText}>Create Role</Text>
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
  rolesInfoText: {
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
    maxHeight: 400,
  },
  rolePanelEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
  },
  rolePanelNameEntry: {
    color: 'whiteText',
    fontWeight: '600',
    fontSize: 14,
  },
  rolePanelCountEntry: {
    color: 'whiteText',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 72,
    padding: 8,
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
