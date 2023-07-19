// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { TouchableOpacity, Text } from 'react-native';

import { modifyCommunityRole } from 'lib/actions/thread-actions.js';
import { useServerCall } from 'lib/utils/action-utils.js';

import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors.js';

type Props = {
  +route: NavigationRoute<'CreateRolesScreen'>,
};

function CreateRolesHeaderRightButton(props: Props): React.Node {
  const { threadInfo, action, roleName, rolePermissions } = props.route.params;
  const navigation = useNavigation();
  const styles = useStyles(unboundStyles);

  const callModifyCommunityRole = useServerCall(modifyCommunityRole);

  const onPressCreate = React.useCallback(() => {
    callModifyCommunityRole({
      community: threadInfo.id,
      action,
      name: roleName,
      permissions: rolePermissions,
    });

    navigation.goBack();
  }, [
    callModifyCommunityRole,
    threadInfo,
    action,
    roleName,
    rolePermissions,
    navigation,
  ]);

  return (
    <TouchableOpacity onPress={onPressCreate}>
      <Text style={styles.createButton}>Create</Text>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  createButton: {
    color: 'purpleLink',
    marginRight: 10,
  },
};

export default CreateRolesHeaderRightButton;
