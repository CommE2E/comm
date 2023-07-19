// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { TouchableOpacity, Text } from 'react-native';

import {
  modifyCommunityRole,
  modifyCommunityRoleActionTypes,
} from 'lib/actions/thread-actions.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';
import { values } from 'lib/utils/objects.js';

import type { NavigationRoute } from '../navigation/route-names';
import { useStyles } from '../themes/colors.js';

type Props = {
  +route: NavigationRoute<'CreateRolesScreen'>,
  +setRoleCreationFailed: boolean => void,
};

function CreateRolesHeaderRightButton(props: Props): React.Node {
  const { threadInfo, action, roleName, rolePermissions } = props.route.params;
  const { setRoleCreationFailed } = props;
  const navigation = useNavigation();
  const styles = useStyles(unboundStyles);

  const callModifyCommunityRole = useServerCall(modifyCommunityRole);
  const dispatchActionPromise = useDispatchActionPromise();

  const onPressCreate = React.useCallback(() => {
    const threadRoleNames = values(threadInfo.roles).map(role => role.name);
    if (threadRoleNames.includes(roleName)) {
      setRoleCreationFailed(true);
      return;
    }

    dispatchActionPromise(
      modifyCommunityRoleActionTypes,
      callModifyCommunityRole({
        community: threadInfo.id,
        action,
        name: roleName,
        permissions: rolePermissions,
      }),
    );

    navigation.goBack();
  }, [
    callModifyCommunityRole,
    dispatchActionPromise,
    threadInfo,
    action,
    roleName,
    rolePermissions,
    navigation,
    setRoleCreationFailed,
  ]);

  const shouldHeaderRightBeDisabled = roleName.length === 0;
  const createButton = React.useMemo(() => {
    const textStyle = shouldHeaderRightBeDisabled
      ? styles.createButtonDisabled
      : styles.createButton;

    return (
      <TouchableOpacity
        onPress={onPressCreate}
        disabled={shouldHeaderRightBeDisabled}
      >
        <Text style={textStyle}>Create</Text>
      </TouchableOpacity>
    );
  }, [
    shouldHeaderRightBeDisabled,
    styles.createButtonDisabled,
    styles.createButton,
    onPressCreate,
  ]);

  return createButton;
}

const unboundStyles = {
  createButtonDisabled: {
    color: 'disabledButton',
    marginRight: 10,
  },
  createButton: {
    color: 'purpleLink',
    marginRight: 10,
  },
};

export default CreateRolesHeaderRightButton;
