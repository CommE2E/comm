// @flow

import type { RawThreadInfos } from 'lib/types/thread-types.js';
import { deepDiff } from 'lib/utils/objects.js';

import { persistMigrationToRemoveSelectRolePermissions } from './remove-select-role-permissions.js';
import { threadStoreThreadsWithIncorrectPermissions } from './update-roles-and-permissions-test-data.js';

describe('persistMigrationToRemoveDescendantOpenVoiced', () => {
  it("should correctly remove 'descendant_open_voiced' from permissions", () => {
    const migratedRawThreadInfos: RawThreadInfos =
      persistMigrationToRemoveSelectRolePermissions(
        threadStoreThreadsWithIncorrectPermissions,
      );

    const threadDiff = deepDiff(
      threadStoreThreadsWithIncorrectPermissions,
      migratedRawThreadInfos,
    );

    expect(threadDiff).toStrictEqual({
      '256|84852': {
        roles: {
          '256|84853': {
            permissions: {
              descendant_add_members: true,
              descendant_edit_message: true,
              descendant_react_to_message: true,
              join_thread: true,
            },
          },
          '256|84854': {
            permissions: {
              descendant_add_members: true,
              descendant_change_role: true,
              descendant_edit_entries: true,
              descendant_edit_permissions: true,
              descendant_edit_thread: true,
              descendant_edit_thread_avatar: true,
              descendant_edit_thread_color: true,
              descendant_edit_thread_description: true,
              descendant_manage_pins: true,
              descendant_remove_members: true,
              descendant_toplevel_create_sidebars: true,
              descendant_toplevel_create_subthreads: true,
            },
          },
        },
      },
      '256|85022': {
        roles: {
          '256|85024': {
            permissions: {
              descendant_add_members: true,
              descendant_change_role: true,
              descendant_edit_entries: true,
              descendant_edit_permissions: true,
              descendant_edit_thread: true,
              descendant_edit_thread_avatar: true,
              descendant_edit_thread_color: true,
              descendant_edit_thread_description: true,
              descendant_manage_pins: true,
              descendant_remove_members: true,
              descendant_toplevel_create_sidebars: true,
              descendant_toplevel_create_subthreads: true,
            },
          },
          '256|85027': {
            permissions: {
              descendant_open_voiced: true,
              join_thread: true,
            },
          },
        },
      },
    });
  });
});
