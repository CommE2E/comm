// @flow

import {
  threadStoreThreads,
  threadStoreThreadsWithEmptyRolePermissions,
  threadStoreThreadsWithEmptyRolePermissionsAndMemberPermissions,
  threadStoreThreadsWithEmptyRoleAndMemberAndCurrentUserPermissions,
} from './update-roles-and-permissions-test-data.js';
import { updateRolesAndPermissions } from './update-roles-and-permissions.js';

describe('updateRolesAndPermissions()', () => {
  it('should leave threadStoreThreads from server unchanged', () => {
    expect(updateRolesAndPermissions(threadStoreThreads)).toStrictEqual(
      threadStoreThreads,
    );
  });

  it('should construct role permissions when missing from existing store', () => {
    expect(
      updateRolesAndPermissions(threadStoreThreadsWithEmptyRolePermissions),
    ).toStrictEqual(threadStoreThreads);
  });

  it('should construct role permissions AND member permissions when missing from existing store', () => {
    expect(
      updateRolesAndPermissions(
        threadStoreThreadsWithEmptyRolePermissionsAndMemberPermissions,
      ),
    ).toStrictEqual(threadStoreThreads);
  });

  it('should construct role permissions AND member permissions AND current user permissions when missing from existing store', () => {
    expect(
      updateRolesAndPermissions(
        threadStoreThreadsWithEmptyRoleAndMemberAndCurrentUserPermissions,
      ),
    ).toStrictEqual(threadStoreThreads);
  });
});
