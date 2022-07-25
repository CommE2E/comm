// @flow

import { threadTypes } from '../types/thread-types';
import { parseLocallyUniqueThreadID } from './thread-utils';

describe('parseLocallyUniqueThreadID(pendingThreadID: string)', () => {
  it('should return correct data for real pending sidebar ID', () => {
    const sidebarResult = {
      threadType: threadTypes.SIDEBAR,
      memberIDs: [],
      sourceMessageID: '12345',
    };
    expect(parseLocallyUniqueThreadID('pending/sidebar/12345')).toStrictEqual(
      sidebarResult,
    );
  });

  it('should return correct data for real pending sidebar ID', () => {
    const pendingPersonalResult = {
      threadType: threadTypes.PERSONAL,
      memberIDs: ['83810', '86622'],
      sourceMessageID: null,
    };
    expect(
      parseLocallyUniqueThreadID('pending/type6/83810+86622'),
    ).toStrictEqual(pendingPersonalResult);

    const pendingCommunityOpenResult = {
      threadType: threadTypes.COMMUNITY_OPEN_SUBTHREAD,
      memberIDs: ['83810', '86622', '83889'],
      sourceMessageID: null,
    };
    expect(
      parseLocallyUniqueThreadID('pending/type3/83810+86622+83889'),
    ).toStrictEqual(pendingCommunityOpenResult);
  });

  it('should return null when there are missing information in ID', () => {
    expect(parseLocallyUniqueThreadID('pending/type4/')).toBeNull();
    expect(parseLocallyUniqueThreadID('type12/83810+86622')).toBeNull();
    expect(parseLocallyUniqueThreadID('pending/83810')).toBeNull();
    expect(parseLocallyUniqueThreadID('pending')).toBeNull();
    expect(parseLocallyUniqueThreadID('')).toBeNull();
    expect(parseLocallyUniqueThreadID('pending/something/12345')).toBeNull();
  });

  it('should return null when the format is invalid', () => {
    expect(parseLocallyUniqueThreadID('someothertext/type1/12345')).toBeNull();
    expect(
      parseLocallyUniqueThreadID('pending/type6/12312+++11+12'),
    ).toBeNull();
    expect(parseLocallyUniqueThreadID('pending/type3/83810+')).toBeNull();
  });

  it('should throw invariant violation when thread type is invalid ', () => {
    expect(() =>
      parseLocallyUniqueThreadID('pending/type123/12345'),
    ).toThrowError('number is not ThreadType enum');
  });
});
