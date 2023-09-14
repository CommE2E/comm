// @flow

import invariant from 'invariant';
import t from 'tcomb';

import {
  convertServerIDsToClientIDs,
  convertClientIDsToServerIDs,
  memoizedCreateOptimizedConvertObject,
} from './conversion-utils.js';
import { tShape, tID, idSchemaRegex } from './validation-utils.js';
import { rawThreadInfoValidator } from '../types/thread-types.js';

const serverThreadInfo = {
  id: '1',
  type: 12,
  name: 'GENESIS',
  description: 'This is the first community on Comm. In the future it will',
  color: 'c85000',
  creationTime: 1672934346213,
  parentThreadID: null,
  members: [
    {
      id: '256',
      role: '83796',
      permissions: {
        know_of: { value: true, source: '1' },
        membership: { value: false, source: null },
        visible: { value: true, source: '1' },
        voiced: { value: true, source: '1' },
        edit_entries: { value: true, source: '1' },
        edit_thread: { value: true, source: '1' },
        edit_thread_description: { value: true, source: '1' },
        edit_thread_color: { value: true, source: '1' },
        delete_thread: { value: true, source: '1' },
        create_subthreads: { value: true, source: '1' },
        create_sidebars: { value: true, source: '1' },
        join_thread: { value: false, source: null },
        edit_permissions: { value: false, source: null },
        add_members: { value: true, source: '1' },
        remove_members: { value: true, source: '1' },
        change_role: { value: true, source: '1' },
        leave_thread: { value: false, source: null },
        react_to_message: { value: true, source: '1' },
        edit_message: { value: true, source: '1' },
      },
      isSender: false,
    },
    {
      id: '93079',
      role: '83795',
      permissions: {
        know_of: { value: true, source: '1' },
        membership: { value: false, source: null },
        visible: { value: true, source: '1' },
        voiced: { value: false, source: null },
        edit_entries: { value: false, source: null },
        edit_thread: { value: false, source: null },
        edit_thread_description: { value: false, source: null },
        edit_thread_color: { value: false, source: null },
        delete_thread: { value: false, source: null },
        create_subthreads: { value: false, source: null },
        create_sidebars: { value: false, source: null },
        join_thread: { value: false, source: null },
        edit_permissions: { value: false, source: null },
        add_members: { value: false, source: null },
        remove_members: { value: false, source: null },
        change_role: { value: false, source: null },
        leave_thread: { value: false, source: null },
        react_to_message: { value: false, source: null },
        edit_message: { value: false, source: null },
      },
      isSender: false,
    },
  ],
  roles: {
    '83795': {
      id: '83795',
      name: 'Members',
      permissions: {
        know_of: true,
        visible: true,
        descendant_open_know_of: true,
        descendant_open_visible: true,
        descendant_opentoplevel_join_thread: true,
      },
      isDefault: true,
    },
    '83796': {
      id: '83796',
      name: 'Admins',
      permissions: {
        know_of: true,
        visible: true,
        voiced: true,
        react_to_message: true,
        edit_message: true,
        edit_entries: true,
        edit_thread: true,
        edit_thread_color: true,
        edit_thread_description: true,
        create_subthreads: true,
        create_sidebars: true,
        add_members: true,
        delete_thread: true,
        remove_members: true,
        change_role: true,
        descendant_know_of: true,
        descendant_visible: true,
        descendant_toplevel_join_thread: true,
        child_join_thread: true,
        descendant_voiced: true,
        descendant_edit_entries: true,
        descendant_edit_thread: true,
        descendant_edit_thread_color: true,
        descendant_edit_thread_description: true,
        descendant_toplevel_create_subthreads: true,
        descendant_toplevel_create_sidebars: true,
        descendant_add_members: true,
        descendant_delete_thread: true,
        descendant_edit_permissions: true,
        descendant_remove_members: true,
        descendant_change_role: true,
      },
      isDefault: false,
    },
  },
  currentUser: {
    role: '83795',
    permissions: {
      know_of: { value: true, source: '1' },
      membership: { value: false, source: null },
      visible: { value: true, source: '1' },
      voiced: { value: false, source: null },
      edit_entries: { value: false, source: null },
      edit_thread: { value: false, source: null },
      edit_thread_description: { value: false, source: null },
      edit_thread_color: { value: false, source: null },
      delete_thread: { value: false, source: null },
      create_subthreads: { value: false, source: null },
      create_sidebars: { value: false, source: null },
      join_thread: { value: false, source: null },
      edit_permissions: { value: false, source: null },
      add_members: { value: false, source: null },
      remove_members: { value: false, source: null },
      change_role: { value: false, source: null },
      leave_thread: { value: false, source: null },
      react_to_message: { value: false, source: null },
      edit_message: { value: false, source: null },
    },
    subscription: { home: true, pushNotifs: true },
    unread: true,
  },
  repliesCount: 0,
  containingThreadID: null,
  community: null,
};
const clientThreadInfo = {
  id: '0|1',
  type: 12,
  name: 'GENESIS',
  description: 'This is the first community on Comm. In the future it will',
  color: 'c85000',
  creationTime: 1672934346213,
  parentThreadID: null,
  members: [
    {
      id: '256',
      role: '0|83796',
      permissions: {
        know_of: { value: true, source: '0|1' },
        membership: { value: false, source: null },
        visible: { value: true, source: '0|1' },
        voiced: { value: true, source: '0|1' },
        edit_entries: { value: true, source: '0|1' },
        edit_thread: { value: true, source: '0|1' },
        edit_thread_description: { value: true, source: '0|1' },
        edit_thread_color: { value: true, source: '0|1' },
        delete_thread: { value: true, source: '0|1' },
        create_subthreads: { value: true, source: '0|1' },
        create_sidebars: { value: true, source: '0|1' },
        join_thread: { value: false, source: null },
        edit_permissions: { value: false, source: null },
        add_members: { value: true, source: '0|1' },
        remove_members: { value: true, source: '0|1' },
        change_role: { value: true, source: '0|1' },
        leave_thread: { value: false, source: null },
        react_to_message: { value: true, source: '0|1' },
        edit_message: { value: true, source: '0|1' },
      },
      isSender: false,
    },
    {
      id: '93079',
      role: '0|83795',
      permissions: {
        know_of: { value: true, source: '0|1' },
        membership: { value: false, source: null },
        visible: { value: true, source: '0|1' },
        voiced: { value: false, source: null },
        edit_entries: { value: false, source: null },
        edit_thread: { value: false, source: null },
        edit_thread_description: { value: false, source: null },
        edit_thread_color: { value: false, source: null },
        delete_thread: { value: false, source: null },
        create_subthreads: { value: false, source: null },
        create_sidebars: { value: false, source: null },
        join_thread: { value: false, source: null },
        edit_permissions: { value: false, source: null },
        add_members: { value: false, source: null },
        remove_members: { value: false, source: null },
        change_role: { value: false, source: null },
        leave_thread: { value: false, source: null },
        react_to_message: { value: false, source: null },
        edit_message: { value: false, source: null },
      },
      isSender: false,
    },
  ],
  roles: {
    '0|83795': {
      id: '0|83795',
      name: 'Members',
      permissions: {
        know_of: true,
        visible: true,
        descendant_open_know_of: true,
        descendant_open_visible: true,
        descendant_opentoplevel_join_thread: true,
      },
      isDefault: true,
    },
    '0|83796': {
      id: '0|83796',
      name: 'Admins',
      permissions: {
        know_of: true,
        visible: true,
        voiced: true,
        react_to_message: true,
        edit_message: true,
        edit_entries: true,
        edit_thread: true,
        edit_thread_color: true,
        edit_thread_description: true,
        create_subthreads: true,
        create_sidebars: true,
        add_members: true,
        delete_thread: true,
        remove_members: true,
        change_role: true,
        descendant_know_of: true,
        descendant_visible: true,
        descendant_toplevel_join_thread: true,
        child_join_thread: true,
        descendant_voiced: true,
        descendant_edit_entries: true,
        descendant_edit_thread: true,
        descendant_edit_thread_color: true,
        descendant_edit_thread_description: true,
        descendant_toplevel_create_subthreads: true,
        descendant_toplevel_create_sidebars: true,
        descendant_add_members: true,
        descendant_delete_thread: true,
        descendant_edit_permissions: true,
        descendant_remove_members: true,
        descendant_change_role: true,
      },
      isDefault: false,
    },
  },
  currentUser: {
    role: '0|83795',
    permissions: {
      know_of: { value: true, source: '0|1' },
      membership: { value: false, source: null },
      visible: { value: true, source: '0|1' },
      voiced: { value: false, source: null },
      edit_entries: { value: false, source: null },
      edit_thread: { value: false, source: null },
      edit_thread_description: { value: false, source: null },
      edit_thread_color: { value: false, source: null },
      delete_thread: { value: false, source: null },
      create_subthreads: { value: false, source: null },
      create_sidebars: { value: false, source: null },
      join_thread: { value: false, source: null },
      edit_permissions: { value: false, source: null },
      add_members: { value: false, source: null },
      remove_members: { value: false, source: null },
      change_role: { value: false, source: null },
      leave_thread: { value: false, source: null },
      react_to_message: { value: false, source: null },
      edit_message: { value: false, source: null },
    },
    subscription: { home: true, pushNotifs: true },
    unread: true,
  },
  repliesCount: 0,
  containingThreadID: null,
  community: null,
};

describe('id conversion', () => {
  it('should convert string id', () => {
    const validator = tShape({ id: tID });
    const serverData = { id: '1' };
    const clientData = { id: '0|1' };

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });

  it('should convert a complex type', () => {
    const validator = tShape({ ids: t.dict(tID, t.list(tID)) });
    const serverData = { ids: { '1': ['11', '12'], '2': [], '3': ['13'] } };
    const clientData = {
      ids: { '0|1': ['0|11', '0|12'], '0|2': [], '0|3': ['0|13'] },
    };

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });

  it('should convert a refinement', () => {
    const validator = t.refinement(tID, () => true);
    const serverData = '1';
    const clientData = '0|1';

    expect(
      convertServerIDsToClientIDs('0', validator, serverData),
    ).toStrictEqual(clientData);
    expect(
      convertClientIDsToServerIDs('0', validator, clientData),
    ).toStrictEqual(serverData);
  });
});

describe('idSchemaRegex tests', () => {
  it('should capture ids', () => {
    const regex = new RegExp(`^(${idSchemaRegex})$`);
    const ids = ['123|123', '0|0', '123', '0'];

    for (const id of ids) {
      const result = regex.exec(id);
      expect(result).not.toBeNull();
      invariant(result, 'result is not null');
      const matches = [...result];
      expect(matches).toHaveLength(2);
      expect(matches[1]).toBe(id);
    }
  });
});

describe('optimized tests', () => {
  const conversionFunction = id => {
    if (id.indexOf('|') !== -1) {
      console.warn(`Server id '${id}' already has a prefix`);
      return id;
    }
    return `0|${id}`;
  };

  it('test array', () => {
    const validator = t.list(tID);
    const serverData = new Array(100000).fill('123');
    const clientData = new Array(100000).fill('0|123');

    // Standard
    {
      const startTime = performance.now();
      expect(
        convertServerIDsToClientIDs('0', validator, serverData),
      ).toStrictEqual(clientData);
      const endTime = performance.now();
      console.debug(`Conversion run in ${endTime - startTime} miliseconds`);
    }

    // Optimized
    {
      const startTime = performance.now();
      const f =
        memoizedCreateOptimizedConvertObject(validator, [tID]) ??
        // eslint-disable-next-line no-unused-vars
        ((id, _f) => id);
      const generationTime = performance.now();
      const result = f(serverData, conversionFunction);
      const endTime = performance.now();

      expect(result).toEqual(clientData);
      console.debug(
        `Generation run in ${generationTime - startTime} miliseconds\n` +
          `Conversion run in ${endTime - generationTime} miliseconds\n` +
          `Total in ${endTime - startTime} miliseconds`,
      );
    }
  });

  it('test thread', () => {
    const validator = t.list(rawThreadInfoValidator);
    const serverData = new Array(1000).fill(serverThreadInfo);
    const clientData = new Array(1000).fill(clientThreadInfo);

    // Standard
    {
      const startTime = performance.now();
      expect(
        convertServerIDsToClientIDs('0', validator, serverData),
      ).toStrictEqual(clientData);
      const endTime = performance.now();
      console.debug(`Conversion run in ${endTime - startTime} miliseconds`);
    }

    // Optimized
    {
      const startTime = performance.now();
      const f =
        memoizedCreateOptimizedConvertObject(validator, [tID]) ??
        // eslint-disable-next-line no-unused-vars
        ((id, _f) => id);
      const generationTime = performance.now();
      const result = f(serverData, conversionFunction);
      const endTime = performance.now();

      expect(result).toEqual(clientData);
      console.debug(
        `Generation run in ${generationTime - startTime} miliseconds\n` +
          `Conversion run in ${endTime - generationTime} miliseconds\n` +
          `Total in ${endTime - startTime} miliseconds`,
      );
    }
  });
});
