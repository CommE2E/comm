// @flow

import { getDatabaseModule } from '../db-module.js';
import { clearSensitiveData } from '../utils/db-utils.js';

const MAIN_FILE_PATH = 'main.sqlite';
const BACKUP_FILE_PATH = 'backup.sqlite';

const METADATA_KEY = 'test_key';
const METADATA_DEFAULT_VALUE_BACKUP = 'default_value';
const METADATA_DEFAULT_VALUE_MAIN = '';

describe('Multiple databases', () => {
  let mainQueryExecutor, backupQueryExecutor;
  let dbModule;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
  });

  beforeEach(() => {
    if (!dbModule) {
      throw new Error('Database module is missing');
    }
    mainQueryExecutor = new dbModule.SQLiteQueryExecutor(MAIN_FILE_PATH, false);
    if (!mainQueryExecutor) {
      throw new Error('Main SQLiteQueryExecutor is missing');
    }

    backupQueryExecutor = new dbModule.SQLiteQueryExecutor(
      BACKUP_FILE_PATH,
      false,
    );
    if (!backupQueryExecutor) {
      throw new Error('Backup SQLiteQueryExecutor is missing');
    }

    backupQueryExecutor.setMetadata(
      METADATA_KEY,
      METADATA_DEFAULT_VALUE_BACKUP,
    );
  });

  afterEach(() => {
    if (!dbModule) {
      return;
    }
    if (mainQueryExecutor) {
      clearSensitiveData(dbModule, MAIN_FILE_PATH, mainQueryExecutor);
    }
    if (backupQueryExecutor) {
      clearSensitiveData(dbModule, BACKUP_FILE_PATH, backupQueryExecutor);
    }
  });

  it('changes in one database should not affect other', () => {
    const customValue = 'custom_value;';
    mainQueryExecutor?.setMetadata(METADATA_KEY, customValue);

    expect(mainQueryExecutor.getMetadata(METADATA_KEY)).toBe(customValue);

    // set in `beforeEach`
    expect(backupQueryExecutor.getMetadata(METADATA_KEY)).toBe(
      METADATA_DEFAULT_VALUE_BACKUP,
    );
  });

  it('copies content between databases', () => {
    expect(mainQueryExecutor.getMetadata(METADATA_KEY)).toBe(
      METADATA_DEFAULT_VALUE_MAIN,
    );

    // should not copy content that is not in `tablesAllowlist`
    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);
    expect(mainQueryExecutor.getMetadata(METADATA_KEY)).toBe(
      METADATA_DEFAULT_VALUE_MAIN,
    );

    const draftKey = 'conversation_id';
    const draftContent = 'typed_message';
    backupQueryExecutor.updateDraft(draftKey, draftContent);

    let draft;
    // present in backup
    draft = backupQueryExecutor.getAllDrafts().find(d => d.key === draftKey);
    expect(draft?.text).toBe(draftContent);
    // missing in main
    draft = mainQueryExecutor.getAllDrafts().find(d => d.key === draftKey);
    expect(draft).toBeUndefined();

    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);
    // present in backup
    draft = backupQueryExecutor.getAllDrafts().find(d => d.key === draftKey);
    expect(draft?.text).toBe(draftContent);
    // present in backup
    draft = mainQueryExecutor.getAllDrafts().find(d => d.key === draftKey);
    expect(draft?.text).toBe(draftContent);
  });

  it('do not override content from main database', () => {
    const draftKey = 'conversation_id';
    const mainDraftContent = 'main_draft';
    const backupDraftContent = 'backup_draft';
    mainQueryExecutor.updateDraft(draftKey, mainDraftContent);
    backupQueryExecutor.updateDraft(draftKey, backupDraftContent);

    mainQueryExecutor.copyContentFromDatabase(BACKUP_FILE_PATH, null);

    const mainDraft = mainQueryExecutor
      .getAllDrafts()
      .find(d => d.key === draftKey);

    expect(mainDraft?.text).toBe(mainDraftContent);

    const backupDraft = backupQueryExecutor
      .getAllDrafts()
      .find(d => d.key === draftKey);
    expect(backupDraft?.text).toBe(backupDraftContent);
  });

  it('returns correct database version', () => {
    const migratedFilePath = 'migrated.sqlite';
    const migratedQueryExecutor = new dbModule.SQLiteQueryExecutor(
      migratedFilePath,
      false,
    );
    expect(migratedQueryExecutor.getDatabaseVersion()).toBeGreaterThan(0);
    clearSensitiveData(dbModule, migratedFilePath, migratedQueryExecutor);

    const notMigratedFilePath = 'not-migrated.sqlite';
    const notMigratedQueryExecutor = new dbModule.SQLiteQueryExecutor(
      notMigratedFilePath,
      true,
    );
    expect(notMigratedQueryExecutor.getDatabaseVersion()).toBe(0);
    clearSensitiveData(dbModule, notMigratedFilePath, notMigratedQueryExecutor);
  });
});
