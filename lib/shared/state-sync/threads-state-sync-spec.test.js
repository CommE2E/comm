// @flow

import { threadsStateSyncSpec } from './threads-state-sync-spec.js';
import { defaultCalendarQuery } from '../../types/entry-types.js';
import { processServerRequestsActionType } from '../../types/request-types.js';
import { threadTypes } from '../../types/thread-types-enum.js';
import { getConfig } from '../../utils/config.js';

jest.mock('../../utils/config.js');

describe('Threads state sync spec', () => {
  describe('find store inconsistencies', () => {
    it('should find inconsistencies from the same keyserver', () => {
      const before = {
        '256|84459': {
          minimallyEncoded: true,
          id: '256|84459',
          type: threadTypes.GENESIS_PRIVATE,
          name: '',
          description: '',
          color: 'b8753d',
          creationTime: 3663,
          parentThreadID: '256|1',
          containingThreadID: '256|1',
          community: '256|1',
          members: [],
          roles: {},
          currentUser: {
            role: '256|84460',
            permissions: '3026f',
            subscription: {
              home: true,
              pushNotifs: true,
            },
            unread: false,
            minimallyEncoded: true,
          },
          repliesCount: 0,
          pinnedCount: 0,
        },
      };

      const after = {
        '256|84459': {
          minimallyEncoded: true,
          id: '256|84459',
          type: threadTypes.GENESIS_PRIVATE,
          name: '',
          description: '',
          color: 'b8753d',
          creationTime: 3663,
          parentThreadID: '256|1',
          containingThreadID: '256|1',
          community: '256|1',
          members: [],
          roles: {},
          currentUser: {
            role: '256|84460',
            permissions: '3026f',
            subscription: {
              home: true,
              pushNotifs: true,
            },
            unread: false,
            minimallyEncoded: true,
          },
          repliesCount: 0,
          pinnedCount: 0,
        },
        '256|123': {
          minimallyEncoded: true,
          id: '256|123',
          type: threadTypes.GENESIS_PRIVATE,
          name: '',
          description: '',
          color: 'b8753d',
          creationTime: 3663,
          parentThreadID: '256|1',
          containingThreadID: '256|1',
          community: '256|1',
          members: [],
          roles: {},
          currentUser: {
            role: '256|84460',
            permissions: '3026f',
            subscription: {
              home: true,
              pushNotifs: true,
            },
            unread: false,
            minimallyEncoded: true,
          },
          repliesCount: 0,
          pinnedCount: 0,
        },
      };

      const action = {
        type: processServerRequestsActionType,
        payload: {
          serverRequests: [],
          calendarQuery: defaultCalendarQuery(
            getConfig().platformDetails.platform,
          ),
          keyserverID: '256',
        },
      };

      expect(
        threadsStateSyncSpec.findStoreInconsistencies(action, before, after)
          .length,
      ).toEqual(1);
    });

    it('should ignore inconsistencies from different keyservers', () => {
      const before = {
        '256|84459': {
          minimallyEncoded: true,
          id: '256|84459',
          type: threadTypes.GENESIS_PRIVATE,
          name: '',
          description: '',
          color: 'b8753d',
          creationTime: 3663,
          parentThreadID: '256|1',
          containingThreadID: '256|1',
          community: '256|1',
          members: [],
          roles: {},
          currentUser: {
            role: '256|84460',
            permissions: '3026f',
            subscription: {
              home: true,
              pushNotifs: true,
            },
            unread: false,
            minimallyEncoded: true,
          },
          repliesCount: 0,
          pinnedCount: 0,
        },
      };

      const after = {
        '256|84459': {
          minimallyEncoded: true,
          id: '256|84459',
          type: threadTypes.GENESIS_PRIVATE,
          name: '',
          description: '',
          color: 'b8753d',
          creationTime: 3663,
          parentThreadID: '256|1',
          containingThreadID: '256|1',
          community: '256|1',
          members: [],
          roles: {},
          currentUser: {
            role: '256|84460',
            permissions: '3026f',
            subscription: {
              home: true,
              pushNotifs: true,
            },
            unread: false,
            minimallyEncoded: true,
          },
          repliesCount: 0,
          pinnedCount: 0,
        },
        '123|123': {
          minimallyEncoded: true,
          id: '123|123',
          type: threadTypes.GENESIS_PRIVATE,
          name: '',
          description: '',
          color: 'b8753d',
          creationTime: 3663,
          parentThreadID: '256|1',
          containingThreadID: '256|1',
          community: '256|1',
          members: [],
          roles: {},
          currentUser: {
            role: '256|84460',
            permissions: '3026f',
            subscription: {
              home: true,
              pushNotifs: true,
            },
            unread: false,
            minimallyEncoded: true,
          },
          repliesCount: 0,
          pinnedCount: 0,
        },
      };

      const action = {
        type: processServerRequestsActionType,
        payload: {
          serverRequests: [],
          calendarQuery: defaultCalendarQuery(
            getConfig().platformDetails.platform,
          ),
          keyserverID: '256',
        },
      };

      expect(
        threadsStateSyncSpec.findStoreInconsistencies(action, before, after)
          .length,
      ).toEqual(0);
    });
  });
});
