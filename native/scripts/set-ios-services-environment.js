#!/usr/bin/env node

/* eslint-disable ft-flow/require-valid-file-annotation */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const {
  resolveServicesEnvironment,
} = require('lib/utils/services-environment.cjs');

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function runPlistBuddy(command, infoPlistPath, allowFailure = false) {
  const result = spawnSync(
    '/usr/libexec/PlistBuddy',
    ['-c', command, infoPlistPath],
    {
      encoding: 'utf8',
    },
  );
  if (result.error) {
    fail(result.error.message);
  }
  if (!allowFailure && result.status !== 0) {
    const stderr = result.stderr.trim();
    const stdout = result.stdout.trim();
    fail(stderr || stdout || 'PlistBuddy failed');
  }
}

const { TARGET_BUILD_DIR, INFOPLIST_PATH } = process.env;
if (!TARGET_BUILD_DIR || !INFOPLIST_PATH) {
  fail('set-ios-services-environment.js must run from an Xcode build phase');
}

let servicesEnvironment;
try {
  servicesEnvironment = resolveServicesEnvironment();
} catch (error) {
  fail(error.message);
}

const infoPlistPath = path.resolve(TARGET_BUILD_DIR, INFOPLIST_PATH);
if (!fs.existsSync(infoPlistPath)) {
  fail(`Expected Info.plist at ${infoPlistPath}`);
}

runPlistBuddy('Delete :CommServicesEnvironment', infoPlistPath, true);
runPlistBuddy(
  `Add :CommServicesEnvironment string ${servicesEnvironment}`,
  infoPlistPath,
);

console.log(`Configured CommServicesEnvironment=${servicesEnvironment}`);
