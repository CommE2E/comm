const { CLIEngine } = require('eslint');

const cli = new CLIEngine({});

module.exports = {
  '*.{js,mjs,cjs}': (files) =>
    'eslint --cache --fix --max-warnings=0 ' +
    files.filter((file) => !cli.isPathIgnored(file)).join(' '),
  '*.{css,html,md,json}': 'prettier --write',
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
  '{landing,lib}/**/*.js': function serverFlow(files) {
    return 'yarn workspace landing flow --quiet';
  },
};
