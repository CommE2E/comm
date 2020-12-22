// @flow

import { threadTypes } from 'lib/types/thread-types';

import { newThreadRequestInputValidator } from './thread-responders';

describe('Thread responders', () => {
  describe('New thread request validator', () => {
    const requestWithoutMessageID = {
      name: 'name',
      description: 'description',
      color: 'aaaaaa',
      parentThreadID: 'parentID',
      initialMemberIDs: [],
    };
    const requestWithMessageID = {
      ...requestWithoutMessageID,
      initialMessageID: 'messageID',
    };

    it('Should require initialMessageID of a sidebar', () => {
      expect(
        newThreadRequestInputValidator.is({
          type: threadTypes.SIDEBAR,
          ...requestWithoutMessageID,
        }),
      ).toBe(false);

      expect(
        newThreadRequestInputValidator.is({
          type: threadTypes.SIDEBAR,
          ...requestWithMessageID,
        }),
      ).toBe(true);
    });

    it('Should not require initialMessageID of not a sidebar', () => {
      expect(
        newThreadRequestInputValidator.is({
          type: threadTypes.CHAT_SECRET,
          ...requestWithoutMessageID,
        }),
      ).toBe(true);

      expect(
        newThreadRequestInputValidator.is({
          type: threadTypes.CHAT_SECRET,
          ...requestWithMessageID,
        }),
      ).toBe(false);
    });
  });
});
