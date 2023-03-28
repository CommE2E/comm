// @flow

import { spawn, execSync } from 'child_process';
import { app } from 'electron';
import path from 'path';

// Squirrel will start the app with additional flags during installing,
// uninstalling and updating so we can for example create or delete shortcuts.
// After handling some of these events the app will be closed. If this function
// returns false, the app should start normally.
export function handleSquirrelEvent(): boolean {
  if (process.argv.length === 1) {
    return false;
  }

  const updateExe = path.resolve(process.execPath, '..', '..', 'Update.exe');
  const commExeName = path.basename(process.execPath);

  const spawnUpdate = args => {
    return spawn(updateExe, args, { detached: true }).on('close', app.quit);
  };

  const squirrelEvent = process.argv[1];
  switch (squirrelEvent) {
    case '--squirrel-install':
    case '--squirrel-updated':
      execSync(
        path.resolve(__dirname, '../assets/windows-runtime-installer.exe'),
      );
      spawnUpdate(['--createShortcut', commExeName]);
      return true;

    case '--squirrel-uninstall':
      spawnUpdate(['--removeShortcut', commExeName]);
      return true;

    case '--squirrel-obsolete':
      app.quit();
      return true;

    case '--squirrel-firstrun':
      return false;
  }

  return false;
}

export function isNormalStartup(): boolean {
  const squirrelEvent = process.argv[1];
  return !squirrelEvent || squirrelEvent === '--squirrel-firstrun';
}