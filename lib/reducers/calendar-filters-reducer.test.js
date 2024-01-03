// @flow

import {
  removeDeletedThreadIDsFromFilterList,
  removeKeyserverThreadIDsFromFilterList,
} from './calendar-filters-reducer.js';
import type { ThreadStore } from '../types/thread-types';

const calendarFilters = [
  { type: 'threads', threadIDs: ['256|1', '256|83815'] },
];

const threadStore: ThreadStore = {
  threadInfos: {
    '256|1': {
      id: '256|1',
      type: 12,
      name: 'GENESIS',
      description: '',
      color: '648caa',
      creationTime: 1689091732528,
      parentThreadID: null,
      repliesCount: 0,
      containingThreadID: null,
      community: null,
      pinnedCount: 0,
      minimallyEncoded: true,
      members: [
        {
          id: '256',
          role: '256|83796',
          permissions: '3f73ff',
          isSender: true,
          minimallyEncoded: true,
        },
        {
          id: '83810',
          role: '256|83795',
          permissions: '3',
          isSender: false,
          minimallyEncoded: true,
        },
      ],
      roles: {
        '256|83795': {
          id: '256|83795',
          name: 'Members',
          permissions: ['000', '010', '005', '015', '0a7'],
          isDefault: true,
          minimallyEncoded: true,
        },
        '256|83796': {
          id: '256|83796',
          name: 'Admins',
          permissions: ['000', '010', '005', '015', '0a7'],
          isDefault: false,
          minimallyEncoded: true,
        },
      },
      currentUser: {
        role: '256|83795',
        permissions: '3',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
        minimallyEncoded: true,
      },
    },
    '256|83815': {
      id: '256|83815',
      type: 7,
      name: '',
      description:
        'This is your private chat, where you can set reminders and jot notes in private!',
      color: '57697f',
      creationTime: 1689248242797,
      parentThreadID: '256|1',
      repliesCount: 0,
      containingThreadID: '256|1',
      community: '256|1',
      pinnedCount: 0,
      minimallyEncoded: true,
      members: [
        {
          id: '256',
          role: null,
          permissions: '2c7fff',
          isSender: false,
          minimallyEncoded: true,
        },
        {
          id: '83810',
          role: '256|83816',
          permissions: '3026f',
          isSender: true,
          minimallyEncoded: true,
        },
      ],
      roles: {
        '256|83816': {
          id: '256|83816',
          name: 'Members',
          permissions: ['000', '010', '005', '015', '0a7'],
          isDefault: true,
          minimallyEncoded: true,
        },
      },
      currentUser: {
        role: null,
        permissions: '3026f',
        subscription: {
          home: true,
          pushNotifs: true,
        },
        unread: false,
        minimallyEncoded: true,
      },
    },
  },
};

describe('removeDeletedThreadIDsFromFilterList', () => {
  it('Removes threads the user is not a member of anymore', () => {
    expect(
      removeDeletedThreadIDsFromFilterList(
        calendarFilters,
        threadStore.threadInfos,
      ),
    ).toEqual([{ type: 'threads', threadIDs: ['256|1'] }]);
  });
});

const threadIDsToStay = [
  '256|1',
  '256|2',
  '200|4',
  '300|5',
  '300|6',
  '256|100',
];
const threadToRemove1 = '100';
const threadToRemove2 = '400';
const threadIDsToRemove = [
  threadToRemove1 + '|3',
  threadToRemove1 + '|7',
  threadToRemove2 + '|8',
];
const calendarFiltersState = [
  { type: 'not_deleted' },
  {
    type: 'threads',
    threadIDs: [...threadIDsToStay, ...threadIDsToRemove],
  },
];

describe('removeKeyserverThreadIDsFromFilterList', () => {
  it('Removes threads from the given keyserver', () => {
    expect(
      removeKeyserverThreadIDsFromFilterList(calendarFiltersState, [
        threadToRemove1,
        threadToRemove2,
      ]),
    ).toEqual([
      { type: 'not_deleted' },
      {
        type: 'threads',
        threadIDs: threadIDsToStay,
      },
    ]);
  });
});
