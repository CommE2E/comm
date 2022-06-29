const { CLIEngine } = require('eslint');
const { getClangPaths } = require('./scripts/get_clang_paths');

const cli = new CLIEngine({});

module.exports = {
  '*.{js,mjs,cjs}': function eslint(files) {
    // This logic is likely broken and needs to be updated. see ENG-1011
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
  '{keyserver,web,lib}/**/*.js': function keyServerFlow(files) {
    return 'yarn workspace keyserver flow --quiet';
  },
  '{landing,lib}/**/*.js': function landingFlow(files) {
    return 'yarn workspace landing flow --quiet';
  },
  '{native,services}/**/*.{h,cpp,java,mm}': function clangFormat(files) {
    files = files.filter(path => {
      if (path.indexOf('generated') !== -1) {
        return false;
      }
      for (const allowedPath of getClangPaths()) {
        if (path.indexOf(allowedPath) !== -1) {
          return true;
        }
      }
      return false;
    });
    return 'clang-format -i ' + files.join(' ');
  },
  'services/commtest/**/*.rs': function rustFormat(files) {
    return 'yarn rust-pre-commit';
  },
};
