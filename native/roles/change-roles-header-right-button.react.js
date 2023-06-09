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
import {
  useDispatchActionPromise,
  useServerCall,
} from 'lib/utils/action-utils.js';

import type { NavigationRoute } from '../navigation/route-names';
import { useColors } from '../themes/colors.js';

type Props = {
  +route: NavigationRoute<'ChangeRolesScreen'>,
};

function ChangeRolesHeaderRightButton(props: Props): React.Node {
  const { threadInfo, memberInfo, role: selectedRole } = props.route.params;
  const { role: initialRole } = memberInfo;
  invariant(selectedRole, 'Expected selected role to be defined');
  const navigation = useNavigation();

  const callChangeThreadMemberRoles = useServerCall(changeThreadMemberRoles);
  const dispatchActionPromise = useDispatchActionPromise();

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
    selectedRole,
    threadInfo.id,
  ]);

  return (
    <TouchableOpacity onPress={handleSave}>
      <Text style={textStyle}>Save</Text>
    </TouchableOpacity>
  );
}

export default ChangeRolesHeaderRightButton;
