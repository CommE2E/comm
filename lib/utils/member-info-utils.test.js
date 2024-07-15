// @flow

import { stripPermissionsFromMemberInfo } from './member-info-utils.js';
import type {
  MemberInfoSansPermissions,
  MemberInfoWithPermissions,
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
