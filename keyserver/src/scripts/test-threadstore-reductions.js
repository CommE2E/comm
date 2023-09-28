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

import { main } from './utils.js';
import { fetchMessageInfos } from '../fetchers/message-fetchers.js';
import { fetchThreadInfos } from '../fetchers/thread-fetchers.js';
import { createScriptViewer } from '../session/scripts.js';

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
  console.log(
    `before reductions, Ashoat's ThreadStore is ${beforeBytes} bytes large`,
  );

  const withoutOldSidebars = filterOutOldSidebars(threadInfos, rawMessageInfos);
  const withoutOldSidebarsString = JSON.stringify(withoutOldSidebars);
  const withoutOldSidebarsBytes = new Blob([withoutOldSidebarsString]).size;
  console.log(
    "after filtering out old sidebars, Ashoat's ThreadStore is " +
      `${withoutOldSidebarsBytes} bytes large`,
  );

  const improvedEncoding = improveEncoding(threadInfos);
  const improvedEncodingString = JSON.stringify(improvedEncoding);
  const improvedEncodingBytes = new Blob([improvedEncodingString]).size;
  console.log(
    "after improving encoding, Ashoat's ThreadStore is " +
      `${improvedEncodingBytes} bytes large`,
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

main([testThreadStoreReductions]);
