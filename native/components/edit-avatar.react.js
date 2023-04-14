// @flow

import * as React from 'react';
import { View, TouchableOpacity } from 'react-native';

import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useColors, useStyles } from '../themes/colors.js';

type Props = {
  +children: React.Node,
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditAvatar(props: Props): React.Node {
  const { onPressEmojiAvatarFlow, children, disabled } = props;

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const editBadge = React.useMemo(() => {
    if (disabled) {
      return null;
    }

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
  }, [
    colors.floatingButtonLabel,
    disabled,
    styles.editAvatarIcon,
    styles.editAvatarIconContainer,
  ]);

  return (
    <TouchableOpacity onPress={onPressEmojiAvatarFlow} disabled={disabled}>
      {children}
      {editBadge}
    </TouchableOpacity>
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

export default EditAvatar;
