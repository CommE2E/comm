// @flow

import * as React from 'react';
import { View } from 'react-native';

import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useColors, useStyles } from '../themes/colors.js';

function EditAvatarBadge(): React.Node {
  const colors = useColors();
  const styles = useStyles(unboundStyles);

  return (
    <View style={styles.editAvatarIconContainer}>
      <SWMansionIcon
        name="edit-2"
        size={16}
        style={styles.editAvatarIcon}
        color={colors.floatingButtonLabel}
      />
    </View>
  );
}

const unboundStyles = {
  editAvatarIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
    borderColor: 'panelForeground',
    borderRadius: 18,
    width: 36,
    height: 36,
    backgroundColor: 'purpleButton',
    justifyContent: 'center',
  },
  editAvatarIcon: {
    textAlign: 'center',
  },
};

export default EditAvatarBadge;
