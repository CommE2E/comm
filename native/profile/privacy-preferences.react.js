// @flow

import * as React from 'react';
import { View, Text } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

// import { changeThreadSettings } from 'lib/actions/thread-actions.js';
import {
  updateUserAvatar,
  updateUserAvatarActionTypes,
} from 'lib/actions/user-actions.js';
import type {
  ClientAvatar,
  UpdateUserAvatarRemoveRequest,
} from 'lib/types/avatar-types.js';
import {
  useServerCall,
  useDispatchActionPromise,
} from 'lib/utils/action-utils.js';

import ToggleReport from './toggle-report.react.js';
import Button from '../components/button.react.js';
import { useSelector } from '../redux/redux-utils.js';
import { useStyles } from '../themes/colors.js';

// eslint-disable-next-line no-unused-vars
function PrivacyPreferences(props: { ... }): React.Node {
  const styles = useStyles(unboundStyles);
  const dispatchActionPromise = useDispatchActionPromise();
  const updateUserAvatarCall = useServerCall(updateUserAvatar);
  // const changeThreadSettingsCall = useServerCall(changeThreadSettings);

  const userAvatar: ?ClientAvatar = useSelector(
    state => state.currentUserInfo?.avatar,
  );

  // eslint-disable-next-line no-unused-vars
  const updateUserAvatarCallback = React.useCallback(() => {
    const emojiUpdateRequest = {
      type: 'emoji',
      emoji: '🍔',
      color: '4b87aa',
    };

    dispatchActionPromise(
      updateUserAvatarActionTypes,
      updateUserAvatarCall(emojiUpdateRequest),
    );
  }, [dispatchActionPromise, updateUserAvatarCall]);

  // const updateThreadAvatarCallback = React.useCallback(() => {
  //   const emojiUpdateRequest = {
  //     type: 'emoji',
  //     emoji: '🍔',
  //     color: '4b87aa',
  //   };

  //   const updateThreadRequest: UpdateThreadRequest = {
  //     threadID: '84656',
  //     changes: {
  //       avatar: emojiUpdateRequest,
  //     },
  //   };

  //   dispatchActionPromise(
  //     changeThreadSettingsActionTypes,
  //     changeThreadSettingsCall(updateThreadRequest),
  //   );
  // }, [changeThreadSettingsCall, dispatchActionPromise]);

  // eslint-disable-next-line no-unused-vars
  const clearUserAvatarCallback = React.useCallback(() => {
    const removeAvatarRequest: UpdateUserAvatarRemoveRequest = {
      type: 'remove',
    };
    dispatchActionPromise(
      updateUserAvatarActionTypes,
      updateUserAvatarCall(removeAvatarRequest),
    );
  }, [dispatchActionPromise, updateUserAvatarCall]);

  // const clearThreadAvatarCallback = React.useCallback(() => {
  //   const removeUpdateRequest: UpdateUserAvatarRemoveRequest = {
  //     type: 'remove',
  //   };

  //   const updateThreadRequest: UpdateThreadRequest = {
  //     threadID: '84656',
  //     changes: {
  //       avatar: removeUpdateRequest,
  //     },
  //   };

  //   dispatchActionPromise(
  //     changeThreadSettingsActionTypes,
  //     changeThreadSettingsCall(updateThreadRequest),
  //   );
  // }, [changeThreadSettingsCall, dispatchActionPromise]);

  const possiblyEmojiAvatar = React.useMemo(() => {
    if (!userAvatar || userAvatar.type !== 'emoji') {
      return;
    }
    return (
      // eslint-disable-next-line react-native/no-inline-styles
      <View
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          backgroundColor: `#${userAvatar.color}`,
          height: 100,
          width: 200,
        }}
      >
        <Text>{userAvatar.emoji}</Text>
      </View>
    );
  }, [userAvatar]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollViewContentContainer}
      style={styles.scrollView}
    >
      <Text style={styles.header}>REPORTS</Text>
      <View style={styles.section}>
        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Toggle crash reports</Text>
          <ToggleReport reportType="crashReports" />
        </View>

        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Toggle media reports</Text>
          <ToggleReport reportType="mediaReports" />
        </View>

        <View style={styles.submenuButton}>
          <Text style={styles.submenuText}>Toggle inconsistency reports</Text>
          <ToggleReport reportType="inconsistencyReports" />
        </View>
      </View>
      <Button onPress={updateUserAvatarCallback}>
        <View>
          <Text style={styles.submenuText}>Set the user avatar</Text>
        </View>
      </Button>
      <Button onPress={clearUserAvatarCallback}>
        <View>
          <Text style={styles.submenuText}>Clear the user avatar</Text>
        </View>
      </Button>
      {possiblyEmojiAvatar}
    </ScrollView>
  );
}

const unboundStyles = {
  scrollView: {
    backgroundColor: 'panelBackground',
  },
  scrollViewContentContainer: {
    paddingTop: 24,
  },
  section: {
    backgroundColor: 'panelForeground',
    borderBottomWidth: 1,
    borderColor: 'panelForegroundBorder',
    borderTopWidth: 1,
    marginBottom: 24,
    marginVertical: 2,
  },
  header: {
    color: 'panelBackgroundLabel',
    fontSize: 12,
    fontWeight: '400',
    paddingBottom: 3,
    paddingHorizontal: 24,
  },
  submenuButton: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 10,
    alignItems: 'center',
  },
  submenuText: {
    color: 'panelForegroundLabel',
    flex: 1,
    fontSize: 16,
  },
};

export default PrivacyPreferences;
