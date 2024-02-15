const { ESLint } = require('eslint');
const { getClangPaths } = require('./scripts/get-clang-paths');
const { findRustProjectPath } = require('./scripts/get-cargo-path');

const removeIgnoredFiles = async (files) => {
  const eslint = new ESLint();
  const isIgnored = await Promise.all(
    files.map(file => eslint.isPathIgnored(file)),
  );
  const filteredFiles = files.filter((_, i) => !isIgnored[i]);
  return filteredFiles.join(' ');
}

module.exports = {
  '*.{js,mjs,cjs}': async function eslint(files) {
    const filesToLint = await removeIgnoredFiles(files);
    return [`eslint --cache --fix --report-unused-disable-directives --max-warnings=0 ${filesToLint}`];
  },
  '*.{css,html,md,json}': function prettier(files) {
    return 'prettier --write ' + files.join(' ');
  },
  '*.sh': function shellCheck(files) {
    return 'shellcheck -x -P SCRIPTDIR ' + files.join(' ');
  },
  'lib/**/*.js': function libFlow(files) {
    return 'yarn workspace lib flow --quiet';
  },
  'lib/**/*.js': function libTest(files) {
    return 'yarn workspace lib test';
  },
  '{web,lib}/**/*.js': function webFlow(files) {
    return 'yarn workspace web flow --quiet';
  },
  'web/**/*.js': function webTest(files) {
    return 'yarn workspace web test';
  },
  '{native,lib}/**/*.js': function nativeFlow(files) {
    return 'yarn workspace native flow --quiet';
  },
  '{native,lib}/**/*.js': function nativeFlow(files) {
    return 'yarn workspace native test';
  },
  '{keyserver,web,lib}/**/*.js': function keyserverFlow(files) {
    return 'yarn workspace keyserver flow --quiet';
  },
  '{keyserver,web,lib}/**/*.js': function keyserverTest(files) {
    return 'yarn workspace keyserver test';
  },
  '{landing,lib}/**/*.js': function landingFlow(files) {
    return 'yarn workspace landing flow --quiet';
  },
  '{desktop,lib}/**/*.js': function desktopFlow(files) {
    return 'yarn workspace desktop flow --quiet';
  },
  'services/electron-update-server/**/*.js': function desktopFlow(files) {
    return 'yarn workspace electron-update-server flow --quiet';
  },
  'services/identity/**/*.rs': function testIdentity(files) {
    return 'bash -c "cd services/identity && cargo test"';
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
  '*.rs': function rustFormat(files) {
    const paths = new Set(files.map(findRustProjectPath).filter(Boolean));
    return `yarn rust-pre-commit ${Array.from(paths).join(' ')}`;
  },
  'services/terraform/**/*.tf': function checkTerraform(files) {
    return 'yarn terraform-pre-commit';
  },
};
