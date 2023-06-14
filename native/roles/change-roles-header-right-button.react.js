// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import {
  changeThreadMemberRoles,
  changeThreadMemberRolesActionTypes,
} from 'lib/actions/thread-actions.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

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

  const callChangeThreadMemberRoles = useServerCall(changeThreadMemberRoles);
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

    dispatchActionPromise(
      changeThreadMemberRolesActionTypes,
      callChangeThreadMemberRoles(threadInfo.id, [memberInfo.id], selectedRole),
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
