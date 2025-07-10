/* eslint-disable ft-flow/require-valid-file-annotation */

const { clangPaths } = require('./get-clang-paths.js');

(() => {
  let command = '(';
  clangPaths.forEach(pathItem => {
    const { path, extensions, excludes } = pathItem;
    command += `find ${path} `;
    command += extensions
      .map(extension => `-name '*.${extension}' `)
      .join('-o ');
    if (excludes) {
      command += `| grep -v '${excludes.map(exclude => exclude).join('\\|')}'`;
    }
    command += '; ';
  });
  command += ')';
  console.log(command);
})();
