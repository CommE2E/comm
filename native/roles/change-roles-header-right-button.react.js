// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { changeThreadMemberRolesActionTypes } from 'lib/actions/thread-action-types.js';
import { useChangeThreadMemberRoles } from 'lib/hooks/thread-hooks.js';
import { useDispatchActionPromise } from 'lib/utils/redux-promise-utils.js';

import type { NavigationRoute } from '../navigation/route-names';
import { useColors } from '../themes/colors.js';

type Props = {
  +route: NavigationRoute<'ChangeRolesScreen'>,
  +shouldRoleChangeBeDisabled: boolean,
};

function ChangeRolesHeaderRightButton(props: Props): React.Node {
  const { threadInfo, memberInfo, role: selectedRole } = props.route.params;
  const { shouldRoleChangeBeDisabled } = props;
  const { role: initialRole } = memberInfo;
  invariant(initialRole, 'Expected initial role to be defined');
  invariant(selectedRole, 'Expected selected role to be defined');
  const navigation = useNavigation();

  const callChangeThreadMemberRoles = useChangeThreadMemberRoles();
  const dispatchActionPromise = useDispatchActionPromise();

  const { disabledButton, purpleLink } = useColors();
  const textStyle = React.useMemo(
    () => ({
      color: shouldRoleChangeBeDisabled ? disabledButton : purpleLink,
      marginRight: 10,
    }),
    [disabledButton, purpleLink, shouldRoleChangeBeDisabled],
  );

  const handleSave = React.useCallback(() => {
    if (selectedRole === initialRole) {
      navigation.goBack();
      return;
    }

    void dispatchActionPromise(
      changeThreadMemberRolesActionTypes,
      callChangeThreadMemberRoles({
        threadID: threadInfo.id,
        memberIDs: [memberInfo.id],
        newRole: selectedRole,
      }),
    );

    navigation.goBack();
  }, [
    callChangeThreadMemberRoles,
    dispatchActionPromise,
    initialRole,
    memberInfo.id,
    navigation,
    selectedRole,
    threadInfo.id,
  ]);

  const saveButton = React.useMemo(() => {
    if (shouldRoleChangeBeDisabled) {
      return (
        <View>
          <Text style={textStyle}>Save</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity onPress={handleSave}>
        <Text style={textStyle}>Save</Text>
      </TouchableOpacity>
    );
  }, [shouldRoleChangeBeDisabled, textStyle, handleSave]);

  return saveButton;
}

export default ChangeRolesHeaderRightButton;
