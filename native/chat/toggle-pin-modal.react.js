// @flow

import invariant from 'invariant';
import * as React from 'react';
import { Text, View } from 'react-native';

import type { ThreadInfo } from 'lib/types/minimally-encoded-thread-permissions-types.js';
import { usePinMessageAction } from 'lib/utils/pin-message-utils.js';

import MessageResult from './message-result.react.js';
import Button from '../components/button.react.js';
import Modal from '../components/modal.react.js';
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

  const pinMessageAction = usePinMessageAction();

  const modalInfo = React.useMemo(() => {
    if (isPinned) {
      return {
        name: 'Remove Pinned Message',
        action: 'unpin',
        confirmationText:
          'Are you sure you want to remove this pinned message?',
        buttonText: 'Remove Pinned Message',
        buttonStyle: styles.removePinButton,
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
      buttonStyle: styles.pinButton,
    };
  }, [isPinned, styles.pinButton, styles.removePinButton]);

  const onPress = React.useCallback(() => {
    invariant(messageInfo.id, 'messageInfo.id should be defined');
    void pinMessageAction(messageInfo.id, threadInfo.id, modalInfo.action);
    navigation.goBack();
  }, [
    pinMessageAction,
    messageInfo.id,
    threadInfo.id,
    modalInfo.action,
    navigation,
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
        <Button style={modalInfo.buttonStyle} onPress={onPress}>
          <Text style={styles.textColor}>{modalInfo.buttonText}</Text>
        </Button>
        <Button style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.textColor}>Cancel</Text>
        </Button>
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
  removePinButton: {
    borderRadius: 5,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'vibrantRedButton',
  },
  pinButton: {
    borderRadius: 5,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'purpleButton',
  },
  cancelButton: {
    borderRadius: 5,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textColor: {
    color: 'modalButtonLabel',
  },
};

export default TogglePinModal;
