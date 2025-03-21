// @flow

/**
 * Script to update version in all mobile build files
 * from the source of truth in native/version.mjs.
 */

import fs from 'fs';
import invariant from 'invariant';
import path from 'path';
import { fileURLToPath } from 'url';

import { codeVersion, codeVersionName } from '../version.mjs';

// Get directory name in ESM
const { url } = import.meta;
invariant(url, 'URL should be set');
const filename = fileURLToPath(url);
const dirname = path.dirname(filename);

// Paths
const nativeDir = path.resolve(dirname, '..');
const headerPath = path.join(
  nativeDir,
  'cpp/CommonCpp/NativeModules/CommCoreModule.h',
);
const androidGradlePath = path.join(nativeDir, 'android/app/build.gradle');
const iosProjectPath = path.join(
  nativeDir,
  'ios/Comm.xcodeproj/project.pbxproj',
);
const iosInfoDebugPath = path.join(nativeDir, 'ios/Comm/Info.debug.plist');
const iosInfoReleasePath = path.join(nativeDir, 'ios/Comm/Info.release.plist');

// Update CommCoreModule.h
function updateCommCoreModule() {
  let content = fs.readFileSync(headerPath, 'utf8');

  // Replace codeVersion value
  content = content.replace(
    /const int codeVersion\{[0-9]+\};/,
    `const int codeVersion{${codeVersion}};`,
  );

  fs.writeFileSync(headerPath, content);
  console.log(`Updated codeVersion in CommCoreModule.h to ${codeVersion}`);
}

// Update Android build.gradle
function updateAndroidGradle() {
  let content = fs.readFileSync(androidGradlePath, 'utf8');

  // Replace versionCode
  content = content.replace(/versionCode [0-9]+/, `versionCode ${codeVersion}`);

  // Replace versionName
  content = content.replace(
    /versionName '[^']+'/,
    `versionName '${codeVersionName}'`,
  );

  fs.writeFileSync(androidGradlePath, content);
  console.log(`Updated Android version to ${codeVersionName} (${codeVersion})`);
}

// Update iOS project.pbxproj
function updateIOSProject() {
  let content = fs.readFileSync(iosProjectPath, 'utf8');

  // Replace CURRENT_PROJECT_VERSION
  content = content.replace(
    /CURRENT_PROJECT_VERSION = [0-9]+;/g,
    `CURRENT_PROJECT_VERSION = ${codeVersion};`,
  );

  // Replace MARKETING_VERSION
  content = content.replace(
    /MARKETING_VERSION = [^;]+;/g,
    `MARKETING_VERSION = ${codeVersionName};`,
  );

  fs.writeFileSync(iosProjectPath, content);
  console.log(`Updated iOS project version to ${codeVersionName}`);
}

// Update iOS Info.plist files
function updateIOSInfoPlists() {
  // Update Info.debug.plist
  let debugContent = fs.readFileSync(iosInfoDebugPath, 'utf8');

  // Replace bundle short version string
  const shortVersionRegex =
    /<key>CFBundleShortVersionString<\/key>\s*<string>[^<]+<\/string>/;
  const shortVersionReplacement =
    `<key>CFBundleShortVersionString</key>\n\t` +
    `<string>${codeVersionName}</string>`;
  debugContent = debugContent.replace(
    shortVersionRegex,
    shortVersionReplacement,
  );

  // Replace bundle version
  const bundleVersionRegex =
    /<key>CFBundleVersion<\/key>\s*<string>[^<]+<\/string>/;
  const bundleVersionReplacement = `<key>CFBundleVersion</key>\n\t<string>${codeVersion}</string>`;
  debugContent = debugContent.replace(
    bundleVersionRegex,
    bundleVersionReplacement,
  );

  fs.writeFileSync(iosInfoDebugPath, debugContent);

  // Update Info.release.plist
  let releaseContent = fs.readFileSync(iosInfoReleasePath, 'utf8');

  // Replace bundle short version string
  releaseContent = releaseContent.replace(
    shortVersionRegex,
    shortVersionReplacement,
  );

  // Replace bundle version
  releaseContent = releaseContent.replace(
    bundleVersionRegex,
    bundleVersionReplacement,
  );

  fs.writeFileSync(iosInfoReleasePath, releaseContent);

  console.log(`Updated iOS Info.plist files to ${codeVersionName}`);
}

// Run all updates
function updateAll() {
  try {
    updateCommCoreModule();
    updateAndroidGradle();
    updateIOSProject();
    updateIOSInfoPlists();
    console.log('All version files updated successfully!');
  } catch (error) {
    console.error('Error updating version files:', error);
    process.exit(1);
  }
}

updateAll();
