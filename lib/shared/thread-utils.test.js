// @flow

import {
  parsePendingThreadID,
  threadInfoFromRawThreadInfo,
} from './thread-utils.js';
import { threadInfoValidator } from '../permissions/minimally-encoded-thread-permissions-validators.js';
import type { RawThreadInfo } from '../types/minimally-encoded-thread-permissions-types.js';
import { threadTypes } from '../types/thread-types-enum.js';
import type { UserInfos } from '../types/user-types.js';

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

const rawThreadInfo: RawThreadInfo = {
  id: '1',
  type: threadTypes.GENESIS,
  name: 'GENESIS',
  description:
    'This is the first community on Comm. In the future it will be possible to create chats outside of a community, but for now all of these chats get set with GENESIS as their parent. GENESIS is hosted on Ashoat’s keyserver.',
  color: 'c85000',
  creationTime: 1702415956354,
  parentThreadID: null,
  repliesCount: 0,
  containingThreadID: null,
  community: null,
  pinnedCount: 0,
  minimallyEncoded: true,
  members: [
    {
      id: '256',
      role: '83796',
      permissions: '3f73ff',
      isSender: false,
      minimallyEncoded: true,
    },
    {
      id: '83809',
      role: '83795',
      permissions: '3',
      isSender: false,
      minimallyEncoded: true,
    },
  ],
  roles: {
    '83795': {
      id: '83795',
      name: 'Members',
      permissions: ['000', '010', '005', '015', '0a7'],
      isDefault: true,
      minimallyEncoded: true,
    },
    '83796': {
      id: '83796',
      name: 'Admins',
      permissions: [
        '000',
        '010',
        '020',
        '100',
        '110',
        '030',
        '040',
        '060',
        '050',
        '120',
        '080',
        '090',
        '0c0',
        '070',
        '0d0',
        '0e0',
        '130',
        '140',
        '150',
        '004',
        '014',
        '0a6',
        '0a8',
        '024',
        '034',
        '044',
        '064',
        '054',
        '124',
        '086',
        '096',
        '0c4',
        '074',
        '0b4',
        '0d4',
        '0e4',
        '134',
        '156',
      ],
      isDefault: false,
      minimallyEncoded: true,
    },
  },
  currentUser: {
    role: '83795',
    permissions: '3',
    subscription: {
      home: true,
      pushNotifs: true,
    },
    unread: false,
    minimallyEncoded: true,
  },
};
const userInfos: UserInfos = {
  '5': {
    id: '5',
    username: 'commbot',
  },
  '256': {
    id: '256',
    username: 'ashoat',
  },
  '83809': {
    id: '83809',
    username: 'atul',
    avatar: {
      type: 'emoji',
      emoji: '😲',
      color: '4b87aa',
    },
  },
};

describe('threadInfoFromRawThreadInfo', () => {
  it('should return correctly formed ThreadInfo from RawThreadInfo', () => {
    const threadInfo = threadInfoFromRawThreadInfo(
      rawThreadInfo,
      null,
      userInfos,
    );

    expect(threadInfoValidator.is(threadInfo)).toBe(true);
  });
});
