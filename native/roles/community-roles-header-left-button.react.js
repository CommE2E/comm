// @flow

import { HeaderBackButton as BaseHeaderBackButton } from '@react-navigation/elements';
import * as React from 'react';
import { Text, TouchableOpacity } from 'react-native';

import { useStyles } from '../themes/colors.js';

type CommunityRolesHeaderLeftButtonProps = React.ElementConfig<
  typeof BaseHeaderBackButton,
>;

function CommunityRolesHeaderLeftButton(
  props: CommunityRolesHeaderLeftButtonProps,
): React.Node {
  const styles = useStyles(unboundStyles);

  return (
    <TouchableOpacity onPress={props.onPress}>
      <Text style={styles.labelStyle}>Close</Text>
    </TouchableOpacity>
  );
}

const unboundStyles = {
  labelStyle: {
    color: 'panelForegroundLabel',
    fontSize: 16,
    marginLeft: 10,
  },
};

export default CommunityRolesHeaderLeftButton;
