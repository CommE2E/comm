// @flow

import invariant from 'invariant';

import ashoat from 'lib/facts/ashoat.js';
import type { RawMessageInfo } from 'lib/types/message-types.js';
import type {
  ThreadPermission,
  ThreadPermissionsInfo,
  ThreadRolePermissionsBlob,
} from 'lib/types/thread-permission-types.js';
import { threadTypes } from 'lib/types/thread-types-enum.js';
import type { RawThreadInfos } from 'lib/types/thread-types.js';
import { hash } from 'lib/utils/objects.js';

import { main } from './utils.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import { createScriptViewer } from '../session/scripts.js';
import { compressMessage } from '../utils/compress.js';

const viewer = createScriptViewer(ashoat.id);

const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
const messageSelectionCriteria = { joinedThreads: true, newerThan: oneWeekAgo };

async function testThreadStoreReductions() {
  const [{ threadInfos }, { rawMessageInfos }] = await Promise.all([
    fetchThreadInfos(viewer),
    fetchMessageInfos(viewer, messageSelectionCriteria, 1),
  ]);
  const beforeReductions = JSON.stringify(threadInfos);
  const beforeBytes = new Blob([beforeReductions]).size;
  const beforeCompressed = await compressMessage(beforeReductions);
  invariant(beforeCompressed.compressed, 'should be compressed');
  const beforeCompressedBytes = new Blob([beforeCompressed.result.data]).size;
  console.log(
    `before reductions, Ashoat's ThreadStore is ${beforeBytes} bytes large ` +
      `(${beforeCompressedBytes} bytes compressed)`,
  );

  const withoutOldSidebars = filterOutOldSidebars(threadInfos, rawMessageInfos);
  await testSolution(
    withoutOldSidebars,
    'Ashoat',
    '[A] filtering out old sidebars',
  );

  const improvedEncoding = improveEncoding(threadInfos);
  await testSolution(improvedEncoding, 'Ashoat', '[B] improving encoding');

  const afterIsAdminRole = introduceIsAdminRole(threadInfos);
  await testSolution(afterIsAdminRole, 'Ashoat', '[C] introducing isAdminRole');

  const afterRoleStore = introduceThreadRolePermissionsStore(threadInfos);
  await testSolution(
    afterRoleStore,
    'Ashoat',
    '[D] introducing ThreadRolePermissionsStore',
  );

  const testAB = improveEncoding(withoutOldSidebars);
  await testSolution(testAB, 'Ashoat', '[A] and [B]');

  const testAC = introduceIsAdminRole(withoutOldSidebars);
  await testSolution(testAC, 'Ashoat', '[A] and [C]');

  const testAD = introduceThreadRolePermissionsStore(withoutOldSidebars);
  await testSolution(testAD, 'Ashoat', '[A] and [D]');

  const testBC = introduceIsAdminRole(improvedEncoding);
  await testSolution(testBC, 'Ashoat', '[B] and [C]');

  const testBD = introduceThreadRolePermissionsStore(improvedEncoding);
  await testSolution(testBD, 'Ashoat', '[B] and [D]');

  const testCD = introduceThreadRolePermissionsStore(afterIsAdminRole);
  await testSolution(testCD, 'Ashoat', '[C] and [D]');

  const testABC = introduceIsAdminRole(testAB);
  await testSolution(testABC, 'Ashoat', '[A], [B], and [C]');

  const testABD = introduceThreadRolePermissionsStore(testAB);
  await testSolution(testABD, 'Ashoat', '[A], [B], and [D]');

  const testACD = introduceThreadRolePermissionsStore(testAC);
  await testSolution(testACD, 'Ashoat', '[A], [C], and [D]');

  const testBCD = introduceThreadRolePermissionsStore(testBC);
  await testSolution(testBCD, 'Ashoat', '[B], [C], and [D]');

  const testABCD = introduceThreadRolePermissionsStore(testABC);
  await testSolution(testABCD, 'Ashoat', '[A], [B], [C], and [D]');
}

async function testSolution(blob: mixed, person: string, descriptor: string) {
  const stringified = JSON.stringify(blob);
  invariant(stringified, 'stringified result should be truthy');
  const numBytes = new Blob([stringified]).size;
  const compressed = await compressMessage(stringified);
  invariant(compressed.compressed, 'should be compressed');
  const compressedBytes = new Blob([compressed.result.data]).size;
  console.log(
    `after ${descriptor}, ${person}'s ThreadStore is ${numBytes} bytes ` +
      `large (${compressedBytes} bytes compressed)`,
  );
}

function filterOutOldSidebars(
  threadInfos: RawThreadInfos,
  messageInfos: $ReadOnlyArray<RawMessageInfo>,
): RawThreadInfos {
  const newestTimePerThread = new Map();
  for (const messageInfo of messageInfos) {
    const { threadID, time } = messageInfo;
    const currentNewest = newestTimePerThread.get(threadID);
    if (!currentNewest || currentNewest < time) {
      newestTimePerThread.set(threadID, time);
    }
  }

  const filtered = {};
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    const latestUpdate = newestTimePerThread.get(threadID);
    if (
      threadInfo.type !== threadTypes.SIDEBAR ||
      (latestUpdate && latestUpdate >= oneWeekAgo)
    ) {
      filtered[threadID] = threadInfo;
    }
  }
  return filtered;
}

function improveEncoding(threadInfos: RawThreadInfos) {
  const simplifiedThreadStore = {};
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    const newRoles = {};
    for (const roleID in threadInfo.roles) {
      const role = threadInfo.roles[roleID];
      newRoles[roleID] = {
        ...role,
        permissions: improveThreadRolePermissionsBlobEncoding(role.permissions),
      };
    }
    const smallerThreadInfo = {
      ...threadInfo,
      roles: newRoles,
      members: threadInfo.members.map(member => {
        const { permissions } = member;
        if (!permissions) {
          return member;
        }
        return {
          ...member,
          permissions: improveThreadPermissionsBlobEncoding(member.permissions),
        };
      }),
      currentUser: {
        ...threadInfo.currentUser,
        permissions: improveThreadPermissionsBlobEncoding(
          threadInfo.currentUser.permissions,
        ),
      },
    };
    simplifiedThreadStore[threadID] = smallerThreadInfo;
  }
  return simplifiedThreadStore;
}

const smallerPermissionConstants = {
  ['know_of']: 'a',
  ['membership']: 'b',
  ['visible']: 'c',
  ['voiced']: 'd',
  ['edit_entries']: 'e',
  ['edit_thread']: 'f',
  ['edit_thread_description']: 'g',
  ['edit_thread_color']: 'h',
  ['delete_thread']: 'i',
  ['create_subthreads']: 'j',
  ['create_sidebars']: 'k',
  ['join_thread']: 'l',
  ['edit_permissions']: 'm',
  ['add_members']: 'n',
  ['remove_members']: 'o',
  ['change_role']: 'p',
  ['leave_thread']: 'q',
  ['react_to_message']: 'r',
  ['edit_message']: 's',
  ['edit_thread_avatar']: 't',
  ['manage_pins']: 'u',
  ['manage_invite_links']: 'v',
};
function improveThreadPermissionsBlobEncoding(blob: ThreadPermissionsInfo) {
  const newBlob = {};
  for (const permission in blob) {
    const permissionTyped: ThreadPermission = (permission: any);
    const oldValue = blob[permissionTyped].value;
    if (!oldValue) {
      continue;
    }
    const newKey = smallerPermissionConstants[permission];
    invariant(newKey, `no newKey for ${permission}!`);
    newBlob[newKey] = 1;
  }
  return newBlob;
}

const smallerThreadPermissionPropagationPrefixes = {
  ['descendant_']: '1',
  ['child_']: '2',
};
const smallerThreadPermissionFilterPrefixes = {
  ['open_']: '3',
  ['toplevel_']: '4',
  ['opentoplevel_']: '5',
};
function improveThreadRolePermissionsBlobEncoding(
  blob: ThreadRolePermissionsBlob,
) {
  const newBlob = {};
  for (const permission in blob) {
    const oldValue = blob[permission];
    if (!oldValue) {
      continue;
    }

    let newKey = '';
    let oldKey = permission;

    for (const prefix in smallerThreadPermissionPropagationPrefixes) {
      if (!oldKey.startsWith(prefix)) {
        continue;
      }
      oldKey = oldKey.substr(prefix.length);
      newKey += smallerThreadPermissionPropagationPrefixes[prefix];
    }

    for (const prefix in smallerThreadPermissionFilterPrefixes) {
      if (!oldKey.startsWith(prefix)) {
        continue;
      }
      oldKey = oldKey.substr(prefix.length);
      newKey += smallerThreadPermissionFilterPrefixes[prefix];
    }

    const newPermConstant = smallerPermissionConstants[oldKey];
    invariant(newPermConstant, `no newPermConstant for ${oldKey}!`);
    newKey += newPermConstant;

    newBlob[newKey] = 1;
  }
  return newBlob;
}

function introduceIsAdminRole(threadInfos: RawThreadInfos) {
  const newThreadStore = {};
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    const newRoles = {};
    for (const roleID in threadInfo.roles) {
      const role = threadInfo.roles[roleID];
      let newRole = role;
      if (!newRole.isDefault) {
        const { isDefault, ...rest } = newRole;
        newRole = rest;
      }
      if (role.name === 'Admins') {
        newRole = {
          ...newRole,
          isAdmin: true,
        };
      }
      newRoles[roleID] = newRole;
    }
    const newThreadInfo = {
      ...threadInfo,
      roles: newRoles,
      members: threadInfo.members.map(member => {
        const { permissions, ...rest } = member;
        return rest;
      }),
    };
    newThreadStore[threadID] = newThreadInfo;
  }
  return newThreadStore;
}

function introduceThreadRolePermissionsStore(threadInfos: RawThreadInfos) {
  const newThreadStore = {};
  const threadRolePermissionsStore = {};
  for (const threadID in threadInfos) {
    const threadInfo = threadInfos[threadID];
    const newRoles = {};
    for (const roleID in threadInfo.roles) {
      const role = threadInfo.roles[roleID];
      const rolePermissionsHash = hash(role.permissions);
      threadRolePermissionsStore[rolePermissionsHash] = role.permissions;
      newRoles[roleID] = {
        ...role,
        permissions: rolePermissionsHash,
      };
    }
    const { permissions: currentUserPermissions, ...restCurrentUser } =
      threadInfo.currentUser;
    const newThreadInfo = {
      ...threadInfo,
      currentUser: restCurrentUser,
      roles: newRoles,
      members: threadInfo.members.map(member => {
        const { permissions, ...rest } = member;
        return rest;
      }),
    };
    newThreadStore[threadID] = newThreadInfo;
  }
  return {
    threadInfos: newThreadStore,
    rolePermissions: threadRolePermissionsStore,
  };
}

main([testThreadStoreReductions]);
