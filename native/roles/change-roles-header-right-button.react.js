// @flow

import { useNavigation } from '@react-navigation/native';
import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import {
  changeThreadMemberRoles,
  changeThreadMemberRolesActionTypes,
} from 'lib/actions/thread-actions.js';
import { otherUsersButNoOtherAdmins } from 'lib/selectors/thread-selectors.js';
import { roleIsAdminRole } from 'lib/shared/thread-utils.js';
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import type { NavigationRoute } from '../navigation/route-names';
import { useSelector } from '../redux/redux-utils.js';
import { useColors } from '../themes/colors.js';

type Props = {
  +route: NavigationRoute<'ChangeRolesScreen'>,
};

function ChangeRolesHeaderRightButton(props: Props): React.Node {
  const { threadInfo, memberInfo, role: selectedRole } = props.route.params;
  const { role: initialRole } = memberInfo;
  invariant(initialRole, 'Expected initial role to be defined');
  invariant(selectedRole, 'Expected selected role to be defined');
  const navigation = useNavigation();

  const callChangeThreadMemberRoles = useServerCall(changeThreadMemberRoles);
  const dispatchActionPromise = useDispatchActionPromise();

  const otherUsersButNoOtherAdminsValue = useSelector(
    otherUsersButNoOtherAdmins(threadInfo.id),
  );

  const { purpleLink } = useColors();
  const textStyle = React.useMemo(
    () => ({
      color: purpleLink,
      marginRight: 10,
    }),
    [purpleLink],
  );

  const handleSave = React.useCallback(() => {
    if (selectedRole === initialRole) {
      navigation.goBack();
      return;
    }

    const memberIsAdmin = roleIsAdminRole(threadInfo.roles[initialRole]);

    if (otherUsersButNoOtherAdminsValue && memberIsAdmin) {
      navigation.setParams({
        ...props.route.params,
        shouldShowError: true,
      });
      return;
    }

    const createChangeThreadMemberRolesPromise = () => {
      return callChangeThreadMemberRoles(
        threadInfo.id,
        [memberInfo.id],
        selectedRole,
      );
    };

    dispatchActionPromise(
      changeThreadMemberRolesActionTypes,
      createChangeThreadMemberRolesPromise(),
    );

    navigation.goBack();
  }, [
    callChangeThreadMemberRoles,
    dispatchActionPromise,
    initialRole,
    memberInfo.id,
    navigation,
    otherUsersButNoOtherAdminsValue,
    props.route.params,
    selectedRole,
    threadInfo.id,
    threadInfo.roles,
  ]);

  return (
    <TouchableOpacity onPress={handleSave}>
      <Text style={textStyle}>Save</Text>
    </TouchableOpacity>
  );
}

export default ChangeRolesHeaderRightButton;
