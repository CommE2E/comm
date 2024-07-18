// @flow

import {
  keyedThreadStoreInfos,
  keyedThreadStoreInfosSansMemberPermissions,
  rawThreadInfoSansMemberPermissions,
  rawThreadInfoWithMemberPermissions,
} from './member-info-utils-test-data.js';
import {
  stripMemberPermissionsFromRawThreadInfo,
  stripMemberPermissionsFromRawThreadInfos,
  stripPermissionsFromMemberInfo,
} from './member-info-utils.js';
import type {
  MemberInfoSansPermissions,
  MemberInfoWithPermissions,
  RawThreadInfo,
} from '../types/minimally-encoded-thread-permissions-types.js';

describe('stripPermissionsFromMemberInfo', () => {
  test('should produce valid MemberInfoSansPermissions', () => {
    const memberInfoWithPermissions: MemberInfoWithPermissions = {
      id: '1',
      role: '2',
      isSender: true,
      minimallyEncoded: true,
      permissions: '3',
    };

    const memberInfoSansPermissions: MemberInfoSansPermissions =
      stripPermissionsFromMemberInfo(memberInfoWithPermissions);

    expect(memberInfoSansPermissions).toEqual({
      id: '1',
      role: '2',
      isSender: true,
      minimallyEncoded: true,
    });
  });
});

describe('stripMemberPermissionsFromRawThreadInfo', () => {
  test('should produce valid RawThreadInfo', () => {
    const strippedRawThreadInfo: RawThreadInfo =
      stripMemberPermissionsFromRawThreadInfo(
        rawThreadInfoWithMemberPermissions,
      );

    expect(strippedRawThreadInfo).toEqual(rawThreadInfoSansMemberPermissions);
  });
});

describe('stripMemberPermissionsFromRawThreadInfos', () => {
  test('should strip member permissions from RawThreadInfos', () => {
    const strippedRawThreadInfos = stripMemberPermissionsFromRawThreadInfos(
      keyedThreadStoreInfos,
    );
    expect(strippedRawThreadInfos).toEqual(
      keyedThreadStoreInfosSansMemberPermissions,
    );
  });
});
