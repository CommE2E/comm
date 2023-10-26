// @flow

import type { RawThreadInfos } from 'lib/types/thread-types.js';
import { deepDiff } from 'lib/utils/objects.js';

import { persistMigrationToRemoveDescendantOpenVoiced } from './remove-select-role-permissions.js';
import { threadStoreThreadsWithDescendantOpenVoiced } from './update-roles-and-permissions-test-data.js';

describe('persistMigrationToRemoveDescendantOpenVoiced', () => {
  it("should correctly remove 'descendant_open_voiced' from permissions", () => {
    const migratedRawThreadInfos: RawThreadInfos =
      persistMigrationToRemoveDescendantOpenVoiced(
        threadStoreThreadsWithDescendantOpenVoiced,
      );

    // Only role 256|85027 in thread 256|85022 has
    // 'descendant_open_voiced' permissions included
    const threadDiff = deepDiff(
      threadStoreThreadsWithDescendantOpenVoiced,
      migratedRawThreadInfos,
    );
    expect(threadDiff).toStrictEqual({
      '256|85022': {
        roles: {
          '256|85027': {
            permissions: {
              descendant_open_voiced: true,
            },
          },
        },
      },
    });
  });
});
