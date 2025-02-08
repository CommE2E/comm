// @flow

import { messageSpecs } from 'lib/shared/messages/message-specs.js';
import { messageTypes } from 'lib/types/message-types-enum.js';

import { commConstants } from '../native-modules.js';
import Alert from '../utils/alert.js';

if (__DEV__) {
  const messageTypesCpp = new Set(commConstants.NATIVE_MESSAGE_TYPES);
  const missingMessageTypesCpp = [];
  for (const messageName in messageTypes) {
    const messageType = messageTypes[messageName];
    if (
      messageSpecs[messageType]?.getMessageNotifyType &&
      !messageTypesCpp.has(messageType)
    ) {
      missingMessageTypesCpp.push(messageName);
    }
  }

  if (missingMessageTypesCpp.length !== 0) {
    Alert.alert(
      'C++ MessageSpecs missing',
      'C++ MessageSpec implementation missing for message types: ' +
        missingMessageTypesCpp.join(', '),
    );
  }
}
