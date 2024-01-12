// @flow

import {
  parsePendingThreadID,
  getThreadIDsForKeyservers,
} from './thread-utils.js';
import { threadTypes } from '../types/thread-types-enum.js';

describe('parsePendingThreadID(pendingThreadID: string)', () => {
  it('should return correct data for real pending sidebar ID', () => {
    const sidebarResult = {
      threadType: threadTypes.SIDEBAR,
      memberIDs: [],
      sourceMessageID: '12345',
    };
    expect(parsePendingThreadID('pending/sidebar/12345')).toStrictEqual(
      sidebarResult,
    );

    const sidebarResultWithNewSchema = {
      threadType: threadTypes.SIDEBAR,
      memberIDs: [],
      sourceMessageID: '789|12345',
    };
    expect(parsePendingThreadID('pending/sidebar/789|12345')).toStrictEqual(
      sidebarResultWithNewSchema,
    );
  });

  it('should return correct data for real pending sidebar ID', () => {
    const pendingPersonalResult = {
      threadType: threadTypes.PERSONAL,
      memberIDs: ['83810', '86622'],
      sourceMessageID: null,
    };
    expect(parsePendingThreadID('pending/type6/83810+86622')).toStrictEqual(
      pendingPersonalResult,
    );

    const pendingCommunityOpenResult = {
      threadType: threadTypes.COMMUNITY_OPEN_SUBTHREAD,
      memberIDs: ['83810', '86622', '83889'],
      sourceMessageID: null,
    };
    expect(
      parsePendingThreadID('pending/type3/83810+86622+83889'),
    ).toStrictEqual(pendingCommunityOpenResult);
  });

  it('should return null when there are missing information in ID', () => {
    expect(parsePendingThreadID('pending/type4/')).toBeNull();
    expect(parsePendingThreadID('type12/83810+86622')).toBeNull();
    expect(parsePendingThreadID('pending/83810')).toBeNull();
    expect(parsePendingThreadID('pending')).toBeNull();
    expect(parsePendingThreadID('')).toBeNull();
    expect(parsePendingThreadID('pending/something/12345')).toBeNull();
  });

  it('should return null when the format is invalid', () => {
    expect(parsePendingThreadID('someothertext/type1/12345')).toBeNull();
    expect(parsePendingThreadID('pending/type6/12312+++11+12')).toBeNull();
    expect(parsePendingThreadID('pending/type3/83810+')).toBeNull();
  });

  it('should throw invariant violation when thread type is invalid ', () => {
    expect(() => parsePendingThreadID('pending/type123/12345')).toThrowError(
      'number is not ThreadType enum',
    );
  });
});

const keyserver1 = '256';
const keyserver2 = '100';
const keyserver3 = '200';
const keyserver1ThreadIDs = [
  keyserver1 + '|1',
  keyserver1 + '|2',
  keyserver1 + '|3',
];
const keyserver2ThreadIDs = [
  keyserver2 + '|1',
  keyserver2 + '|2',
  keyserver2 + '|3',
];
const keyserver3ThreadIDs = [
  keyserver3 + '|1',
  keyserver3 + '|2',
  keyserver3 + '|3',
];

describe('getThreadIDsForKeyservers', () => {
  it('should return thread belonging to specified keyservers', () => {
    expect(
      getThreadIDsForKeyservers(
        [
          ...keyserver1ThreadIDs,
          ...keyserver2ThreadIDs,
          ...keyserver3ThreadIDs,
        ],
        [keyserver1, keyserver2],
      ),
    ).toEqual([...keyserver1ThreadIDs, ...keyserver2ThreadIDs]);
  });
});
