// @flow

import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/elements';
import * as React from 'react';
import { Text } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';

import { useColors } from '../themes/colors.js';

type Props = React.ElementConfig<typeof BaseHeaderBackButton>;
function ChangeRolesHeaderLeftButton(props: Props): React.Node {
  const { panelForegroundSecondaryLabel } = useColors();
  const labelStyle = React.useMemo(
    () => ({
      color: panelForegroundSecondaryLabel,
      marginLeft: 10,
    }),
    [panelForegroundSecondaryLabel],
  );

  return (
    <TouchableOpacity onPress={props.onPress}>
      <Text style={labelStyle}>Cancel</Text>
    </TouchableOpacity>
  );
}

export default ChangeRolesHeaderLeftButton;
