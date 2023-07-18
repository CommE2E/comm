// @flow

import { detect as detectBrowser } from 'detect-browser';

import { isStaff } from 'lib/shared/staff-utils.js';
import { isDev } from 'lib/utils/dev-utils.js';

import { DB_SUPPORTED_BROWSERS, DB_SUPPORTED_OS } from './constants.js';
import type { EmscriptenModule } from '../types/module.js';

const browser = detectBrowser();

function importDatabaseContent(
  content: Uint8Array,
  dbModule: EmscriptenModule,
  path: string,
) {
  const stream = dbModule.FS.open(path, 'w+');
  dbModule.FS.write(stream, content, 0, content.length, 0);
  dbModule.FS.close(stream);
}

function exportDatabaseContent(
  dbModule: EmscriptenModule,
  path: string,
): Uint8Array {
  return dbModule.FS.readFile(path, {
    encoding: 'binary',
  });
}

function isSQLiteSupported(currentLoggedInUserID: ?string): boolean {
  if (!currentLoggedInUserID) {
    return false;
  }
  if (!isDev && (!currentLoggedInUserID || !isStaff(currentLoggedInUserID))) {
    return false;
  }

  return (
    DB_SUPPORTED_OS.includes(browser.os) &&
    DB_SUPPORTED_BROWSERS.includes(browser.name)
  );
}

const isDesktopSafari: boolean =
  browser && browser.name === 'safari' && browser.os === 'Mac OS';

export {
  isSQLiteSupported,
  isDesktopSafari,
  importDatabaseContent,
  exportDatabaseContent,
};
