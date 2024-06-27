// @flow

import reduceCalendarFilters, {
  removeDeletedThreadIDsFromFilterList,
  removeKeyserverThreadIDsFromFilterList,
} from './calendar-filters-reducer.js';
import { keyserverAuthActionTypes } from '../actions/user-actions.js';
import type { RawMessageInfo } from '../types/message-types.js';
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
          isSender: true,
          minimallyEncoded: true,
        },
        {
          id: '83810',
          role: '256|83795',
          isSender: false,
          minimallyEncoded: true,
        },
      ],
      roles: {
        '256|83795': {
          id: '256|83795',
          name: 'Members',
          permissions: ['000', '010', '005', '015', '0a7'],
          minimallyEncoded: true,
        },
        '256|83796': {
          id: '256|83796',
          name: 'Admins',
          permissions: ['000', '010', '005', '015', '0a7'],
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
          isSender: false,
          minimallyEncoded: true,
        },
        {
          id: '83810',
          role: '256|83816',
          isSender: true,
          minimallyEncoded: true,
        },
      ],
      roles: {
        '256|83816': {
          id: '256|83816',
          name: 'Members',
          permissions: ['000', '010', '005', '015', '0a7'],
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
const keyserverToRemove1 = '100';
const keyserverToRemove2 = '400';
const threadIDsToRemove = [
  keyserverToRemove1 + '|3',
  keyserverToRemove1 + '|7',
  keyserverToRemove2 + '|8',
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
        keyserverToRemove1,
        keyserverToRemove2,
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

describe('reduceCalendarFilters', () => {
  it('Removes from filters thread ids of the keyservers that were logged into', () => {
    const messageInfos: RawMessageInfo[] = [];
    const payload = {
      currentUserInfo: { id: '5', username: 'me' },
      preRequestUserInfo: { id: '5', username: 'me' },
      threadInfos: {},
      messagesResult: {
        currentAsOf: {},
        messageInfos,
        truncationStatus: {},
        watchedIDsAtRequestTime: [],
      },
      userInfos: [],
      calendarResult: {
        rawEntryInfos: [],
        calendarQuery: { startDate: '0', endDate: '0', filters: [] },
      },
      // only updatesCurrentAsOf is relevant to this test
      updatesCurrentAsOf: { [keyserverToRemove1]: 5, [keyserverToRemove2]: 5 },
      authActionSource: 'SOCKET_AUTH_ERROR_RESOLUTION_ATTEMPT',
    };

    expect(
      reduceCalendarFilters(
        calendarFiltersState,
        {
          type: keyserverAuthActionTypes.success,
          payload,
          loadingInfo: {
            customKeyName: null,
            trackMultipleRequests: false,
            fetchIndex: 1,
          },
        },
        { threadInfos: {} },
      ),
    ).toEqual([
      { type: 'not_deleted' },
      {
        type: 'threads',
        threadIDs: threadIDsToStay,
      },
    ]);
  });
});
