// @flow

import { entryStoreOpsHandlers } from './entries-store-ops.js';

const entryStore = {
  entryInfos: {
    'A3F2E633-320D-4CDC-A0A7-48325A07E321|87868': {
      id: 'A3F2E633-320D-4CDC-A0A7-48325A07E321|87868',
      threadID: 'A3F2E633-320D-4CDC-A0A7-48325A07E321|87695',
      text: 'aaa',
      year: 2024,
      month: 5,
      day: 21,
      creationTime: 1716287287704,
      creatorID: 'ACDC8087-8540-4C97-A0AB-B1A0254C4405',
      deleted: false,
    },
    'localb59fc932-56c2-4ada-9179-36f5f0cb4855': {
      localID: 'localb59fc932-56c2-4ada-9179-36f5f0cb4855',
      threadID: 'A3F2E633-320D-4CDC-A0A7-48325A07E321|87695',
      text: '',
      year: 2024,
      month: 5,
      day: 22,
      creationTime: 1716287380610,
      creatorID: 'ACDC8087-8540-4C97-A0AB-B1A0254C4405',
      deleted: false,
    },
  },
  daysToEntries: {
    '2024-05-21': ['A3F2E633-320D-4CDC-A0A7-48325A07E321|87868'],
    '2024-05-22': ['localb59fc932-56c2-4ada-9179-36f5f0cb4855'],
  },
  lastUserInteractionCalendar: 1716287380611,
};

describe('entryStoreOpsHandlers', () => {
  describe('processStoreOperations', () => {
    it('should process replace operation', () => {
      const newEntry = {
        id: '123',
        threadID: 'A3F2E633-320D-4CDC-A0A7-48325A07E321|87695',
        text: 'aaa',
        year: 2024,
        month: 5,
        day: 22,
        creationTime: 1716287287704,
        creatorID: 'ACDC8087-8540-4C97-A0AB-B1A0254C4405',
        deleted: false,
      };
      expect(
        entryStoreOpsHandlers.processStoreOperations(entryStore, [
          {
            type: 'replace_entry',
            payload: {
              id: '123',
              entry: newEntry,
              isBackedUp: false,
            },
          },
        ]),
      ).toEqual({
        entryInfos: {
          ...entryStore.entryInfos,
          ['123']: newEntry,
        },
        daysToEntries: {
          ...entryStore.daysToEntries,
          '2024-05-22': ['123', 'localb59fc932-56c2-4ada-9179-36f5f0cb4855'],
        },
        lastUserInteractionCalendar: 1716287380611,
      });
    });

    it('should process remove operation', () => {
      expect(
        entryStoreOpsHandlers.processStoreOperations(entryStore, [
          {
            type: 'remove_entries',
            payload: {
              ids: ['localb59fc932-56c2-4ada-9179-36f5f0cb4855'],
            },
          },
        ]),
      ).toEqual({
        entryInfos: {
          ['A3F2E633-320D-4CDC-A0A7-48325A07E321|87868']:
            entryStore.entryInfos['A3F2E633-320D-4CDC-A0A7-48325A07E321|87868'],
        },
        daysToEntries: {
          '2024-05-21': ['A3F2E633-320D-4CDC-A0A7-48325A07E321|87868'],
        },
        lastUserInteractionCalendar: 1716287380611,
      });
    });

    it('should process remove all operation', () => {
      expect(
        entryStoreOpsHandlers.processStoreOperations(entryStore, [
          {
            type: 'remove_all_entries',
          },
        ]),
      ).toEqual({
        entryInfos: {},
        daysToEntries: {},
        lastUserInteractionCalendar: 1716287380611,
      });
    });
  });

  describe('convertOpsToClientDBOps', () => {
    it('should not modify remove entries operation', () => {
      const operation = {
        type: 'remove_entries',
        payload: { ids: ['1', '2', '3'] },
      };
      expect(
        entryStoreOpsHandlers.convertOpsToClientDBOps([operation]),
      ).toEqual([operation]);
    });

    it('should not modify remove all entries operations', () => {
      const operation = {
        type: 'remove_all_entries',
      };
      expect(
        entryStoreOpsHandlers.convertOpsToClientDBOps([operation]),
      ).toEqual([operation]);
    });

    it('should modify replace entry operation', () => {
      const key = 'localb59fc932-56c2-4ada-9179-36f5f0cb4855';
      const operation = {
        type: 'replace_entry',
        payload: {
          id: key,
          entry: entryStore.entryInfos[key],
          isBackedUp: false,
        },
      };
      expect(
        entryStoreOpsHandlers.convertOpsToClientDBOps([operation]),
      ).toEqual([
        {
          type: 'replace_entry',
          payload: {
            id: key,
            entry: JSON.stringify(entryStore.entryInfos[key]),
          },
        },
      ]);
    });
  });

  describe('translateClientDBData', () => {
    it('should convert client DB entries', () => {
      const key = 'A3F2E633-320D-4CDC-A0A7-48325A07E321|87868';
      const clientDBEntries = [
        {
          id: key,
          entry: JSON.stringify(entryStore.entryInfos[key]),
        },
      ];
      const translated =
        entryStoreOpsHandlers.translateClientDBData(clientDBEntries);
      expect(translated).toEqual({
        [key]: entryStore.entryInfos[key],
      });
    });
  });
});
