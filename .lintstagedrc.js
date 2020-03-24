const { CLIEngine } = require('eslint');

const cli = new CLIEngine({ });

module.exports = {
  "*.js": "eslint --cache --fix",
  "lib/**/*.js": function libFlow(files) { return "yarn workspace lib flow --quiet" },
  "web/**/*.js": function webFlow(files) { return "yarn workspace web flow --quiet" },
  "native/**/*.js": function nativeFlow(files) { return "yarn workspace native flow --quiet" },
  "server/**/*.js": function serverFlow(files) { return "yarn workspace server flow --quiet" }
};
