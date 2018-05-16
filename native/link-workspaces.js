const findRoot = require('find-root');
const fs = require('fs-extra');
const path = require('path');

const link = (name, fromBase, toBase) => {
  const from = path.join(fromBase, 'node_modules', name);
  const to = path.join(toBase, 'node_modules', name);

  if (fs.existsSync(to)) {
    fs.removeSync(to);
  }

  fs.symlinkSync(from, to, 'dir');
};

const root = findRoot(__dirname, dir => {
  const pkg = path.join(dir, 'package.json');
  return fs.existsSync(pkg) && 'workspaces' in require(pkg);
});

link('react-native', root, __dirname);
