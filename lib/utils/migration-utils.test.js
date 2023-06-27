// @flow

import {
  convertDraftKeyToNewIDSchema,
  convertDraftStoreToNewIDSchema,
  generateIDSchemaMigrationOpsForDrafts,
} from './migration-utils.js';
import type {
  ClientDBDraftInfo,
  ClientDBDraftStoreOperation,
  DraftStore,
} from '../types/draft-types.js';

describe('id schema migrations', () => {
  it('should convert draft keys', () => {
    const examples = [
      ['123/message_composer', '256|123/message_composer'],
      [
        'pending/sidebar/83874/message_composer',
        'pending/sidebar/256|83874/message_composer',
      ],
      [
        'pending/type6/83811+84104/message_composer',
        'pending/type6/83811+84104/message_composer',
      ],
    ];

    for (const [before, after] of examples) {
      expect(convertDraftKeyToNewIDSchema(before)).toEqual(after);
    }
  });

  it('should convert draft store', () => {
    const exampleDraftStore: DraftStore = {
      drafts: {
        '83818/message_composer': 'draft',
        'pending/sidebar/83874/message_composer': 'draft',
        'pending/type6/83811+84104/message_composer': 'draft',
      },
    };
    const convertedDraftStore: DraftStore = {
      drafts: {
        '256|83818/message_composer': 'draft',
        'pending/sidebar/256|83874/message_composer': 'draft',
        'pending/type6/83811+84104/message_composer': 'draft',
      },
    };

    expect(convertDraftStoreToNewIDSchema(exampleDraftStore)).toEqual(
      convertedDraftStore,
    );
  });

  it('should generate migration ops for drafts', () => {
    const drafts: $ReadOnlyArray<ClientDBDraftInfo> = [
      { key: '83818/message_composer', text: 'draft' },
      { key: 'pending/sidebar/83874/message_composer', text: 'draft' },
      { key: 'pending/type6/83811+84104/message_composer', text: 'draft' },
    ];
    const operations: $ReadOnlyArray<ClientDBDraftStoreOperation> = [
      { type: 'remove_all' },
      {
        payload: {
          key: '256|83818/message_composer',
          text: 'draft',
        },
        type: 'update',
      },
      {
        payload: {
          key: 'pending/sidebar/256|83874/message_composer',
          text: 'draft',
        },
        type: 'update',
      },
      {
        payload: {
          key: 'pending/type6/83811+84104/message_composer',
          text: 'draft',
        },
        type: 'update',
      },
    ];

    expect(generateIDSchemaMigrationOpsForDrafts(drafts)).toEqual(operations);
  });
});
