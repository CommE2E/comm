// @flow

const findUp = require('find-up');

// finds the path to the parent directory containing a Cargo.toml file for the
// given path. Returns null if no Cargo.toml file is found.
function findRustProjectPath(path) {
  const cargoTomlPath = findUp.sync('Cargo.toml', { cwd: path });
  return cargoTomlPath ? cargoTomlPath.replace('/Cargo.toml', '') : null;
}

module.exports = { findRustProjectPath };
