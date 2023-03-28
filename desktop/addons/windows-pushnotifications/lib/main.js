// Copyright (c) Microsoft Corporation, Nadav Bar, and Felix Rieseberg
// All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the ""License""); you may
// not use this file except in compliance with the License. You may obtain a
// copy of the License at http://www.apache.org/licenses/LICENSE-2.0
//
// THIS CODE IS PROVIDED ON AN  *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS
// OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY
// IMPLIED WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
// MERCHANTABLITY OR NON-INFRINGEMENT.
//
// See the Apache Version 2.0 License for specific language governing
// permissions
// and limitations under the License.

// This file has been modified
// @flow

const npmScope = '';

module.exports = require('../build/Release/binding.node');

const externalReferencedNamespaces = [
  'Windows.Foundation',
  'Windows.ApplicationModel.Background',
];

let namespaceRegistry = global.__winRtNamespaces__;

function requireNamespace(namespace) {
  let moduleName = namespace.toLowerCase();

  if (npmScope) {
    moduleName = '@' + npmScope + '/' + moduleName;
  }

  const m = require(moduleName);
  delete namespaceRegistry[namespace];
  namespaceRegistry[namespace] = m;
  return m;
}

if (externalReferencedNamespaces.length > 0) {
  if (!namespaceRegistry) {
    namespaceRegistry = {};

    Object.defineProperty(global, '__winRtNamespaces__', {
      configurable: true,
      writable: false,
      enumerable: false,
      value: namespaceRegistry,
    });
  }

  for (const i in externalReferencedNamespaces) {
    const ns = externalReferencedNamespaces[i];

    if (!Object.prototype.hasOwnProperty.call(namespaceRegistry, ns)) {
      Object.defineProperty(namespaceRegistry, ns, {
        configurable: true,
        enumerable: true,
        get: requireNamespace.bind(null, ns),
      });
    }
  }
}
