// @flow

import { memberInfoSansPermissionsValidator } from './minimally-encoded-raw-thread-info-validators.js';

describe('memberInfoSansPermissionsValidator should validate correctly formed MemberInfoSansPermissions', () => {
  test('should validate correctly formed MemberInfoSansPermissions', () => {
    const memberInfoSansPermissions = {
      id: '1',
      role: '2',
      isSender: true,
      minimallyEncoded: true,
    };

    expect(
      memberInfoSansPermissionsValidator.is(memberInfoSansPermissions),
    ).toBe(true);
  });

  test('should NOT validate MemberInfoSansPermissions without id', () => {
    const memberInfoSansPermissions = {
      role: '2',
      isSender: true,
      minimallyEncoded: true,
    };

    expect(
      memberInfoSansPermissionsValidator.is(memberInfoSansPermissions),
    ).toBe(false);
  });
});
