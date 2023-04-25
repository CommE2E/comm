// @flow

import {
  threadStoreThreads,
  threadStoreThreadsWithEmptyRolePermissions,
  threadStoreThreadsWithEmptyRolePermissionsAndMemberPermissions,
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
});
