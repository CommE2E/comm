// @flow

import { entriesStateSyncSpec } from './entries-state-sync-spec.js';
import { processServerRequestsActionType } from '../../types/request-types.js';

jest.mock('../../utils/config.js');

describe('Entries state sync spec', () => {
  describe('find store inconsistencies', () => {
    it('should find inconsistencies from the same keyserver', () => {
      const before = {
        '256|93372': {
          id: '256|93372',
          threadID: '256|84459',
          text: '123',
          year: 2022,
          month: 2,
          day: 27,
          creationTime: 1709035016680,
          creatorID: '84447',
          deleted: false,
        },
      };

      const after = {
        '256|123': {
          id: '256|123',
          threadID: '256|84459',
          text: '123',
          year: 2022,
          month: 2,
          day: 27,
          creationTime: 1709035016680,
          creatorID: '84447',
          deleted: false,
        },
        '256|93372': {
          id: '256|93372',
          threadID: '256|84459',
          text: '123',
          year: 2022,
          month: 2,
          day: 27,
          creationTime: 1709035016680,
          creatorID: '84447',
          deleted: false,
        },
      };

      const action = {
        type: processServerRequestsActionType,
        payload: {
          serverRequests: [],
          calendarQuery: {
            startDate: '2022-01-01',
            endDate: '2022-03-01',
            filters: [],
          },
          keyserverID: '256',
        },
      };

      expect(
        entriesStateSyncSpec.findStoreInconsistencies(action, before, after)
          .length,
      ).toEqual(1);
    });

    it('should ignore inconsistencies from different keyservers', () => {
      const before = {
        '256|93372': {
          id: '256|93372',
          threadID: '256|84459',
          text: '123',
          year: 2022,
          month: 2,
          day: 27,
          creationTime: 1709035016680,
          creatorID: '84447',
          deleted: false,
        },
      };

      const after = {
        '123|123': {
          id: '123|123',
          threadID: '256|84459',
          text: '123',
          year: 2022,
          month: 2,
          day: 27,
          creationTime: 1709035016680,
          creatorID: '84447',
          deleted: false,
        },
        '256|93372': {
          id: '256|93372',
          threadID: '256|84459',
          text: '123',
          year: 2022,
          month: 2,
          day: 27,
          creationTime: 1709035016680,
          creatorID: '84447',
          deleted: false,
        },
      };

      const action = {
        type: processServerRequestsActionType,
        payload: {
          serverRequests: [],
          calendarQuery: {
            startDate: '2022-01-01',
            endDate: '2022-03-01',
            filters: [],
          },
          keyserverID: '256',
        },
      };

      expect(
        entriesStateSyncSpec.findStoreInconsistencies(action, before, after)
          .length,
      ).toEqual(0);
    });
  });
});
