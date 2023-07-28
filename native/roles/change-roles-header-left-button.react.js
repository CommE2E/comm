// @flow

import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/elements';
import invariant from 'invariant';
import * as React from 'react';
import { Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import type { NavigationRoute } from '../navigation/route-names';
import { useColors } from '../themes/colors.js';
import Alert from '../utils/alert.js';

type ChangeRolesHeaderLeftButtonProps = {
  +route: NavigationRoute<'ChangeRolesScreen'>,
  ...React.ElementConfig<typeof BaseHeaderBackButton>,
};

function ChangeRolesHeaderLeftButton(
  props: ChangeRolesHeaderLeftButtonProps,
): React.Node {
  const { memberInfo, role: selectedRole } = props.route.params;
  const { role: memberRole } = memberInfo;

  const onCancel = React.useCallback(() => {
    const { onPress } = props;
    invariant(onPress, 'onPress must be defined');

    if (selectedRole === memberRole) {
      onPress();
      return;
    }

    Alert.alert(
      'Discard changes?',
      'You have unsaved changes which will be discarded if you navigate away.',
      [
        { text: 'Leave', onPress },
        { text: 'Stay', style: 'cancel' },
      ],
    );
  }, [memberRole, props, selectedRole]);

  const { panelForegroundSecondaryLabel } = useColors();
  const labelStyle = React.useMemo(
    () => ({
      color: panelForegroundSecondaryLabel,
      marginLeft: 10,
    }),
    [panelForegroundSecondaryLabel],
  );

  return (
    <TouchableOpacity onPress={onCancel}>
      <Text style={labelStyle}>Cancel</Text>
    </TouchableOpacity>
  );
}

export default ChangeRolesHeaderLeftButton;
