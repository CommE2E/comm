// @flow

import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/elements';
import * as React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { useColors } from '../themes/colors.js';

type CommunityRolesHeaderLeftButtonProps = React.ElementConfig<
  typeof BaseHeaderBackButton,
>;

function CommunityRolesHeaderLeftButton(
  props: CommunityRolesHeaderLeftButtonProps,
): React.Node {
  const { panelForegroundLabel } = useColors();

  const labelStyle = React.useMemo(
    () => ({
      color: panelForegroundLabel,
      fontSize: 16,
      marginLeft: 10,
    }),
    [panelForegroundLabel],
  );

  return (
    <TouchableOpacity onPress={props.onPress}>
      <Text style={labelStyle}>Close</Text>
    </TouchableOpacity>
  );
}

export default CommunityRolesHeaderLeftButton;
