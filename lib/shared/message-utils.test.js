// @flow

import { isInvalidSidebarSource } from './message-utils.js';
import { messageTypes } from '../types/message-types-enum.js';
import { values } from '../utils/objects.js';

describe('isInvalidSidebarSource', () => {
  it('should return true for all message types except for the ones listed', () => {
    values(messageTypes).forEach(messageType => {
      const shouldBeInvalidSidebarSource = isInvalidSidebarSource(messageType);
      if (
        messageType === messageTypes.REACTION ||
        messageType === messageTypes.EDIT_MESSAGE ||
        messageType === messageTypes.SIDEBAR_SOURCE ||
        messageType === messageTypes.TOGGLE_PIN
      ) {
        expect(shouldBeInvalidSidebarSource).toBe(true);
      } else {
        expect(shouldBeInvalidSidebarSource).toBe(false);
      }
    });
  });
});
