// @flow

const clangPaths = [
  {
    path: 'native/cpp/CommonCpp',
    extensions: ['h', 'cpp'],
    excludes: ['_generated'],
  },
  {
    path: 'services/lib/src',
    extensions: ['cpp', 'h'],
  },
  {
    path: 'services/tunnelbroker/src',
    extensions: ['cpp', 'h'],
  },
  {
    path: 'services/tunnelbroker/test',
    extensions: ['cpp', 'h'],
  },
  {
    path: 'services/backup/src',
    extensions: ['cpp', 'h'],
  },
  {
    path: 'services/backup/test',
    extensions: ['cpp', 'h'],
  },
  {
    path: 'services/blob/src',
    extensions: ['cpp', 'h'],
  },
  {
    path: 'services/blob/test',
    extensions: ['cpp', 'h'],
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
];

function getClangPaths() {
  return clangPaths.map(pathItem => pathItem.path);
}

module.exports = { getClangPaths, clangPaths };
