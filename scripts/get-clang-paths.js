/* eslint-disable ft-flow/require-valid-file-annotation */

const clangPaths = [
  {
    path: 'native/cpp/CommonCpp',
    extensions: ['h', 'cpp'],
    excludes: ['_generated'],
  },
  {
    path: 'native/android/app/src/cpp',
    extensions: ['cpp', 'h'],
  },
  {
    path: 'native/ios/Comm',
    extensions: ['h', 'm', 'mm'],
  },
  {
    path: 'native/ios/CommTests',
    extensions: ['mm'],
  },
  {
    path: 'native/ios/NotificationService',
    extensions: ['h', 'm', 'mm'],
  },
  {
    path: 'native/android/app/src/main/java/app/comm',
    extensions: ['java'],
    excludes: ['generated'],
  },
  {
    path: 'native/native_rust_library',
    extensions: ['cpp', 'h'],
    excludes: ['target', 'lib.rs.h', 'cxx.h'],
  },
  {
    path: 'web/cpp',
    extensions: ['cpp', 'h'],
  },
];

function getClangPaths() {
  return clangPaths.map(pathItem => pathItem.path);
}

module.exports = { getClangPaths, clangPaths };
