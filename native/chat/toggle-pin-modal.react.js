// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import { logTypes, useDebugLogs } from 'lib/components/debug-logs-context.js';
import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { getMessageForException } from 'lib/utils/errors.js';
import { usePinMessageAction } from 'lib/utils/pin-message-utils.js';

import MessageResult from './message-result.react.js';
import Modal from '../components/modal.react.js';
import PrimaryButton from '../components/primary-button.react.js';
import type { AppNavigationProp } from '../navigation/app-navigator.react.js';
import type { NavigationRoute } from '../navigation/route-names.js';
import { useStyles } from '../themes/colors.js';
import type { ChatComposedMessageInfoItemWithHeight } from '../types/chat-types.js';

export type TogglePinModalParams = {
  +item: ChatComposedMessageInfoItemWithHeight,
  +threadInfo: ThreadInfo,
};

type TogglePinModalProps = {
  +navigation: AppNavigationProp<'TogglePinModal'>,
  +route: NavigationRoute<'TogglePinModal'>,
};

function TogglePinModal(props: TogglePinModalProps): React.Node {
  const { navigation, route } = props;
  const { item, threadInfo } = route.params;
  const { messageInfo, isPinned } = item;
  const styles = useStyles(unboundStyles);

  const [isLoading, setIsLoading] = React.useState(false);

  const pinMessageAction = usePinMessageAction();
  const { addLog } = useDebugLogs();

  const modalInfo = React.useMemo(() => {
    if (isPinned) {
      return {
        name: 'Remove Pinned Message',
        action: 'unpin',
        confirmationText:
          'Are you sure you want to remove this pinned message?',
        buttonText: 'Remove Pinned Message',
        buttonVariant: 'danger',
      };
    }

    return {
      name: 'Pin Message',
      action: 'pin',
      confirmationText:
        'You may pin this message to the channel you are ' +
        'currently viewing. To unpin a message, select the pinned messages ' +
        'icon in the channel.',
      buttonText: 'Pin Message',
      buttonVariant: 'enabled',
    };
  }, [isPinned]);

  const onPress = React.useCallback(async () => {
    const messageID = messageInfo.id;
    invariant(messageID, 'messageInfo.id should be defined');
    setIsLoading(true);
    try {
      await pinMessageAction(messageID, threadInfo.id, modalInfo.action);
      navigation.goBack();
    } catch (error) {
      addLog(
        `Failed to ${modalInfo.action} message`,
        JSON.stringify({
          messageID,
          threadID: threadInfo.id,
          action: modalInfo.action,
          error: getMessageForException(error),
        }),
        new Set([logTypes.ERROR]),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    pinMessageAction,
    messageInfo.id,
    threadInfo.id,
    modalInfo.action,
    navigation,
    addLog,
  ]);

  const onCancel = React.useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <Modal modalStyle={styles.modal}>
      <Text style={styles.modalHeader}>{modalInfo.name}</Text>
      <Text style={styles.modalConfirmationText}>
        {modalInfo.confirmationText}
      </Text>
      <MessageResult
        item={item}
        threadInfo={threadInfo}
        navigation={navigation}
        route={route}
        messageVerticalBounds={null}
        scrollable={true}
      />
      <View style={styles.buttonsContainer}>
        <PrimaryButton
          onPress={onPress}
          label={modalInfo.buttonText}
          variant={isLoading ? 'loading' : modalInfo.buttonVariant}
        />
        <PrimaryButton onPress={onCancel} label="Cancel" variant="outline" />
      </View>
    </Modal>
  );
}

const unboundStyles = {
  modal: {
    backgroundColor: 'modalForeground',
    borderColor: 'modalForegroundBorder',
  },
  modalHeader: {
    fontSize: 18,
    color: 'modalForegroundLabel',
  },
  modalConfirmationText: {
    fontSize: 12,
    color: 'modalBackgroundLabel',
    marginTop: 4,
  },
  buttonsContainer: {
    flexDirection: 'column',
    flex: 1,
    justifyContent: 'flex-end',
    marginBottom: 0,
    height: 72,
    paddingHorizontal: 16,
  },
};

export default TogglePinModal;
