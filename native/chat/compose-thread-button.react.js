// @flow

import * as React from 'react';
import { StyleSheet } from 'react-native';

import { createPendingThread } from 'lib/shared/thread-utils.js';
import { threadTypes } from 'lib/types/thread-types.js';

import type { ChatNavigationProp } from './chat.react.js';
import Button from '../components/button.react.js';
import SWMansionIcon from '../components/swmansion-icon.react.js';
import { MessageListRouteName } from '../navigation/route-names.js';
import { useSelector } from '../redux/redux-utils.js';
import { useColors } from '../themes/colors.js';

type Props = {
  +navigate: $PropertyType<ChatNavigationProp<'ChatThreadList'>, 'navigate'>,
};
function ComposeThreadButton(props: Props) {
  const { navigate } = props;
  const viewerID = useSelector(
    state => state.currentUserInfo && state.currentUserInfo.id,
  );
  const onPress = React.useCallback(() => {
    if (!viewerID) {
      return;
    }
    navigate<'MessageList'>({
      name: MessageListRouteName,
      params: {
        threadInfo: createPendingThread({
          viewerID,
          threadType: threadTypes.PRIVATE,
        }),
        searching: true,
      },
    });
  }, [navigate, viewerID]);

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

const MemoizedComposeThreadButton: React.ComponentType<Props> = React.memo<Props>(
  ComposeThreadButton,
);

export default MemoizedComposeThreadButton;
