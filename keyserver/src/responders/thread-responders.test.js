// @flow

import { threadTypes } from 'lib/types/thread-types-enum.js';

import { newThreadRequestInputValidator } from './thread-responders.js';

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
      sourceMessageID: 'messageID',
    };

    it('Should require sourceMessageID of a sidebar', () => {
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

    it('Should not require sourceMessageID of not a sidebar', () => {
      expect(
        newThreadRequestInputValidator.is({
          type: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
          ...requestWithoutMessageID,
        }),
      ).toBe(true);

      expect(
        newThreadRequestInputValidator.is({
          type: threadTypes.COMMUNITY_SECRET_SUBTHREAD,
          ...requestWithMessageID,
        }),
      ).toBe(false);
    });
  });
});
