const { CLIEngine } = require('eslint');

const cli = new CLIEngine({});

module.exports = {
  '*.{js,mjs}': function eslint(files) {
    return (
      'eslint --cache --fix --max-warnings=0 ' +
      files.filter(file => !cli.isPathIgnored(file)).join(' ')
    );
  },
  '*.{css,html,md,json}': function prettier(files) {
    return 'prettier --write ' + files.join(' ');
  },
  'lib/**/*.js': function libFlow(files) {
    return 'yarn workspace lib flow --quiet';
  },
  '{web,lib}/**/*.js': function webFlow(files) {
    return 'yarn workspace web flow --quiet';
  },
  '{native,lib}/**/*.js': function nativeFlow(files) {
    return 'yarn workspace native flow --quiet';
  },
  '{server,web,lib}/**/*.js': function serverFlow(files) {
    return 'yarn workspace server flow --quiet';
  },
  '{landing,lib}/**/*.js': function landingFlow(files) {
    return 'yarn workspace landing flow --quiet';
  },
  '{native,services}/**/*.{h,cpp,java,mm}': function clangFormat(files) {
    const allowedPaths = [
      'native/cpp/CommonCpp',
      'services/tunnelbroker/contents/server/src',
      'services/backup/contents/server/src',
      'native/android/app/src/cpp',
      'native/ios/Comm',
      'native/ios/CommTests',
      'native/android/app/src/main/java/app/comm',
    ];
    files = files.filter((path) => {
      if (path.indexOf('generated') !== -1) {
        return false;
      }
      for (const allowedPath of allowedPaths) {
        if (path.indexOf(allowedPath) !== -1) {
          return true;
        }
      }
      return false;
    });
    return 'clang-format -i ' + files.join(' ');
  },
};
