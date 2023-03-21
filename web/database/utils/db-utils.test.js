// @flow

import initSqlJs from 'sql.js';

import { parseSQLiteResult } from './db-utils.js';

describe('SQLite database result parsing', () => {
  let database;

  const tableA = [
    {
      key: 'key_a',
      val: 42,
    },
  ];

  const tableB = [
    {
      idx: 1,
      text: 'test1',
    },
    {
      idx: 2,
      text: null,
    },
  ];

  const initQuery = `
    CREATE TABLE table_a (
     key TEXT UNIQUE PRIMARY KEY NOT NULL,
     val INTEGER
    );
    CREATE TABLE table_b (
     idx INTEGER PRIMARY KEY AUTOINCREMENT,
     text TEXT
    );
    INSERT INTO table_a VALUES ($keyA, $valA);
    INSERT INTO table_b(text) VALUES ($textB);
    INSERT INTO table_b(text) VALUES (NULL);
`;

  const initValues = {
    $keyA: tableA[0].key,
    $valA: tableA[0].val,
    $textB: tableB[0].text,
  };

  beforeEach(async () => {
    const SQL = await initSqlJs();
    database = new SQL.Database();

    database.exec(initQuery, initValues);
  });

  it('should return result for one query', () => {
    const rawResult = database.exec(`SELECT * FROM table_b`);

    const result = parseSQLiteResult(rawResult);
    expect(result.length).toBe(1);

    const [data] = result;
    expect(data).toEqual(expect.arrayContaining(tableB));
    expect(data.length).toEqual(tableB.length);
  });

  it('should return result for more than one query', () => {
    const rawResult = database.exec(`
      SELECT * FROM table_a;
      SELECT * FROM table_b;
    `);

    const result = parseSQLiteResult(rawResult);
    expect(result.length).toBe(2);

    const [dataA, dataB] = result;
    expect(dataA).toEqual(expect.arrayContaining(tableA));
    expect(dataA.length).toEqual(tableA.length);
    expect(dataB).toEqual(expect.arrayContaining(tableB));
    expect(dataB.length).toEqual(tableB.length);
  });

  it('should return an empty array for 0 results', async () => {
    const rawResult = database.exec(`
        SELECT * FROM table_b 
        WHERE 1 = 0
    `);

    const result = parseSQLiteResult(rawResult);
    expect(result).toStrictEqual([]);
  });

  it('should return exact row for specific query', async () => {
    const rawResult = database.exec(`
        SELECT * FROM table_b 
        WHERE idx = 1
    `);

    const result = parseSQLiteResult(rawResult);
    expect(result.length).toBe(1);

    const [data] = result;
    expect(data.length).toBe(1);
    expect(data[0]).toStrictEqual(tableB[0]);
  });

  it('should return aggregated value', async () => {
    const rawResult = database.exec(`
        SELECT AVG(val) as average FROM table_a
    `);

    const result = parseSQLiteResult(rawResult);
    expect(result.length).toBe(1);

    const [data] = result;
    expect(data.length).toBe(1);
    expect(data[0]).toStrictEqual({ average: 42 });
  });
});
