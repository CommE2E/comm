/**
 * @jest-environment node
 */

// @flow

import { exportDatabaseContent, importDatabaseContent } from './db-utils.js';
import {
  decryptData,
  encryptData,
  exportKeyToJWK,
  generateCryptoKey,
  importJWKKey,
} from '../../crypto/aes-gcm-crypto-utils.js';
import { getDatabaseModule } from '../db-module.js';

const TAG_LENGTH = 16;
const IV_LENGTH = 12;

const FILE_PATH = 'test.sqlite';
const TEST_KEY = 'key';
const TEST_VAL = 'val';

describe('database encryption utils', () => {
  let sqliteQueryExecutor;
  let dbModule;
  let cryptoKey;

  beforeAll(async () => {
    dbModule = getDatabaseModule();
    sqliteQueryExecutor = new dbModule.SQLiteQueryExecutor(
      'test.sqlite',
      false,
    );
    sqliteQueryExecutor.setMetadata(TEST_KEY, TEST_VAL);

    cryptoKey = await generateCryptoKey({ extractable: false });
  });

  it('should encrypt database content', async () => {
    const dbContent: Uint8Array = exportDatabaseContent(dbModule, FILE_PATH);
    const { ciphertext, iv } = await encryptData(dbContent, cryptoKey);
    expect(iv.byteLength).toBe(IV_LENGTH);
    expect(ciphertext.length).toBe(dbContent.length + TAG_LENGTH);
  });

  it('is decryptable', async () => {
    const dbContent: Uint8Array = exportDatabaseContent(dbModule, FILE_PATH);
    const encryptedData = await encryptData(dbContent, cryptoKey);
    const decrypted = await decryptData(encryptedData, cryptoKey);
    expect(decrypted).toEqual(dbContent);
  });

  it('should fail with wrong key', async () => {
    const dbContent: Uint8Array = exportDatabaseContent(dbModule, FILE_PATH);
    const encryptedData = await encryptData(dbContent, cryptoKey);

    const newCryptoKey = await generateCryptoKey({
      extractable: false,
    });
    expect(decryptData(encryptedData, newCryptoKey)).rejects.toThrow();
  });

  it('should fail with wrong content', async () => {
    const dbContent: Uint8Array = exportDatabaseContent(dbModule, FILE_PATH);
    const encryptedData = await encryptData(dbContent, cryptoKey);
    const randomizedEncryptedData = {
      ...encryptedData,
      ciphertext: encryptedData.ciphertext.map(uint => uint ^ 1),
    };
    expect(decryptData(randomizedEncryptedData, cryptoKey)).rejects.toThrow();
  });

  it('should create database with decrypted content', async () => {
    const dbContent: Uint8Array = exportDatabaseContent(dbModule, FILE_PATH);
    const encryptedData = await encryptData(dbContent, cryptoKey);
    const decrypted = await decryptData(encryptedData, cryptoKey);

    importDatabaseContent(decrypted, dbModule, 'new-file.sqlite');

    const executor = new dbModule.SQLiteQueryExecutor('new-file.sqlite', false);

    expect(executor.getMetadata(TEST_KEY)).toBe(TEST_VAL);
  });

  it('should export and import key in JWK format', async () => {
    // creating new key
    const key = await generateCryptoKey({ extractable: true });
    const dbContent: Uint8Array = dbModule.FS.readFile(FILE_PATH, {
      encoding: 'binary',
    });
    const encryptedData = await encryptData(dbContent, key);

    // exporting and importing key
    const exportedKey = await exportKeyToJWK(key);
    const importedKey = await importJWKKey(exportedKey);

    // decrypt using re-created on import key
    const decrypted = await decryptData(encryptedData, importedKey);

    importDatabaseContent(decrypted, dbModule, 'new-file.sqlite');

    const executor = new dbModule.SQLiteQueryExecutor('new-file.sqlite', false);

    expect(executor.getMetadata(TEST_KEY)).toBe(TEST_VAL);
  });
});
