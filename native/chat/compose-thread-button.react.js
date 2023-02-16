// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';

import { useLoggedInUserInfo } from 'lib/hooks/account-hooks.js';
import { createPendingThread } from 'lib/shared/thread-utils.js';
import { threadTypes } from 'lib/types/thread-types.js';

import type { ChatNavigationProp } from './chat.react.js';
import Button from '../components/button.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { MessageListRouteName } from '../navigation/route-names.js';
import { useColors } from '../themes/colors.js';

type Props = {
  +navigate: $PropertyType<ChatNavigationProp<'ChatThreadList'>, 'navigate'>,
};
function ComposeThreadButton(props: Props) {
  const { navigate } = props;
  const loggedInUserInfo = useLoggedInUserInfo();
  const onPress = React.useCallback(() => {
    if (!loggedInUserInfo) {
      return;
    }
    navigate<'MessageList'>({
      name: MessageListRouteName,
      params: {
        threadInfo: createPendingThread({
          viewerID: loggedInUserInfo.id,
          threadType: threadTypes.PRIVATE,
          members: [loggedInUserInfo],
        }),
        searching: true,
      },
    });
  }, [navigate, loggedInUserInfo]);

  const { listForegroundSecondaryLabel } = useColors();
  return (
    <Button onPress={onPress} androidBorderlessRipple={true}>
      <SWMansionIcon
        name="edit-4"
        size={26}
        style={styles.composeButton}
        color={listForegroundSecondaryLabel}
      />
    </Button>
  );
}

const styles = StyleSheet.create({
  composeButton: {
    marginRight: 16,
  },
});

const MemoizedComposeThreadButton: React.ComponentType<Props> =
  React.memo<Props>(ComposeThreadButton);

export default MemoizedComposeThreadButton;
