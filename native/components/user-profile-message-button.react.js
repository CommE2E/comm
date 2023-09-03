// @flow

import { useBottomSheetModal } from '@gorhom/bottom-sheet';
import * as React from 'react';
import { Text } from 'react-native';

import type { ThreadInfo } from 'lib/types/thread-types.js';
import type { UserInfo } from 'lib/types/user-types';

import Button from './button.react.js';
import SWMansionIcon from './swmansion-icon.react.js';
import { useNavigateToThread } from '../chat/message-list-types.js';
import { useStyles } from '../themes/colors.js';

type Props = {
  +threadInfo: ThreadInfo,
  +pendingPersonalThreadUserInfo?: UserInfo,
};

function UserProfileMessageButton(props: Props): React.Node {
  const { threadInfo, pendingPersonalThreadUserInfo } = props;

  const { dismiss } = useBottomSheetModal();

  const styles = useStyles(unboundStyles);

  const navigateToThread = useNavigateToThread();

  const onPressMessage = React.useCallback(() => {
    dismiss();
    navigateToThread({
      threadInfo,
      pendingPersonalThreadUserInfo,
    });
  }, [dismiss, navigateToThread, pendingPersonalThreadUserInfo, threadInfo]);

  return (
    <Button style={styles.messageButtonContainer} onPress={onPressMessage}>
      <SWMansionIcon name="send-2" size={22} style={styles.messageButtonIcon} />
      <Text style={styles.messageButtonText}>Message</Text>
    </Button>
  );
}

const unboundStyles = {
  messageButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'purpleButton',
    paddingVertical: 8,
    marginTop: 16,
    borderRadius: 8,
  },
  messageButtonIcon: {
    color: 'floatingButtonLabel',
    paddingRight: 8,
  },
  messageButtonText: {
    color: 'floatingButtonLabel',
  },
};

export default UserProfileMessageButton;
