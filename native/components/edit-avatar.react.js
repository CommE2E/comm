// @flow

import { useActionSheet } from '@expo/react-native-action-sheet';
import * as React from 'react';
import {
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { updateUserAvatarActionTypes } from 'lib/actions/user-actions.js';
import { useENSAvatar } from 'lib/hooks/ens-cache.js';
import { createLoadingStatusSelector } from 'lib/selectors/loading-selectors.js';
import { getEthAddressForUserInfo } from 'lib/utils/ens-helpers.js';

import CommIcon from '../components/comm-icon.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors, useStyles } from '../themes/colors.js';
import { useSaveUserAvatar } from '../utils/avatar-utils.js';

const userAvatarLoadingStatusSelector = createLoadingStatusSelector(
  updateUserAvatarActionTypes,
);

type Props = {
  +children: React.Node,
  +childAvatarType: 'user' | 'thread',
  +onPressEmojiAvatarFlow: () => mixed,
  +disabled?: boolean,
};
function EditAvatar(props: Props): React.Node {
  const { children, childAvatarType, onPressEmojiAvatarFlow, disabled } = props;

  const { showActionSheetWithOptions } = useActionSheet();

  const colors = useColors();
  const styles = useStyles(unboundStyles);

  const currentUserInfo = useSelector(state => state.currentUserInfo);

  const ethAddress = React.useMemo(
    () => getEthAddressForUserInfo(currentUserInfo),
    [currentUserInfo],
  );
  const ensAvatarURI = useENSAvatar(ethAddress);

  const saveUserAvatar = useSaveUserAvatar();
  const saveUserAvatarCallLoading = useSelector(
    state => userAvatarLoadingStatusSelector(state) === 'loading',
  );

  const onPressUseENSAvatar = React.useCallback(() => {
    const newAvatarRequest = {
      type: 'ens',
    };
    saveUserAvatar(newAvatarRequest);
  }, [saveUserAvatar]);

  const editAvatarOptions = React.useMemo(() => {
    const options = [
      {
        id: 'emoji',
        text: 'Use Emoji',
        onPress: onPressEmojiAvatarFlow,
        icon: (
          <CommIcon
            name="emote-smile-filled"
            size={18}
            style={styles.bottomSheetIcon}
          />
        ),
      },
    ];

    if (ensAvatarURI && childAvatarType === 'user') {
      options.push({
        id: 'ens',
        text: 'Use ENS Avatar',
        onPress: onPressUseENSAvatar,
        icon: (
          <CommIcon
            name="ethereum-outline"
            size={18}
            style={styles.bottomSheetIcon}
          />
        ),
      });
    }

    if (Platform.OS === 'ios') {
      options.push({
        id: 'cancel',
        text: 'Cancel',
        isCancel: true,
      });
    }
    return options;
  }, [
    childAvatarType,
    ensAvatarURI,
    onPressEmojiAvatarFlow,
    onPressUseENSAvatar,
    styles.bottomSheetIcon,
  ]);

  const insets = useSafeAreaInsets();

  const onPressEditAvatar = React.useCallback(() => {
    const texts = editAvatarOptions.map(option => option.text);

    const cancelButtonIndex = editAvatarOptions.findIndex(
      option => option.isCancel,
    );

    const containerStyle = {
      paddingBottom: insets.bottom,
    };

    const icons = editAvatarOptions.map(option => option.icon);

    const onPressAction = (selectedIndex: ?number) => {
      if (
        selectedIndex === null ||
        selectedIndex === undefined ||
        selectedIndex < 0
      ) {
        return;
      }
      const option = editAvatarOptions[selectedIndex];
      if (option.onPress) {
        option.onPress();
      }
    };

    showActionSheetWithOptions(
      {
        options: texts,
        cancelButtonIndex,
        containerStyle,
        icons,
      },
      onPressAction,
    );
  }, [editAvatarOptions, insets.bottom, showActionSheetWithOptions]);

  const editBadge = React.useMemo(() => {
    if (disabled || saveUserAvatarCallLoading) {
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
    saveUserAvatarCallLoading,
    styles.editAvatarIcon,
    styles.editAvatarIconContainer,
  ]);

  const loadingContainer = React.useMemo(() => {
    if (!saveUserAvatarCallLoading) {
      return null;
    }

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }, [saveUserAvatarCallLoading, styles.loadingContainer]);

  return (
    <TouchableOpacity
      onPress={onPressEditAvatar}
      disabled={disabled || saveUserAvatarCallLoading}
    >
      {children}
      {loadingContainer}
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
  bottomSheetIcon: {
    color: '#000000',
  },
  loadingContainer: {
    position: 'absolute',
    backgroundColor: '#000000',
    width: 112,
    height: 112,
    borderRadius: 56,
    opacity: 0.6,
    justifyContent: 'center',
  },
};

export default EditAvatar;
