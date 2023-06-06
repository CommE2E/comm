// @flow

import initSqlJs, { type SqliteDatabase } from 'sql.js';

import {
  decryptDatabaseFile,
  encryptDatabaseFile,
  exportKeyToJWK,
  generateDatabaseCryptoKey,
  importJWKKey,
} from './worker-crypto-utils.js';
import { getSQLiteDBVersion } from '../queries/db-queries.js';

const TEST_DB_VERSION = 5;
const TAG_LENGTH = 16;
const IV_LENGTH = 12;

// calling export on empty schema will return empty buffer
function setUpMockDb(database: SqliteDatabase) {
  database.exec(`
     CREATE TABLE test_table (
       key TEXT UNIQUE PRIMARY KEY NOT NULL,
       value TEXT NOT NULL
     );
  `);
  database.exec(`
    INSERT INTO test_table VALUES ("key_1", "value 1");
  `);
  database.exec(`PRAGMA user_version=${TEST_DB_VERSION};`);
}

describe('database encryption utils', () => {
  let database;
  let cryptoKey;

  beforeAll(async () => {
    const SQL = await initSqlJs();
    database = new SQL.Database();
    setUpMockDb(database);

    cryptoKey = await generateDatabaseCryptoKey({ extractable: false });
  });

  it('should encrypt database content', async () => {
    const dbContent: Uint8Array = database.export();
    const { ciphertext, iv } = await encryptDatabaseFile(dbContent, cryptoKey);
    expect(iv.byteLength).toBe(IV_LENGTH);
    expect(ciphertext.length).toBe(dbContent.length + TAG_LENGTH);
  });

  it('is decryptable', async () => {
    const dbContent: Uint8Array = database.export();
    const encryptedData = await encryptDatabaseFile(dbContent, cryptoKey);
    const decrypted = await decryptDatabaseFile(encryptedData, cryptoKey);
    expect(decrypted).toEqual(dbContent);
  });

  it('should fail with wrong key', async () => {
    const dbContent: Uint8Array = database.export();
    const encryptedData = await encryptDatabaseFile(dbContent, cryptoKey);

    const newCryptoKey = await generateDatabaseCryptoKey({
      extractable: false,
    });
    expect(decryptDatabaseFile(encryptedData, newCryptoKey)).rejects.toThrow();
  });

  it('should fail with wrong content', async () => {
    const dbContent: Uint8Array = database.export();
    const encryptedData = await encryptDatabaseFile(dbContent, cryptoKey);
    const randomizedEncryptedData = {
      ...encryptedData,
      ciphertext: encryptedData.ciphertext.map(uint => uint ^ 1),
    };
    expect(
      decryptDatabaseFile(randomizedEncryptedData, cryptoKey),
    ).rejects.toThrow();
  });

  it('should create database with decrypted content', async () => {
    const dbContent: Uint8Array = database.export();
    const encryptedData = await encryptDatabaseFile(dbContent, cryptoKey);
    const decrypted = await decryptDatabaseFile(encryptedData, cryptoKey);

    const SQL = await initSqlJs();
    const newDatabase = new SQL.Database(decrypted);
    expect(getSQLiteDBVersion(newDatabase)).toBe(TEST_DB_VERSION);
  });

  it('should export and import key in JWK format', async () => {
    // creating new key
    const key = await generateDatabaseCryptoKey({ extractable: true });
    const dbContent: Uint8Array = database.export();
    const encryptedData = await encryptDatabaseFile(dbContent, key);

    // exporting and importing key
    const exportedKey = await exportKeyToJWK(key);
    const importedKey = await importJWKKey(exportedKey);

    // decrypt using re-created on import key
    const decrypted = await decryptDatabaseFile(encryptedData, importedKey);

    const SQL = await initSqlJs();
    const newDatabase = new SQL.Database(decrypted);
    expect(getSQLiteDBVersion(newDatabase)).toBe(TEST_DB_VERSION);
  });
});
