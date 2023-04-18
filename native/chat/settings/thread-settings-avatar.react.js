// @flow

import { useNavigation } from '@react-navigation/native';
import * as React from 'react';
import { View } from 'react-native';

import { type ResolvedThreadInfo } from 'lib/types/thread-types.js';

import EditAvatar from '../../avatars/edit-avatar.react.js';
import ThreadAvatar from '../../avatars/thread-avatar.react.js';
import { EmojiAvatarCreationRouteName } from '../../navigation/route-names.js';
import { useStyles } from '../../themes/colors.js';

type Props = {
  +threadInfo: ResolvedThreadInfo,
  +canChangeSettings: boolean,
};
function ThreadSettingsAvatar(props: Props): React.Node {
  const { threadInfo, canChangeSettings } = props;

  const { navigate } = useNavigation();

  const styles = useStyles(unboundStyles);

  const onPressEmojiAvatarFlow = React.useCallback(() => {
    navigate<'EmojiAvatarCreation'>({
      name: EmojiAvatarCreationRouteName,
      params: {
        threadID: threadInfo.id,
        containingThreadID: threadInfo.containingThreadID,
      },
    });
  }, [navigate, threadInfo.containingThreadID, threadInfo.id]);

  return (
    <View style={styles.container}>
      <EditAvatar
        onPressEmojiAvatarFlow={onPressEmojiAvatarFlow}
        disabled={!canChangeSettings}
      >
        <ThreadAvatar size="profile" threadInfo={threadInfo} />
      </EditAvatar>
    </View>
  );
}

const unboundStyles = {
  container: {
    alignItems: 'center',
    backgroundColor: 'panelForeground',
    flex: 1,
    paddingVertical: 16,
  },
};

const MemoizedThreadSettingsAvatar: React.ComponentType<Props> =
  React.memo<Props>(ThreadSettingsAvatar);

export default MemoizedThreadSettingsAvatar;
