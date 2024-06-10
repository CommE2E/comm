// @flow

import { legacyUpdateRolesAndPermissions } from 'lib/shared/redux/legacy-update-roles-and-permissions.js';

import {
  threadStoreThreads,
  threadStoreThreadsWithEmptyRolePermissions,
  threadStoreThreadsWithEmptyRolePermissionsAndMemberPermissions,
  threadStoreThreadsWithEmptyRoleAndMemberAndCurrentUserPermissions,
} from './update-roles-and-permissions-test-data.js';

describe.skip('updateRolesAndPermissions()', () => {
  it('should leave threadStoreThreads from server unchanged', () => {
    expect(legacyUpdateRolesAndPermissions(threadStoreThreads)).toStrictEqual(
      threadStoreThreads,
    );
  });

  it('should construct role permissions when missing from existing store', () => {
    expect(
      legacyUpdateRolesAndPermissions(
        threadStoreThreadsWithEmptyRolePermissions,
      ),
    ).toStrictEqual(threadStoreThreads);
  });

  it('should construct role permissions AND member permissions when missing from existing store', () => {
    expect(
      legacyUpdateRolesAndPermissions(
        threadStoreThreadsWithEmptyRolePermissionsAndMemberPermissions,
      ),
    ).toStrictEqual(threadStoreThreads);
  });

  it('should construct role permissions AND member permissions AND current user permissions when missing from existing store', () => {
    expect(
      legacyUpdateRolesAndPermissions(
        threadStoreThreadsWithEmptyRoleAndMemberAndCurrentUserPermissions,
      ),
    ).toStrictEqual(threadStoreThreads);
  });
});
