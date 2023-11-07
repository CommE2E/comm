// @flow

import {
  extractKeyserverIDFromID,
  sortCalendarQueryPerKeyserver,
} from './action-utils.js';
import type { CalendarQuery } from '../types/entry-types';

describe('extractKeyserverIDFromID', () => {
  it('should return <keyserverID> for <keyserverID>|<number>', () => {
    const keyserverID = '404';
    const id = keyserverID + '|1234';
    expect(extractKeyserverIDFromID(id)).toBe(keyserverID);
  });

  it('should return <keyserverID> for <keyserverID>', () => {
    const keyserverID = '404';
    expect(extractKeyserverIDFromID(keyserverID)).toBe(keyserverID);
  });
});

describe('sortCalendarQueryPerKeyserver', () => {
  it('should split the calendar query into multiple queries, one for every \
  keyserver, that have all the properties of the original one, \
  but only the thread ids that the keyserver should get', () => {
    const query: CalendarQuery = {
      startDate: '1463588881886',
      endDate: '1463588889886',
      filters: [
        { type: 'not_deleted' },
        {
          type: 'threads',
          threadIDs: ['256|1', '256|2', '100|100', '100|101'],
        },
      ],
    };
    const queriesPerKeyserver = {
      ['256']: {
        startDate: '1463588881886',
        endDate: '1463588889886',
        filters: [
          { type: 'not_deleted' },
          {
            type: 'threads',
            threadIDs: ['256|1', '256|2'],
          },
        ],
      },
      ['100']: {
        startDate: '1463588881886',
        endDate: '1463588889886',
        filters: [
          { type: 'not_deleted' },
          {
            type: 'threads',
            threadIDs: ['100|100', '100|101'],
          },
        ],
      },
    };
    expect(sortCalendarQueryPerKeyserver(query, ['100', '256'])).toEqual(
      queriesPerKeyserver,
    );
  });

  it('should create calendar query for every keyserver in the second argument', () => {
    const query: CalendarQuery = {
      startDate: '1463588881886',
      endDate: '1463588889886',
      filters: [{ type: 'not_deleted' }],
    };
    const queriesPerKeyserver = {
      ['256']: {
        startDate: '1463588881886',
        endDate: '1463588889886',
        filters: [{ type: 'not_deleted' }],
      },
      ['100']: {
        startDate: '1463588881886',
        endDate: '1463588889886',
        filters: [{ type: 'not_deleted' }],
      },
    };
    expect(sortCalendarQueryPerKeyserver(query, ['100', '256'])).toEqual(
      queriesPerKeyserver,
    );
  });
});
