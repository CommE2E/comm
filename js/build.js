!function(e){function r(e,r,o){return 4===arguments.length?t.apply(this,arguments):void n(e,{declarative:!0,deps:r,declare:o})}function t(e,r,t,o){n(e,{declarative:!1,deps:r,executingRequire:t,execute:o})}function n(e,r){r.name=e,e in v||(v[e]=r),r.normalizedDeps=r.deps}function o(e,r){if(r[e.groupIndex]=r[e.groupIndex]||[],-1==g.call(r[e.groupIndex],e)){r[e.groupIndex].push(e);for(var t=0,n=e.normalizedDeps.length;n>t;t++){var a=e.normalizedDeps[t],u=v[a];if(u&&!u.evaluated){var d=e.groupIndex+(u.declarative!=e.declarative);if(void 0===u.groupIndex||u.groupIndex<d){if(void 0!==u.groupIndex&&(r[u.groupIndex].splice(g.call(r[u.groupIndex],u),1),0==r[u.groupIndex].length))throw new TypeError("Mixed dependency cycle detected");u.groupIndex=d}o(u,r)}}}}function a(e){var r=v[e];r.groupIndex=0;var t=[];o(r,t);for(var n=!!r.declarative==t.length%2,a=t.length-1;a>=0;a--){for(var u=t[a],i=0;i<u.length;i++){var s=u[i];n?d(s):l(s)}n=!n}}function u(e){return y[e]||(y[e]={name:e,dependencies:[],exports:{},importers:[]})}function d(r){if(!r.module){var t=r.module=u(r.name),n=r.module.exports,o=r.declare.call(e,function(e,r){if(t.locked=!0,"object"==typeof e)for(var o in e)n[o]=e[o];else n[e]=r;for(var a=0,u=t.importers.length;u>a;a++){var d=t.importers[a];if(!d.locked)for(var i=0;i<d.dependencies.length;++i)d.dependencies[i]===t&&d.setters[i](n)}return t.locked=!1,r},{id:r.name});t.setters=o.setters,t.execute=o.execute;for(var a=0,i=r.normalizedDeps.length;i>a;a++){var l,s=r.normalizedDeps[a],c=v[s],f=y[s];f?l=f.exports:c&&!c.declarative?l=c.esModule:c?(d(c),f=c.module,l=f.exports):l=p(s),f&&f.importers?(f.importers.push(t),t.dependencies.push(f)):t.dependencies.push(null),t.setters[a]&&t.setters[a](l)}}}function i(e){var r,t=v[e];if(t)t.declarative?f(e,[]):t.evaluated||l(t),r=t.module.exports;else if(r=p(e),!r)throw new Error("Unable to load dependency "+e+".");return(!t||t.declarative)&&r&&r.__useDefault?r["default"]:r}function l(r){if(!r.module){var t={},n=r.module={exports:t,id:r.name};if(!r.executingRequire)for(var o=0,a=r.normalizedDeps.length;a>o;o++){var u=r.normalizedDeps[o],d=v[u];d&&l(d)}r.evaluated=!0;var c=r.execute.call(e,function(e){for(var t=0,n=r.deps.length;n>t;t++)if(r.deps[t]==e)return i(r.normalizedDeps[t]);throw new TypeError("Module "+e+" not declared as a dependency.")},t,n);void 0!==typeof c&&(n.exports=c),t=n.exports,t&&t.__esModule?r.esModule=t:r.esModule=s(t)}}function s(r){var t={};if(("object"==typeof r||"function"==typeof r)&&r!==e)if(m)for(var n in r)"default"!==n&&c(t,r,n);else{var o=r&&r.hasOwnProperty;for(var n in r)"default"===n||o&&!r.hasOwnProperty(n)||(t[n]=r[n])}return t["default"]=r,x(t,"__useDefault",{value:!0}),t}function c(e,r,t){try{var n;(n=Object.getOwnPropertyDescriptor(r,t))&&x(e,t,n)}catch(o){return e[t]=r[t],!1}}function f(r,t){var n=v[r];if(n&&!n.evaluated&&n.declarative){t.push(r);for(var o=0,a=n.normalizedDeps.length;a>o;o++){var u=n.normalizedDeps[o];-1==g.call(t,u)&&(v[u]?f(u,t):p(u))}n.evaluated||(n.evaluated=!0,n.module.execute.call(e))}}function p(e){if(I[e])return I[e];if("@node/"==e.substr(0,6))return I[e]=s(D(e.substr(6)));var r=v[e];if(!r)throw"Module "+e+" not present.";return a(e),f(e,[]),v[e]=void 0,r.declarative&&x(r.module.exports,"__esModule",{value:!0}),I[e]=r.declarative?r.module.exports:r.esModule}var v={},g=Array.prototype.indexOf||function(e){for(var r=0,t=this.length;t>r;r++)if(this[r]===e)return r;return-1},m=!0;try{Object.getOwnPropertyDescriptor({a:0},"a")}catch(h){m=!1}var x;!function(){try{Object.defineProperty({},"a",{})&&(x=Object.defineProperty)}catch(e){x=function(e,r,t){try{e[r]=t.value||t.get.call(e)}catch(n){}}}}();var y={},D="undefined"!=typeof System&&System._nodeRequire||"undefined"!=typeof require&&require.resolve&&"undefined"!=typeof process&&require,I={"@empty":{}};return function(e,n,o,a){return function(u){u(function(u){for(var d={_nodeRequire:D,register:r,registerDynamic:t,get:p,set:function(e,r){I[e]=r},newModule:function(e){return e}},i=0;i<n.length;i++)(function(e,r){r&&r.__esModule?I[e]=r:I[e]=s(r)})(n[i],arguments[i]);a(d);var l=p(e[0]);if(e.length>1)for(var i=1;i<e.length;i++)p(e[i]);return o?l["default"]:l})}}}("undefined"!=typeof self?self:global)

(["1"], [], false, function($__System) {
var require = this.require, exports = this.exports, module = this.module;
!function(e){function n(e,n){e=e.replace(l,"");var r=e.match(u),t=(r[1].split(",")[n]||"require").replace(s,""),i=p[t]||(p[t]=new RegExp(a+t+f,"g"));i.lastIndex=0;for(var o,c=[];o=i.exec(e);)c.push(o[2]||o[3]);return c}function r(e,n,t,o){if("object"==typeof e&&!(e instanceof Array))return r.apply(null,Array.prototype.splice.call(arguments,1,arguments.length-1));if("string"==typeof e&&"function"==typeof n&&(e=[e]),!(e instanceof Array)){if("string"==typeof e){var l=i.get(e);return l.__useDefault?l["default"]:l}throw new TypeError("Invalid require")}for(var a=[],f=0;f<e.length;f++)a.push(i["import"](e[f],o));Promise.all(a).then(function(e){n&&n.apply(null,e)},t)}function t(t,l,a){"string"!=typeof t&&(a=l,l=t,t=null),l instanceof Array||(a=l,l=["require","exports","module"].splice(0,a.length)),"function"!=typeof a&&(a=function(e){return function(){return e}}(a)),void 0===l[l.length-1]&&l.pop();var f,u,s;-1!=(f=o.call(l,"require"))&&(l.splice(f,1),t||(l=l.concat(n(a.toString(),f)))),-1!=(u=o.call(l,"exports"))&&l.splice(u,1),-1!=(s=o.call(l,"module"))&&l.splice(s,1);var p={name:t,deps:l,execute:function(n,t,o){for(var p=[],c=0;c<l.length;c++)p.push(n(l[c]));o.uri=o.id,o.config=function(){},-1!=s&&p.splice(s,0,o),-1!=u&&p.splice(u,0,t),-1!=f&&p.splice(f,0,function(e,t,l){return"string"==typeof e&&"function"!=typeof t?n(e):r.call(i,e,t,l,o.id)});var d=a.apply(-1==u?e:t,p);return"undefined"==typeof d&&o&&(d=o.exports),"undefined"!=typeof d?d:void 0}};if(t)c.anonDefine||c.isBundle?c.anonDefine&&c.anonDefine.name&&(c.anonDefine=null):c.anonDefine=p,c.isBundle=!0,i.registerDynamic(p.name,p.deps,!1,p.execute);else{if(c.anonDefine&&!c.anonDefine.name)throw new Error("Multiple anonymous defines in module "+t);c.anonDefine=p}}var i=$__System,o=Array.prototype.indexOf||function(e){for(var n=0,r=this.length;r>n;n++)if(this[n]===e)return n;return-1},l=/(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/gm,a="(?:^|[^$_a-zA-Z\\xA0-\\uFFFF.])",f="\\s*\\(\\s*(\"([^\"]+)\"|'([^']+)')\\s*\\)",u=/\(([^\)]*)\)/,s=/^\s+|\s+$/g,p={};t.amd={};var c={isBundle:!1,anonDefine:null};i.amdDefine=t,i.amdRequire=r}("undefined"!=typeof self?self:global);
$__System.registerDynamic('2', ['3', '4'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var getKeys = $__require('3'),
        toIObject = $__require('4');
    module.exports = function (object, el) {
        var O = toIObject(object),
            keys = getKeys(O),
            length = keys.length,
            index = 0,
            key;
        while (length > index) if (O[key = keys[index++]] === el) return key;
    };
    return module.exports;
});
$__System.registerDynamic('5', ['3', '6', '7'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var getKeys = $__require('3'),
        gOPS = $__require('6'),
        pIE = $__require('7');
    module.exports = function (it) {
        var result = getKeys(it),
            getSymbols = gOPS.f;
        if (getSymbols) {
            var symbols = getSymbols(it),
                isEnum = pIE.f,
                i = 0,
                key;
            while (symbols.length > i) if (isEnum.call(it, key = symbols[i++])) result.push(key);
        }
        return result;
    };
    return module.exports;
});
$__System.registerDynamic('8', ['9', 'a', 'b', 'c', 'd', 'e', 'f', '10', '11', '12', '13', '14', '15', '2', '5', '16', '17', '4', '18', '19', '1a', '1b', '1c', '1d', '3', '1e', '7', '6', '1f', '20'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var global = $__require('9'),
      has = $__require('a'),
      DESCRIPTORS = $__require('b'),
      $export = $__require('c'),
      redefine = $__require('d'),
      META = $__require('e').KEY,
      $fails = $__require('f'),
      shared = $__require('10'),
      setToStringTag = $__require('11'),
      uid = $__require('12'),
      wks = $__require('13'),
      wksExt = $__require('14'),
      wksDefine = $__require('15'),
      keyOf = $__require('2'),
      enumKeys = $__require('5'),
      isArray = $__require('16'),
      anObject = $__require('17'),
      toIObject = $__require('4'),
      toPrimitive = $__require('18'),
      createDesc = $__require('19'),
      _create = $__require('1a'),
      gOPNExt = $__require('1b'),
      $GOPD = $__require('1c'),
      $DP = $__require('1d'),
      $keys = $__require('3'),
      gOPD = $GOPD.f,
      dP = $DP.f,
      gOPN = gOPNExt.f,
      $Symbol = global.Symbol,
      $JSON = global.JSON,
      _stringify = $JSON && $JSON.stringify,
      PROTOTYPE = 'prototype',
      HIDDEN = wks('_hidden'),
      TO_PRIMITIVE = wks('toPrimitive'),
      isEnum = {}.propertyIsEnumerable,
      SymbolRegistry = shared('symbol-registry'),
      AllSymbols = shared('symbols'),
      OPSymbols = shared('op-symbols'),
      ObjectProto = Object[PROTOTYPE],
      USE_NATIVE = typeof $Symbol == 'function',
      QObject = global.QObject;
  var setter = !QObject || !QObject[PROTOTYPE] || !QObject[PROTOTYPE].findChild;
  var setSymbolDesc = DESCRIPTORS && $fails(function () {
    return _create(dP({}, 'a', { get: function () {
        return dP(this, 'a', { value: 7 }).a;
      } })).a != 7;
  }) ? function (it, key, D) {
    var protoDesc = gOPD(ObjectProto, key);
    if (protoDesc) delete ObjectProto[key];
    dP(it, key, D);
    if (protoDesc && it !== ObjectProto) dP(ObjectProto, key, protoDesc);
  } : dP;
  var wrap = function (tag) {
    var sym = AllSymbols[tag] = _create($Symbol[PROTOTYPE]);
    sym._k = tag;
    return sym;
  };
  var isSymbol = USE_NATIVE && typeof $Symbol.iterator == 'symbol' ? function (it) {
    return typeof it == 'symbol';
  } : function (it) {
    return it instanceof $Symbol;
  };
  var $defineProperty = function defineProperty(it, key, D) {
    if (it === ObjectProto) $defineProperty(OPSymbols, key, D);
    anObject(it);
    key = toPrimitive(key, true);
    anObject(D);
    if (has(AllSymbols, key)) {
      if (!D.enumerable) {
        if (!has(it, HIDDEN)) dP(it, HIDDEN, createDesc(1, {}));
        it[HIDDEN][key] = true;
      } else {
        if (has(it, HIDDEN) && it[HIDDEN][key]) it[HIDDEN][key] = false;
        D = _create(D, { enumerable: createDesc(0, false) });
      }
      return setSymbolDesc(it, key, D);
    }
    return dP(it, key, D);
  };
  var $defineProperties = function defineProperties(it, P) {
    anObject(it);
    var keys = enumKeys(P = toIObject(P)),
        i = 0,
        l = keys.length,
        key;
    while (l > i) $defineProperty(it, key = keys[i++], P[key]);
    return it;
  };
  var $create = function create(it, P) {
    return P === undefined ? _create(it) : $defineProperties(_create(it), P);
  };
  var $propertyIsEnumerable = function propertyIsEnumerable(key) {
    var E = isEnum.call(this, key = toPrimitive(key, true));
    if (this === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return false;
    return E || !has(this, key) || !has(AllSymbols, key) || has(this, HIDDEN) && this[HIDDEN][key] ? E : true;
  };
  var $getOwnPropertyDescriptor = function getOwnPropertyDescriptor(it, key) {
    it = toIObject(it);
    key = toPrimitive(key, true);
    if (it === ObjectProto && has(AllSymbols, key) && !has(OPSymbols, key)) return;
    var D = gOPD(it, key);
    if (D && has(AllSymbols, key) && !(has(it, HIDDEN) && it[HIDDEN][key])) D.enumerable = true;
    return D;
  };
  var $getOwnPropertyNames = function getOwnPropertyNames(it) {
    var names = gOPN(toIObject(it)),
        result = [],
        i = 0,
        key;
    while (names.length > i) {
      if (!has(AllSymbols, key = names[i++]) && key != HIDDEN && key != META) result.push(key);
    }
    return result;
  };
  var $getOwnPropertySymbols = function getOwnPropertySymbols(it) {
    var IS_OP = it === ObjectProto,
        names = gOPN(IS_OP ? OPSymbols : toIObject(it)),
        result = [],
        i = 0,
        key;
    while (names.length > i) {
      if (has(AllSymbols, key = names[i++]) && (IS_OP ? has(ObjectProto, key) : true)) result.push(AllSymbols[key]);
    }
    return result;
  };
  if (!USE_NATIVE) {
    $Symbol = function Symbol() {
      if (this instanceof $Symbol) throw TypeError('Symbol is not a constructor!');
      var tag = uid(arguments.length > 0 ? arguments[0] : undefined);
      var $set = function (value) {
        if (this === ObjectProto) $set.call(OPSymbols, value);
        if (has(this, HIDDEN) && has(this[HIDDEN], tag)) this[HIDDEN][tag] = false;
        setSymbolDesc(this, tag, createDesc(1, value));
      };
      if (DESCRIPTORS && setter) setSymbolDesc(ObjectProto, tag, {
        configurable: true,
        set: $set
      });
      return wrap(tag);
    };
    redefine($Symbol[PROTOTYPE], 'toString', function toString() {
      return this._k;
    });
    $GOPD.f = $getOwnPropertyDescriptor;
    $DP.f = $defineProperty;
    $__require('1e').f = gOPNExt.f = $getOwnPropertyNames;
    $__require('7').f = $propertyIsEnumerable;
    $__require('6').f = $getOwnPropertySymbols;
    if (DESCRIPTORS && !$__require('1f')) {
      redefine(ObjectProto, 'propertyIsEnumerable', $propertyIsEnumerable, true);
    }
    wksExt.f = function (name) {
      return wrap(wks(name));
    };
  }
  $export($export.G + $export.W + $export.F * !USE_NATIVE, { Symbol: $Symbol });
  for (var symbols = 'hasInstance,isConcatSpreadable,iterator,match,replace,search,species,split,toPrimitive,toStringTag,unscopables'.split(','), i = 0; symbols.length > i;) wks(symbols[i++]);
  for (var symbols = $keys(wks.store), i = 0; symbols.length > i;) wksDefine(symbols[i++]);
  $export($export.S + $export.F * !USE_NATIVE, 'Symbol', {
    'for': function (key) {
      return has(SymbolRegistry, key += '') ? SymbolRegistry[key] : SymbolRegistry[key] = $Symbol(key);
    },
    keyFor: function keyFor(key) {
      if (isSymbol(key)) return keyOf(SymbolRegistry, key);
      throw TypeError(key + ' is not a symbol!');
    },
    useSetter: function () {
      setter = true;
    },
    useSimple: function () {
      setter = false;
    }
  });
  $export($export.S + $export.F * !USE_NATIVE, 'Object', {
    create: $create,
    defineProperty: $defineProperty,
    defineProperties: $defineProperties,
    getOwnPropertyDescriptor: $getOwnPropertyDescriptor,
    getOwnPropertyNames: $getOwnPropertyNames,
    getOwnPropertySymbols: $getOwnPropertySymbols
  });
  $JSON && $export($export.S + $export.F * (!USE_NATIVE || $fails(function () {
    var S = $Symbol();
    return _stringify([S]) != '[null]' || _stringify({ a: S }) != '{}' || _stringify(Object(S)) != '{}';
  })), 'JSON', { stringify: function stringify(it) {
      if (it === undefined || isSymbol(it)) return;
      var args = [it],
          i = 1,
          replacer,
          $replacer;
      while (arguments.length > i) args.push(arguments[i++]);
      replacer = args[1];
      if (typeof replacer == 'function') $replacer = replacer;
      if ($replacer || !isArray(replacer)) replacer = function (key, value) {
        if ($replacer) value = $replacer.call(this, key, value);
        if (!isSymbol(value)) return value;
      };
      args[1] = replacer;
      return _stringify.apply($JSON, args);
    } });
  $Symbol[PROTOTYPE][TO_PRIMITIVE] || $__require('20')($Symbol[PROTOTYPE], TO_PRIMITIVE, $Symbol[PROTOTYPE].valueOf);
  setToStringTag($Symbol, 'Symbol');
  setToStringTag(Math, 'Math', true);
  setToStringTag(global.JSON, 'JSON', true);
  return module.exports;
});
$__System.registerDynamic('21', ['c', '1a'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Object', { create: $__require('1a') });
  return module.exports;
});
$__System.registerDynamic('22', ['c', 'b', '1d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S + $export.F * !$__require('b'), 'Object', { defineProperty: $__require('1d').f });
  return module.exports;
});
$__System.registerDynamic('23', ['c', 'b', '24'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S + $export.F * !$__require('b'), 'Object', { defineProperties: $__require('24') });
  return module.exports;
});
$__System.registerDynamic('25', ['4', '1c', '26'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var toIObject = $__require('4'),
      $getOwnPropertyDescriptor = $__require('1c').f;
  $__require('26')('getOwnPropertyDescriptor', function () {
    return function getOwnPropertyDescriptor(it, key) {
      return $getOwnPropertyDescriptor(toIObject(it), key);
    };
  });
  return module.exports;
});
$__System.registerDynamic('27', ['28', '29', '26'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var toObject = $__require('28'),
      $getPrototypeOf = $__require('29');
  $__require('26')('getPrototypeOf', function () {
    return function getPrototypeOf(it) {
      return $getPrototypeOf(toObject(it));
    };
  });
  return module.exports;
});
$__System.registerDynamic('2a', ['28', '3', '26'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var toObject = $__require('28'),
      $keys = $__require('3');
  $__require('26')('keys', function () {
    return function keys(it) {
      return $keys(toObject(it));
    };
  });
  return module.exports;
});
$__System.registerDynamic('1b', ['4', '1e'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var toIObject = $__require('4'),
      gOPN = $__require('1e').f,
      toString = {}.toString;
  var windowNames = typeof window == 'object' && window && Object.getOwnPropertyNames ? Object.getOwnPropertyNames(window) : [];
  var getWindowNames = function (it) {
    try {
      return gOPN(it);
    } catch (e) {
      return windowNames.slice();
    }
  };
  module.exports.f = function getOwnPropertyNames(it) {
    return windowNames && toString.call(it) == '[object Window]' ? getWindowNames(it) : gOPN(toIObject(it));
  };
  return module.exports;
});
$__System.registerDynamic('2b', ['26', '1b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('26')('getOwnPropertyNames', function () {
    return $__require('1b').f;
  });
  return module.exports;
});
$__System.registerDynamic('2c', ['2d', 'e', '26'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d'),
      meta = $__require('e').onFreeze;
  $__require('26')('freeze', function ($freeze) {
    return function freeze(it) {
      return $freeze && isObject(it) ? $freeze(meta(it)) : it;
    };
  });
  return module.exports;
});
$__System.registerDynamic('2e', ['2d', 'e', '26'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d'),
      meta = $__require('e').onFreeze;
  $__require('26')('seal', function ($seal) {
    return function seal(it) {
      return $seal && isObject(it) ? $seal(meta(it)) : it;
    };
  });
  return module.exports;
});
$__System.registerDynamic('2f', ['2d', 'e', '26'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d'),
      meta = $__require('e').onFreeze;
  $__require('26')('preventExtensions', function ($preventExtensions) {
    return function preventExtensions(it) {
      return $preventExtensions && isObject(it) ? $preventExtensions(meta(it)) : it;
    };
  });
  return module.exports;
});
$__System.registerDynamic('30', ['2d', '26'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d');
  $__require('26')('isFrozen', function ($isFrozen) {
    return function isFrozen(it) {
      return isObject(it) ? $isFrozen ? $isFrozen(it) : false : true;
    };
  });
  return module.exports;
});
$__System.registerDynamic('31', ['2d', '26'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d');
  $__require('26')('isSealed', function ($isSealed) {
    return function isSealed(it) {
      return isObject(it) ? $isSealed ? $isSealed(it) : false : true;
    };
  });
  return module.exports;
});
$__System.registerDynamic('26', ['c', '32', 'f'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        core = $__require('32'),
        fails = $__require('f');
    module.exports = function (KEY, exec) {
        var fn = (core.Object || {})[KEY] || Object[KEY],
            exp = {};
        exp[KEY] = exec(fn);
        $export($export.S + $export.F * fails(function () {
            fn(1);
        }), 'Object', exp);
    };
    return module.exports;
});
$__System.registerDynamic('33', ['2d', '26'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d');
  $__require('26')('isExtensible', function ($isExtensible) {
    return function isExtensible(it) {
      return isObject(it) ? $isExtensible ? $isExtensible(it) : true : false;
    };
  });
  return module.exports;
});
$__System.registerDynamic('34', ['c', '35'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S + $export.F, 'Object', { assign: $__require('35') });
  return module.exports;
});
$__System.registerDynamic('36', ['c', '37'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Object', { is: $__require('37') });
  return module.exports;
});
$__System.registerDynamic('38', ['c', '39'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Object', { setPrototypeOf: $__require('39').set });
  return module.exports;
});
$__System.registerDynamic('3a', ['3b', '13', 'd'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var classof = $__require('3b'),
      test = {};
  test[$__require('13')('toStringTag')] = 'z';
  if (test + '' != '[object z]') {
    $__require('d')(Object.prototype, 'toString', function toString() {
      return '[object ' + classof(this) + ']';
    }, true);
  }
  return module.exports;
});
$__System.registerDynamic('3c', ['c', '3d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.P, 'Function', { bind: $__require('3d') });
  return module.exports;
});
$__System.registerDynamic('3e', ['1d', '19', 'a', 'b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var dP = $__require('1d').f,
      createDesc = $__require('19'),
      has = $__require('a'),
      FProto = Function.prototype,
      nameRE = /^\s*function ([^ (]*)/,
      NAME = 'name';
  var isExtensible = Object.isExtensible || function () {
    return true;
  };
  NAME in FProto || $__require('b') && dP(FProto, NAME, {
    configurable: true,
    get: function () {
      try {
        var that = this,
            name = ('' + that).match(nameRE)[1];
        has(that, NAME) || !isExtensible(that) || dP(that, NAME, createDesc(5, name));
        return name;
      } catch (e) {
        return '';
      }
    }
  });
  return module.exports;
});
$__System.registerDynamic('3f', ['2d', '29', '13', '1d'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var isObject = $__require('2d'),
      getPrototypeOf = $__require('29'),
      HAS_INSTANCE = $__require('13')('hasInstance'),
      FunctionProto = Function.prototype;
  if (!(HAS_INSTANCE in FunctionProto)) $__require('1d').f(FunctionProto, HAS_INSTANCE, { value: function (O) {
      if (typeof this != 'function' || !isObject(O)) return false;
      if (!isObject(this.prototype)) return O instanceof this;
      while (O = getPrototypeOf(O)) if (this.prototype === O) return true;
      return false;
    } });
  return module.exports;
});
$__System.registerDynamic('40', ['c', '41'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $parseInt = $__require('41');
    $export($export.G + $export.F * (parseInt != $parseInt), { parseInt: $parseInt });
    return module.exports;
});
$__System.registerDynamic('42', ['c', '43'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $parseFloat = $__require('43');
    $export($export.G + $export.F * (parseFloat != $parseFloat), { parseFloat: $parseFloat });
    return module.exports;
});
$__System.registerDynamic('44', ['9', 'a', '45', '46', '18', 'f', '1e', '1c', '1d', '47', '1a', 'b', 'd'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var global = $__require('9'),
      has = $__require('a'),
      cof = $__require('45'),
      inheritIfRequired = $__require('46'),
      toPrimitive = $__require('18'),
      fails = $__require('f'),
      gOPN = $__require('1e').f,
      gOPD = $__require('1c').f,
      dP = $__require('1d').f,
      $trim = $__require('47').trim,
      NUMBER = 'Number',
      $Number = global[NUMBER],
      Base = $Number,
      proto = $Number.prototype,
      BROKEN_COF = cof($__require('1a')(proto)) == NUMBER,
      TRIM = 'trim' in String.prototype;
  var toNumber = function (argument) {
    var it = toPrimitive(argument, false);
    if (typeof it == 'string' && it.length > 2) {
      it = TRIM ? it.trim() : $trim(it, 3);
      var first = it.charCodeAt(0),
          third,
          radix,
          maxCode;
      if (first === 43 || first === 45) {
        third = it.charCodeAt(2);
        if (third === 88 || third === 120) return NaN;
      } else if (first === 48) {
        switch (it.charCodeAt(1)) {
          case 66:
          case 98:
            radix = 2;
            maxCode = 49;
            break;
          case 79:
          case 111:
            radix = 8;
            maxCode = 55;
            break;
          default:
            return +it;
        }
        for (var digits = it.slice(2), i = 0, l = digits.length, code; i < l; i++) {
          code = digits.charCodeAt(i);
          if (code < 48 || code > maxCode) return NaN;
        }
        return parseInt(digits, radix);
      }
    }
    return +it;
  };
  if (!$Number(' 0o1') || !$Number('0b1') || $Number('+0x1')) {
    $Number = function Number(value) {
      var it = arguments.length < 1 ? 0 : value,
          that = this;
      return that instanceof $Number && (BROKEN_COF ? fails(function () {
        proto.valueOf.call(that);
      }) : cof(that) != NUMBER) ? inheritIfRequired(new Base(toNumber(it)), that, $Number) : toNumber(it);
    };
    for (var keys = $__require('b') ? gOPN(Base) : ('MAX_VALUE,MIN_VALUE,NaN,NEGATIVE_INFINITY,POSITIVE_INFINITY,' + 'EPSILON,isFinite,isInteger,isNaN,isSafeInteger,MAX_SAFE_INTEGER,' + 'MIN_SAFE_INTEGER,parseFloat,parseInt,isInteger').split(','), j = 0, key; keys.length > j; j++) {
      if (has(Base, key = keys[j]) && !has($Number, key)) {
        dP($Number, key, gOPD(Base, key));
      }
    }
    $Number.prototype = proto;
    proto.constructor = $Number;
    $__require('d')(global, NUMBER, $Number);
  }
  return module.exports;
});
$__System.registerDynamic('48', ['c', '49', '4a', '4b', 'f'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      toInteger = $__require('49'),
      aNumberValue = $__require('4a'),
      repeat = $__require('4b'),
      $toFixed = 1..toFixed,
      floor = Math.floor,
      data = [0, 0, 0, 0, 0, 0],
      ERROR = 'Number.toFixed: incorrect invocation!',
      ZERO = '0';
  var multiply = function (n, c) {
    var i = -1,
        c2 = c;
    while (++i < 6) {
      c2 += n * data[i];
      data[i] = c2 % 1e7;
      c2 = floor(c2 / 1e7);
    }
  };
  var divide = function (n) {
    var i = 6,
        c = 0;
    while (--i >= 0) {
      c += data[i];
      data[i] = floor(c / n);
      c = c % n * 1e7;
    }
  };
  var numToString = function () {
    var i = 6,
        s = '';
    while (--i >= 0) {
      if (s !== '' || i === 0 || data[i] !== 0) {
        var t = String(data[i]);
        s = s === '' ? t : s + repeat.call(ZERO, 7 - t.length) + t;
      }
    }
    return s;
  };
  var pow = function (x, n, acc) {
    return n === 0 ? acc : n % 2 === 1 ? pow(x, n - 1, acc * x) : pow(x * x, n / 2, acc);
  };
  var log = function (x) {
    var n = 0,
        x2 = x;
    while (x2 >= 4096) {
      n += 12;
      x2 /= 4096;
    }
    while (x2 >= 2) {
      n += 1;
      x2 /= 2;
    }
    return n;
  };
  $export($export.P + $export.F * (!!$toFixed && (0.00008.toFixed(3) !== '0.000' || 0.9.toFixed(0) !== '1' || 1.255.toFixed(2) !== '1.25' || 1000000000000000128..toFixed(0) !== '1000000000000000128') || !$__require('f')(function () {
    $toFixed.call({});
  })), 'Number', { toFixed: function toFixed(fractionDigits) {
      var x = aNumberValue(this, ERROR),
          f = toInteger(fractionDigits),
          s = '',
          m = ZERO,
          e,
          z,
          j,
          k;
      if (f < 0 || f > 20) throw RangeError(ERROR);
      if (x != x) return 'NaN';
      if (x <= -1e21 || x >= 1e21) return String(x);
      if (x < 0) {
        s = '-';
        x = -x;
      }
      if (x > 1e-21) {
        e = log(x * pow(2, 69, 1)) - 69;
        z = e < 0 ? x * pow(2, -e, 1) : x / pow(2, e, 1);
        z *= 0x10000000000000;
        e = 52 - e;
        if (e > 0) {
          multiply(0, z);
          j = f;
          while (j >= 7) {
            multiply(1e7, 0);
            j -= 7;
          }
          multiply(pow(10, j, 1), 0);
          j = e - 1;
          while (j >= 23) {
            divide(1 << 23);
            j -= 23;
          }
          divide(1 << j);
          multiply(1, 1);
          divide(2);
          m = numToString();
        } else {
          multiply(0, z);
          multiply(1 << -e, 0);
          m = numToString() + repeat.call(ZERO, f);
        }
      }
      if (f > 0) {
        k = m.length;
        m = s + (k <= f ? '0.' + repeat.call(ZERO, f - k) + m : m.slice(0, k - f) + '.' + m.slice(k - f));
      } else {
        m = s + m;
      }
      return m;
    } });
  return module.exports;
});
$__System.registerDynamic('4a', ['45'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var cof = $__require('45');
  module.exports = function (it, msg) {
    if (typeof it != 'number' && cof(it) != 'Number') throw TypeError(msg);
    return +it;
  };
  return module.exports;
});
$__System.registerDynamic('4c', ['c', 'f', '4a'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      $fails = $__require('f'),
      aNumberValue = $__require('4a'),
      $toPrecision = 1..toPrecision;
  $export($export.P + $export.F * ($fails(function () {
    return $toPrecision.call(1, undefined) !== '1';
  }) || !$fails(function () {
    $toPrecision.call({});
  })), 'Number', { toPrecision: function toPrecision(precision) {
      var that = aNumberValue(this, 'Number#toPrecision: incorrect invocation!');
      return precision === undefined ? $toPrecision.call(that) : $toPrecision.call(that, precision);
    } });
  return module.exports;
});
$__System.registerDynamic('4d', ['c'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Number', { EPSILON: Math.pow(2, -52) });
  return module.exports;
});
$__System.registerDynamic('4e', ['c', '9'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        _isFinite = $__require('9').isFinite;
    $export($export.S, 'Number', { isFinite: function isFinite(it) {
            return typeof it == 'number' && _isFinite(it);
        } });
    return module.exports;
});
$__System.registerDynamic('4f', ['c', '50'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Number', { isInteger: $__require('50') });
  return module.exports;
});
$__System.registerDynamic('51', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Number', { isNaN: function isNaN(number) {
            return number != number;
        } });
    return module.exports;
});
$__System.registerDynamic('50', ['2d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d'),
      floor = Math.floor;
  module.exports = function isInteger(it) {
    return !isObject(it) && isFinite(it) && floor(it) === it;
  };
  return module.exports;
});
$__System.registerDynamic('52', ['c', '50'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        isInteger = $__require('50'),
        abs = Math.abs;
    $export($export.S, 'Number', { isSafeInteger: function isSafeInteger(number) {
            return isInteger(number) && abs(number) <= 0x1fffffffffffff;
        } });
    return module.exports;
});
$__System.registerDynamic('53', ['c'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Number', { MAX_SAFE_INTEGER: 0x1fffffffffffff });
  return module.exports;
});
$__System.registerDynamic('54', ['c'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Number', { MIN_SAFE_INTEGER: -0x1fffffffffffff });
  return module.exports;
});
$__System.registerDynamic('43', ['9', '47', '55'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $parseFloat = $__require('9').parseFloat,
        $trim = $__require('47').trim;
    module.exports = 1 / $parseFloat($__require('55') + '-0') !== -Infinity ? function parseFloat(str) {
        var string = $trim(String(str), 3),
            result = $parseFloat(string);
        return result === 0 && string.charAt(0) == '-' ? -0 : result;
    } : $parseFloat;
    return module.exports;
});
$__System.registerDynamic('56', ['c', '43'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $parseFloat = $__require('43');
    $export($export.S + $export.F * (Number.parseFloat != $parseFloat), 'Number', { parseFloat: $parseFloat });
    return module.exports;
});
$__System.registerDynamic('41', ['9', '47', '55'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $parseInt = $__require('9').parseInt,
        $trim = $__require('47').trim,
        ws = $__require('55'),
        hex = /^[\-+]?0[xX]/;
    module.exports = $parseInt(ws + '08') !== 8 || $parseInt(ws + '0x16') !== 22 ? function parseInt(str, radix) {
        var string = $trim(String(str), 3);
        return $parseInt(string, radix >>> 0 || (hex.test(string) ? 16 : 10));
    } : $parseInt;
    return module.exports;
});
$__System.registerDynamic('57', ['c', '41'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $parseInt = $__require('41');
    $export($export.S + $export.F * (Number.parseInt != $parseInt), 'Number', { parseInt: $parseInt });
    return module.exports;
});
$__System.registerDynamic('58', ['c', '59'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        log1p = $__require('59'),
        sqrt = Math.sqrt,
        $acosh = Math.acosh;
    $export($export.S + $export.F * !($acosh && Math.floor($acosh(Number.MAX_VALUE)) == 710 && $acosh(Infinity) == Infinity), 'Math', { acosh: function acosh(x) {
            return (x = +x) < 1 ? NaN : x > 94906265.62425156 ? Math.log(x) + Math.LN2 : log1p(x - 1 + sqrt(x - 1) * sqrt(x + 1));
        } });
    return module.exports;
});
$__System.registerDynamic('5a', ['c'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c'),
      $asinh = Math.asinh;
  function asinh(x) {
    return !isFinite(x = +x) || x == 0 ? x : x < 0 ? -asinh(-x) : Math.log(x + Math.sqrt(x * x + 1));
  }
  $export($export.S + $export.F * !($asinh && 1 / $asinh(0) > 0), 'Math', { asinh: asinh });
  return module.exports;
});
$__System.registerDynamic('5b', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $atanh = Math.atanh;
    $export($export.S + $export.F * !($atanh && 1 / $atanh(-0) < 0), 'Math', { atanh: function atanh(x) {
            return (x = +x) == 0 ? x : Math.log((1 + x) / (1 - x)) / 2;
        } });
    return module.exports;
});
$__System.registerDynamic('5c', ['c', '5d'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        sign = $__require('5d');
    $export($export.S, 'Math', { cbrt: function cbrt(x) {
            return sign(x = +x) * Math.pow(Math.abs(x), 1 / 3);
        } });
    return module.exports;
});
$__System.registerDynamic('5e', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Math', { clz32: function clz32(x) {
            return (x >>>= 0) ? 31 - Math.floor(Math.log(x + 0.5) * Math.LOG2E) : 32;
        } });
    return module.exports;
});
$__System.registerDynamic('5f', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        exp = Math.exp;
    $export($export.S, 'Math', { cosh: function cosh(x) {
            return (exp(x = +x) + exp(-x)) / 2;
        } });
    return module.exports;
});
$__System.registerDynamic('60', ['c', '61'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $expm1 = $__require('61');
    $export($export.S + $export.F * ($expm1 != Math.expm1), 'Math', { expm1: $expm1 });
    return module.exports;
});
$__System.registerDynamic('62', ['c', '5d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c'),
      sign = $__require('5d'),
      pow = Math.pow,
      EPSILON = pow(2, -52),
      EPSILON32 = pow(2, -23),
      MAX32 = pow(2, 127) * (2 - EPSILON32),
      MIN32 = pow(2, -126);
  var roundTiesToEven = function (n) {
    return n + 1 / EPSILON - 1 / EPSILON;
  };
  $export($export.S, 'Math', { fround: function fround(x) {
      var $abs = Math.abs(x),
          $sign = sign(x),
          a,
          result;
      if ($abs < MIN32) return $sign * roundTiesToEven($abs / MIN32 / EPSILON32) * MIN32 * EPSILON32;
      a = (1 + EPSILON32 / EPSILON) * $abs;
      result = a - (a - $abs);
      if (result > MAX32 || result != result) return $sign * Infinity;
      return $sign * result;
    } });
  return module.exports;
});
$__System.registerDynamic('63', ['c'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c'),
      abs = Math.abs;
  $export($export.S, 'Math', { hypot: function hypot(value1, value2) {
      var sum = 0,
          i = 0,
          aLen = arguments.length,
          larg = 0,
          arg,
          div;
      while (i < aLen) {
        arg = abs(arguments[i++]);
        if (larg < arg) {
          div = larg / arg;
          sum = sum * div * div + 1;
          larg = arg;
        } else if (arg > 0) {
          div = arg / larg;
          sum += div * div;
        } else sum += arg;
      }
      return larg === Infinity ? Infinity : larg * Math.sqrt(sum);
    } });
  return module.exports;
});
$__System.registerDynamic('64', ['c', 'f'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $imul = Math.imul;
    $export($export.S + $export.F * $__require('f')(function () {
        return $imul(0xffffffff, 5) != -5 || $imul.length != 2;
    }), 'Math', { imul: function imul(x, y) {
            var UINT16 = 0xffff,
                xn = +x,
                yn = +y,
                xl = UINT16 & xn,
                yl = UINT16 & yn;
            return 0 | xl * yl + ((UINT16 & xn >>> 16) * yl + xl * (UINT16 & yn >>> 16) << 16 >>> 0);
        } });
    return module.exports;
});
$__System.registerDynamic('65', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Math', { log10: function log10(x) {
            return Math.log(x) / Math.LN10;
        } });
    return module.exports;
});
$__System.registerDynamic("59", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  // 20.2.2.20 Math.log1p(x)
  module.exports = Math.log1p || function log1p(x) {
    return (x = +x) > -1e-8 && x < 1e-8 ? x - x * x / 2 : Math.log(1 + x);
  };
  return module.exports;
});
$__System.registerDynamic('66', ['c', '59'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Math', { log1p: $__require('59') });
  return module.exports;
});
$__System.registerDynamic('67', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Math', { log2: function log2(x) {
            return Math.log(x) / Math.LN2;
        } });
    return module.exports;
});
$__System.registerDynamic("5d", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  // 20.2.2.28 Math.sign(x)
  module.exports = Math.sign || function sign(x) {
    return (x = +x) == 0 || x != x ? x : x < 0 ? -1 : 1;
  };
  return module.exports;
});
$__System.registerDynamic('68', ['c', '5d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Math', { sign: $__require('5d') });
  return module.exports;
});
$__System.registerDynamic('69', ['c', '61', 'f'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        expm1 = $__require('61'),
        exp = Math.exp;
    $export($export.S + $export.F * $__require('f')(function () {
        return !Math.sinh(-2e-17) != -2e-17;
    }), 'Math', { sinh: function sinh(x) {
            return Math.abs(x = +x) < 1 ? (expm1(x) - expm1(-x)) / 2 : (exp(x - 1) - exp(-x - 1)) * (Math.E / 2);
        } });
    return module.exports;
});
$__System.registerDynamic("61", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  // 20.2.2.14 Math.expm1(x)
  var $expm1 = Math.expm1;
  module.exports = !$expm1
  // Old FF bug
  || $expm1(10) > 22025.465794806719 || $expm1(10) < 22025.4657948067165168
  // Tor Browser bug
  || $expm1(-2e-17) != -2e-17 ? function expm1(x) {
    return (x = +x) == 0 ? x : x > -1e-6 && x < 1e-6 ? x + x * x / 2 : Math.exp(x) - 1;
  } : $expm1;
  return module.exports;
});
$__System.registerDynamic('6a', ['c', '61'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        expm1 = $__require('61'),
        exp = Math.exp;
    $export($export.S, 'Math', { tanh: function tanh(x) {
            var a = expm1(x = +x),
                b = expm1(-x);
            return a == Infinity ? 1 : b == Infinity ? -1 : (a - b) / (exp(x) + exp(-x));
        } });
    return module.exports;
});
$__System.registerDynamic('6b', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Math', { trunc: function trunc(it) {
            return (it > 0 ? Math.floor : Math.ceil)(it);
        } });
    return module.exports;
});
$__System.registerDynamic('6c', ['c', '6d'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        toIndex = $__require('6d'),
        fromCharCode = String.fromCharCode,
        $fromCodePoint = String.fromCodePoint;
    $export($export.S + $export.F * (!!$fromCodePoint && $fromCodePoint.length != 1), 'String', { fromCodePoint: function fromCodePoint(x) {
            var res = [],
                aLen = arguments.length,
                i = 0,
                code;
            while (aLen > i) {
                code = +arguments[i++];
                if (toIndex(code, 0x10ffff) !== code) throw RangeError(code + ' is not a valid code point');
                res.push(code < 0x10000 ? fromCharCode(code) : fromCharCode(((code -= 0x10000) >> 10) + 0xd800, code % 0x400 + 0xdc00));
            }
            return res.join('');
        } });
    return module.exports;
});
$__System.registerDynamic('6e', ['c', '4', '6f'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        toIObject = $__require('4'),
        toLength = $__require('6f');
    $export($export.S, 'String', { raw: function raw(callSite) {
            var tpl = toIObject(callSite.raw),
                len = toLength(tpl.length),
                aLen = arguments.length,
                res = [],
                i = 0;
            while (len > i) {
                res.push(String(tpl[i++]));
                if (i < aLen) res.push(String(arguments[i]));
            }
            return res.join('');
        } });
    return module.exports;
});
$__System.registerDynamic('70', ['47'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('47')('trim', function ($trim) {
    return function trim() {
      return $trim(this, 3);
    };
  });
  return module.exports;
});
$__System.registerDynamic('71', ['72', '73'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $at = $__require('72')(true);
  $__require('73')(String, 'String', function (iterated) {
    this._t = String(iterated);
    this._i = 0;
  }, function () {
    var O = this._t,
        index = this._i,
        point;
    if (index >= O.length) return {
      value: undefined,
      done: true
    };
    point = $at(O, index);
    this._i += point.length;
    return {
      value: point,
      done: false
    };
  });
  return module.exports;
});
$__System.registerDynamic('74', ['c', '72'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $at = $__require('72')(false);
    $export($export.P, 'String', { codePointAt: function codePointAt(pos) {
            return $at(this, pos);
        } });
    return module.exports;
});
$__System.registerDynamic('75', ['c', '6f', '76', '77'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        toLength = $__require('6f'),
        context = $__require('76'),
        ENDS_WITH = 'endsWith',
        $endsWith = ''[ENDS_WITH];
    $export($export.P + $export.F * $__require('77')(ENDS_WITH), 'String', { endsWith: function endsWith(searchString) {
            var that = context(this, searchString, ENDS_WITH),
                endPosition = arguments.length > 1 ? arguments[1] : undefined,
                len = toLength(that.length),
                end = endPosition === undefined ? len : Math.min(toLength(endPosition), len),
                search = String(searchString);
            return $endsWith ? $endsWith.call(that, search, end) : that.slice(end - search.length, end) === search;
        } });
    return module.exports;
});
$__System.registerDynamic('78', ['c', '76', '77'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        context = $__require('76'),
        INCLUDES = 'includes';
    $export($export.P + $export.F * $__require('77')(INCLUDES), 'String', { includes: function includes(searchString) {
            return !!~context(this, searchString, INCLUDES).indexOf(searchString, arguments.length > 1 ? arguments[1] : undefined);
        } });
    return module.exports;
});
$__System.registerDynamic('79', ['c', '4b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.P, 'String', { repeat: $__require('4b') });
  return module.exports;
});
$__System.registerDynamic('76', ['7a', '7b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isRegExp = $__require('7a'),
      defined = $__require('7b');
  module.exports = function (that, searchString, NAME) {
    if (isRegExp(searchString)) throw TypeError('String#' + NAME + " doesn't accept regex!");
    return String(defined(that));
  };
  return module.exports;
});
$__System.registerDynamic('77', ['13'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var MATCH = $__require('13')('match');
  module.exports = function (KEY) {
    var re = /./;
    try {
      '/./'[KEY](re);
    } catch (e) {
      try {
        re[MATCH] = false;
        return !'/./'[KEY](re);
      } catch (f) {}
    }
    return true;
  };
  return module.exports;
});
$__System.registerDynamic('7c', ['c', '6f', '76', '77'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        toLength = $__require('6f'),
        context = $__require('76'),
        STARTS_WITH = 'startsWith',
        $startsWith = ''[STARTS_WITH];
    $export($export.P + $export.F * $__require('77')(STARTS_WITH), 'String', { startsWith: function startsWith(searchString) {
            var that = context(this, searchString, STARTS_WITH),
                index = toLength(Math.min(arguments.length > 1 ? arguments[1] : undefined, that.length)),
                search = String(searchString);
            return $startsWith ? $startsWith.call(that, search, index) : that.slice(index, index + search.length) === search;
        } });
    return module.exports;
});
$__System.registerDynamic('7d', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('anchor', function (createHTML) {
    return function anchor(name) {
      return createHTML(this, 'a', 'name', name);
    };
  });
  return module.exports;
});
$__System.registerDynamic('7f', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('big', function (createHTML) {
    return function big() {
      return createHTML(this, 'big', '', '');
    };
  });
  return module.exports;
});
$__System.registerDynamic('80', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('blink', function (createHTML) {
    return function blink() {
      return createHTML(this, 'blink', '', '');
    };
  });
  return module.exports;
});
$__System.registerDynamic('81', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('bold', function (createHTML) {
    return function bold() {
      return createHTML(this, 'b', '', '');
    };
  });
  return module.exports;
});
$__System.registerDynamic('82', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('fixed', function (createHTML) {
    return function fixed() {
      return createHTML(this, 'tt', '', '');
    };
  });
  return module.exports;
});
$__System.registerDynamic('83', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('fontcolor', function (createHTML) {
    return function fontcolor(color) {
      return createHTML(this, 'font', 'color', color);
    };
  });
  return module.exports;
});
$__System.registerDynamic('84', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('fontsize', function (createHTML) {
    return function fontsize(size) {
      return createHTML(this, 'font', 'size', size);
    };
  });
  return module.exports;
});
$__System.registerDynamic('85', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('italics', function (createHTML) {
    return function italics() {
      return createHTML(this, 'i', '', '');
    };
  });
  return module.exports;
});
$__System.registerDynamic('86', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('link', function (createHTML) {
    return function link(url) {
      return createHTML(this, 'a', 'href', url);
    };
  });
  return module.exports;
});
$__System.registerDynamic('87', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('small', function (createHTML) {
    return function small() {
      return createHTML(this, 'small', '', '');
    };
  });
  return module.exports;
});
$__System.registerDynamic('88', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('strike', function (createHTML) {
    return function strike() {
      return createHTML(this, 'strike', '', '');
    };
  });
  return module.exports;
});
$__System.registerDynamic('89', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('sub', function (createHTML) {
    return function sub() {
      return createHTML(this, 'sub', '', '');
    };
  });
  return module.exports;
});
$__System.registerDynamic('7e', ['c', 'f', '7b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c'),
      fails = $__require('f'),
      defined = $__require('7b'),
      quot = /"/g;
  var createHTML = function (string, tag, attribute, value) {
    var S = String(defined(string)),
        p1 = '<' + tag;
    if (attribute !== '') p1 += ' ' + attribute + '="' + String(value).replace(quot, '&quot;') + '"';
    return p1 + '>' + S + '</' + tag + '>';
  };
  module.exports = function (NAME, exec) {
    var O = {};
    O[NAME] = exec(createHTML);
    $export($export.P + $export.F * fails(function () {
      var test = ''[NAME]('"');
      return test !== test.toLowerCase() || test.split('"').length > 3;
    }), 'String', O);
  };
  return module.exports;
});
$__System.registerDynamic('8a', ['7e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('7e')('sup', function (createHTML) {
    return function sup() {
      return createHTML(this, 'sup', '', '');
    };
  });
  return module.exports;
});
$__System.registerDynamic('8b', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Date', { now: function () {
            return new Date().getTime();
        } });
    return module.exports;
});
$__System.registerDynamic('8c', ['c', '28', '18', 'f'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        toObject = $__require('28'),
        toPrimitive = $__require('18');
    $export($export.P + $export.F * $__require('f')(function () {
        return new Date(NaN).toJSON() !== null || Date.prototype.toJSON.call({ toISOString: function () {
                return 1;
            } }) !== 1;
    }), 'Date', { toJSON: function toJSON(key) {
            var O = toObject(this),
                pv = toPrimitive(O);
            return typeof pv == 'number' && !isFinite(pv) ? null : O.toISOString();
        } });
    return module.exports;
});
$__System.registerDynamic('8d', ['c', 'f'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      fails = $__require('f'),
      getTime = Date.prototype.getTime;
  var lz = function (num) {
    return num > 9 ? num : '0' + num;
  };
  $export($export.P + $export.F * (fails(function () {
    return new Date(-5e13 - 1).toISOString() != '0385-07-25T07:06:39.999Z';
  }) || !fails(function () {
    new Date(NaN).toISOString();
  })), 'Date', { toISOString: function toISOString() {
      if (!isFinite(getTime.call(this))) throw RangeError('Invalid time value');
      var d = this,
          y = d.getUTCFullYear(),
          m = d.getUTCMilliseconds(),
          s = y < 0 ? '-' : y > 9999 ? '+' : '';
      return s + ('00000' + Math.abs(y)).slice(s ? -6 : -4) + '-' + lz(d.getUTCMonth() + 1) + '-' + lz(d.getUTCDate()) + 'T' + lz(d.getUTCHours()) + ':' + lz(d.getUTCMinutes()) + ':' + lz(d.getUTCSeconds()) + '.' + (m > 99 ? m : '0' + lz(m)) + 'Z';
    } });
  return module.exports;
});
$__System.registerDynamic('8e', ['d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var DateProto = Date.prototype,
      INVALID_DATE = 'Invalid Date',
      TO_STRING = 'toString',
      $toString = DateProto[TO_STRING],
      getTime = DateProto.getTime;
  if (new Date(NaN) + '' != INVALID_DATE) {
    $__require('d')(DateProto, TO_STRING, function toString() {
      var value = getTime.call(this);
      return value === value ? $toString.call(this) : INVALID_DATE;
    });
  }
  return module.exports;
});
$__System.registerDynamic('8f', ['17', '18'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var anObject = $__require('17'),
      toPrimitive = $__require('18'),
      NUMBER = 'number';
  module.exports = function (hint) {
    if (hint !== 'string' && hint !== NUMBER && hint !== 'default') throw TypeError('Incorrect hint');
    return toPrimitive(anObject(this), hint != NUMBER);
  };
  return module.exports;
});
$__System.registerDynamic('90', ['13', '20', '8f'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var TO_PRIMITIVE = $__require('13')('toPrimitive'),
        proto = Date.prototype;
    if (!(TO_PRIMITIVE in proto)) $__require('20')(proto, TO_PRIMITIVE, $__require('8f'));
    return module.exports;
});
$__System.registerDynamic('91', ['c', '16'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Array', { isArray: $__require('16') });
  return module.exports;
});
$__System.registerDynamic('92', ['93', 'c', '28', '94', '95', '6f', '96', '97', '98'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var ctx = $__require('93'),
      $export = $__require('c'),
      toObject = $__require('28'),
      call = $__require('94'),
      isArrayIter = $__require('95'),
      toLength = $__require('6f'),
      createProperty = $__require('96'),
      getIterFn = $__require('97');
  $export($export.S + $export.F * !$__require('98')(function (iter) {
    Array.from(iter);
  }), 'Array', { from: function from(arrayLike) {
      var O = toObject(arrayLike),
          C = typeof this == 'function' ? this : Array,
          aLen = arguments.length,
          mapfn = aLen > 1 ? arguments[1] : undefined,
          mapping = mapfn !== undefined,
          index = 0,
          iterFn = getIterFn(O),
          length,
          result,
          step,
          iterator;
      if (mapping) mapfn = ctx(mapfn, aLen > 2 ? arguments[2] : undefined, 2);
      if (iterFn != undefined && !(C == Array && isArrayIter(iterFn))) {
        for (iterator = iterFn.call(O), result = new C(); !(step = iterator.next()).done; index++) {
          createProperty(result, index, mapping ? call(iterator, mapfn, [step.value, index], true) : step.value);
        }
      } else {
        length = toLength(O.length);
        for (result = new C(length); length > index; index++) {
          createProperty(result, index, mapping ? mapfn(O[index], index) : O[index]);
        }
      }
      result.length = index;
      return result;
    } });
  return module.exports;
});
$__System.registerDynamic('99', ['c', '96', 'f'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      createProperty = $__require('96');
  $export($export.S + $export.F * $__require('f')(function () {
    function F() {}
    return !(Array.of.call(F) instanceof F);
  }), 'Array', { of: function of() {
      var index = 0,
          aLen = arguments.length,
          result = new (typeof this == 'function' ? this : Array)(aLen);
      while (aLen > index) createProperty(result, index, arguments[index++]);
      result.length = aLen;
      return result;
    } });
  return module.exports;
});
$__System.registerDynamic('9a', ['c', '4', '9b', '9c'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        toIObject = $__require('4'),
        arrayJoin = [].join;
    $export($export.P + $export.F * ($__require('9b') != Object || !$__require('9c')(arrayJoin)), 'Array', { join: function join(separator) {
            return arrayJoin.call(toIObject(this), separator === undefined ? ',' : separator);
        } });
    return module.exports;
});
$__System.registerDynamic('9d', ['c', '9e', '45', '6d', '6f', 'f'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        html = $__require('9e'),
        cof = $__require('45'),
        toIndex = $__require('6d'),
        toLength = $__require('6f'),
        arraySlice = [].slice;
    $export($export.P + $export.F * $__require('f')(function () {
        if (html) arraySlice.call(html);
    }), 'Array', { slice: function slice(begin, end) {
            var len = toLength(this.length),
                klass = cof(this);
            end = end === undefined ? len : end;
            if (klass == 'Array') return arraySlice.call(this, begin, end);
            var start = toIndex(begin, len),
                upTo = toIndex(end, len),
                size = toLength(upTo - start),
                cloned = Array(size),
                i = 0;
            for (; i < size; i++) cloned[i] = klass == 'String' ? this.charAt(start + i) : this[start + i];
            return cloned;
        } });
    return module.exports;
});
$__System.registerDynamic('9f', ['c', 'a0', '28', 'f', '9c'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      aFunction = $__require('a0'),
      toObject = $__require('28'),
      fails = $__require('f'),
      $sort = [].sort,
      test = [1, 2, 3];
  $export($export.P + $export.F * (fails(function () {
    test.sort(undefined);
  }) || !fails(function () {
    test.sort(null);
  }) || !$__require('9c')($sort)), 'Array', { sort: function sort(comparefn) {
      return comparefn === undefined ? $sort.call(toObject(this)) : $sort.call(toObject(this), aFunction(comparefn));
    } });
  return module.exports;
});
$__System.registerDynamic('a1', ['c', 'a2', '9c'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $forEach = $__require('a2')(0),
        STRICT = $__require('9c')([].forEach, true);
    $export($export.P + $export.F * !STRICT, 'Array', { forEach: function forEach(callbackfn) {
            return $forEach(this, callbackfn, arguments[1]);
        } });
    return module.exports;
});
$__System.registerDynamic('a3', ['c', 'a2', '9c'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $map = $__require('a2')(1);
    $export($export.P + $export.F * !$__require('9c')([].map, true), 'Array', { map: function map(callbackfn) {
            return $map(this, callbackfn, arguments[1]);
        } });
    return module.exports;
});
$__System.registerDynamic('a4', ['c', 'a2', '9c'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $filter = $__require('a2')(2);
    $export($export.P + $export.F * !$__require('9c')([].filter, true), 'Array', { filter: function filter(callbackfn) {
            return $filter(this, callbackfn, arguments[1]);
        } });
    return module.exports;
});
$__System.registerDynamic('a5', ['c', 'a2', '9c'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $some = $__require('a2')(3);
    $export($export.P + $export.F * !$__require('9c')([].some, true), 'Array', { some: function some(callbackfn) {
            return $some(this, callbackfn, arguments[1]);
        } });
    return module.exports;
});
$__System.registerDynamic('a6', ['c', 'a2', '9c'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $every = $__require('a2')(4);
    $export($export.P + $export.F * !$__require('9c')([].every, true), 'Array', { every: function every(callbackfn) {
            return $every(this, callbackfn, arguments[1]);
        } });
    return module.exports;
});
$__System.registerDynamic('a7', ['c', 'a8', '9c'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $reduce = $__require('a8');
    $export($export.P + $export.F * !$__require('9c')([].reduce, true), 'Array', { reduce: function reduce(callbackfn) {
            return $reduce(this, callbackfn, arguments.length, arguments[1], false);
        } });
    return module.exports;
});
$__System.registerDynamic('a8', ['a0', '28', '9b', '6f'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var aFunction = $__require('a0'),
      toObject = $__require('28'),
      IObject = $__require('9b'),
      toLength = $__require('6f');
  module.exports = function (that, callbackfn, aLen, memo, isRight) {
    aFunction(callbackfn);
    var O = toObject(that),
        self = IObject(O),
        length = toLength(O.length),
        index = isRight ? length - 1 : 0,
        i = isRight ? -1 : 1;
    if (aLen < 2) for (;;) {
      if (index in self) {
        memo = self[index];
        index += i;
        break;
      }
      index += i;
      if (isRight ? index < 0 : length <= index) {
        throw TypeError('Reduce of empty array with no initial value');
      }
    }
    for (; isRight ? index >= 0 : length > index; index += i) if (index in self) {
      memo = callbackfn(memo, self[index], index, O);
    }
    return memo;
  };
  return module.exports;
});
$__System.registerDynamic('a9', ['c', 'a8', '9c'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $reduce = $__require('a8');
    $export($export.P + $export.F * !$__require('9c')([].reduceRight, true), 'Array', { reduceRight: function reduceRight(callbackfn) {
            return $reduce(this, callbackfn, arguments.length, arguments[1], true);
        } });
    return module.exports;
});
$__System.registerDynamic('aa', ['c', 'ab', '9c'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $indexOf = $__require('ab')(false),
        $native = [].indexOf,
        NEGATIVE_ZERO = !!$native && 1 / [1].indexOf(1, -0) < 0;
    $export($export.P + $export.F * (NEGATIVE_ZERO || !$__require('9c')($native)), 'Array', { indexOf: function indexOf(searchElement) {
            return NEGATIVE_ZERO ? $native.apply(this, arguments) || 0 : $indexOf(this, searchElement, arguments[1]);
        } });
    return module.exports;
});
$__System.registerDynamic('9c', ['f'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var fails = $__require('f');
  module.exports = function (method, arg) {
    return !!method && fails(function () {
      arg ? method.call(null, function () {}, 1) : method.call(null);
    });
  };
  return module.exports;
});
$__System.registerDynamic('ac', ['c', '4', '49', '6f', '9c'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      toIObject = $__require('4'),
      toInteger = $__require('49'),
      toLength = $__require('6f'),
      $native = [].lastIndexOf,
      NEGATIVE_ZERO = !!$native && 1 / [1].lastIndexOf(1, -0) < 0;
  $export($export.P + $export.F * (NEGATIVE_ZERO || !$__require('9c')($native)), 'Array', { lastIndexOf: function lastIndexOf(searchElement) {
      if (NEGATIVE_ZERO) return $native.apply(this, arguments) || 0;
      var O = toIObject(this),
          length = toLength(O.length),
          index = length - 1;
      if (arguments.length > 1) index = Math.min(index, toInteger(arguments[1]));
      if (index < 0) index = length + index;
      for (; index >= 0; index--) if (index in O) if (O[index] === searchElement) return index || 0;
      return -1;
    } });
  return module.exports;
});
$__System.registerDynamic('ad', ['c', 'ae', 'af'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.P, 'Array', { copyWithin: $__require('ae') });
  $__require('af')('copyWithin');
  return module.exports;
});
$__System.registerDynamic('b0', ['c', 'b1', 'af'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.P, 'Array', { fill: $__require('b1') });
  $__require('af')('fill');
  return module.exports;
});
$__System.registerDynamic('b2', ['c', 'a2', 'af'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      $find = $__require('a2')(5),
      KEY = 'find',
      forced = true;
  if (KEY in []) Array(1)[KEY](function () {
    forced = false;
  });
  $export($export.P + $export.F * forced, 'Array', { find: function find(callbackfn) {
      return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    } });
  $__require('af')(KEY);
  return module.exports;
});
$__System.registerDynamic('b3', ['c', 'a2', 'af'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      $find = $__require('a2')(6),
      KEY = 'findIndex',
      forced = true;
  if (KEY in []) Array(1)[KEY](function () {
    forced = false;
  });
  $export($export.P + $export.F * forced, 'Array', { findIndex: function findIndex(callbackfn) {
      return $find(this, callbackfn, arguments.length > 1 ? arguments[1] : undefined);
    } });
  $__require('af')(KEY);
  return module.exports;
});
$__System.registerDynamic('b4', ['b5'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('b5')('Array');
  return module.exports;
});
$__System.registerDynamic('b6', ['9', '46', '1d', '1e', '7a', 'b7', 'b', 'f', '13', 'd', 'b5'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var global = $__require('9'),
      inheritIfRequired = $__require('46'),
      dP = $__require('1d').f,
      gOPN = $__require('1e').f,
      isRegExp = $__require('7a'),
      $flags = $__require('b7'),
      $RegExp = global.RegExp,
      Base = $RegExp,
      proto = $RegExp.prototype,
      re1 = /a/g,
      re2 = /a/g,
      CORRECT_NEW = new $RegExp(re1) !== re1;
  if ($__require('b') && (!CORRECT_NEW || $__require('f')(function () {
    re2[$__require('13')('match')] = false;
    return $RegExp(re1) != re1 || $RegExp(re2) == re2 || $RegExp(re1, 'i') != '/a/i';
  }))) {
    $RegExp = function RegExp(p, f) {
      var tiRE = this instanceof $RegExp,
          piRE = isRegExp(p),
          fiU = f === undefined;
      return !tiRE && piRE && p.constructor === $RegExp && fiU ? p : inheritIfRequired(CORRECT_NEW ? new Base(piRE && !fiU ? p.source : p, f) : Base((piRE = p instanceof $RegExp) ? p.source : p, piRE && fiU ? $flags.call(p) : f), tiRE ? this : proto, $RegExp);
    };
    var proxy = function (key) {
      key in $RegExp || dP($RegExp, key, {
        configurable: true,
        get: function () {
          return Base[key];
        },
        set: function (it) {
          Base[key] = it;
        }
      });
    };
    for (var keys = gOPN(Base), i = 0; keys.length > i;) proxy(keys[i++]);
    proto.constructor = $RegExp;
    $RegExp.prototype = proto;
    $__require('d')(global, 'RegExp', $RegExp);
  }
  $__require('b5')('RegExp');
  return module.exports;
});
$__System.registerDynamic('b8', ['b9', '17', 'b7', 'b', 'd', 'f'], true, function ($__require, exports, module) {
  /* */
  "format cjs";
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('b9');
  var anObject = $__require('17'),
      $flags = $__require('b7'),
      DESCRIPTORS = $__require('b'),
      TO_STRING = 'toString',
      $toString = /./[TO_STRING];
  var define = function (fn) {
    $__require('d')(RegExp.prototype, TO_STRING, fn, true);
  };
  if ($__require('f')(function () {
    return $toString.call({
      source: 'a',
      flags: 'b'
    }) != '/a/b';
  })) {
    define(function toString() {
      var R = anObject(this);
      return '/'.concat(R.source, '/', 'flags' in R ? R.flags : !DESCRIPTORS && R instanceof RegExp ? $flags.call(R) : undefined);
    });
  } else if ($toString.name != TO_STRING) {
    define(function toString() {
      return $toString.call(this);
    });
  }
  return module.exports;
});
$__System.registerDynamic('b9', ['b', '1d', 'b7'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  if ($__require('b') && /./g.flags != 'g') $__require('1d').f(RegExp.prototype, 'flags', {
    configurable: true,
    get: $__require('b7')
  });
  return module.exports;
});
$__System.registerDynamic('ba', ['bb'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('bb')('match', 1, function (defined, MATCH, $match) {
    return [function match(regexp) {
      'use strict';

      var O = defined(this),
          fn = regexp == undefined ? undefined : regexp[MATCH];
      return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[MATCH](String(O));
    }, $match];
  });
  return module.exports;
});
$__System.registerDynamic('bc', ['bb'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('bb')('replace', 2, function (defined, REPLACE, $replace) {
    return [function replace(searchValue, replaceValue) {
      'use strict';

      var O = defined(this),
          fn = searchValue == undefined ? undefined : searchValue[REPLACE];
      return fn !== undefined ? fn.call(searchValue, O, replaceValue) : $replace.call(String(O), searchValue, replaceValue);
    }, $replace];
  });
  return module.exports;
});
$__System.registerDynamic('bd', ['bb'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('bb')('search', 1, function (defined, SEARCH, $search) {
    return [function search(regexp) {
      'use strict';

      var O = defined(this),
          fn = regexp == undefined ? undefined : regexp[SEARCH];
      return fn !== undefined ? fn.call(regexp, O) : new RegExp(regexp)[SEARCH](String(O));
    }, $search];
  });
  return module.exports;
});
$__System.registerDynamic('bb', ['20', 'd', 'f', '7b', '13'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var hide = $__require('20'),
      redefine = $__require('d'),
      fails = $__require('f'),
      defined = $__require('7b'),
      wks = $__require('13');
  module.exports = function (KEY, length, exec) {
    var SYMBOL = wks(KEY),
        fns = exec(defined, SYMBOL, ''[KEY]),
        strfn = fns[0],
        rxfn = fns[1];
    if (fails(function () {
      var O = {};
      O[SYMBOL] = function () {
        return 7;
      };
      return ''[KEY](O) != 7;
    })) {
      redefine(String.prototype, KEY, strfn);
      hide(RegExp.prototype, SYMBOL, length == 2 ? function (string, arg) {
        return rxfn.call(string, this, arg);
      } : function (string) {
        return rxfn.call(string, this);
      });
    }
  };
  return module.exports;
});
$__System.registerDynamic('be', ['bb', '7a'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('bb')('split', 2, function (defined, SPLIT, $split) {
    'use strict';

    var isRegExp = $__require('7a'),
        _split = $split,
        $push = [].push,
        $SPLIT = 'split',
        LENGTH = 'length',
        LAST_INDEX = 'lastIndex';
    if ('abbc'[$SPLIT](/(b)*/)[1] == 'c' || 'test'[$SPLIT](/(?:)/, -1)[LENGTH] != 4 || 'ab'[$SPLIT](/(?:ab)*/)[LENGTH] != 2 || '.'[$SPLIT](/(.?)(.?)/)[LENGTH] != 4 || '.'[$SPLIT](/()()/)[LENGTH] > 1 || ''[$SPLIT](/.?/)[LENGTH]) {
      var NPCG = /()??/.exec('')[1] === undefined;
      $split = function (separator, limit) {
        var string = String(this);
        if (separator === undefined && limit === 0) return [];
        if (!isRegExp(separator)) return _split.call(string, separator, limit);
        var output = [];
        var flags = (separator.ignoreCase ? 'i' : '') + (separator.multiline ? 'm' : '') + (separator.unicode ? 'u' : '') + (separator.sticky ? 'y' : '');
        var lastLastIndex = 0;
        var splitLimit = limit === undefined ? 4294967295 : limit >>> 0;
        var separatorCopy = new RegExp(separator.source, flags + 'g');
        var separator2, match, lastIndex, lastLength, i;
        if (!NPCG) separator2 = new RegExp('^' + separatorCopy.source + '$(?!\\s)', flags);
        while (match = separatorCopy.exec(string)) {
          lastIndex = match.index + match[0][LENGTH];
          if (lastIndex > lastLastIndex) {
            output.push(string.slice(lastLastIndex, match.index));
            if (!NPCG && match[LENGTH] > 1) match[0].replace(separator2, function () {
              for (i = 1; i < arguments[LENGTH] - 2; i++) if (arguments[i] === undefined) match[i] = undefined;
            });
            if (match[LENGTH] > 1 && match.index < string[LENGTH]) $push.apply(output, match.slice(1));
            lastLength = match[0][LENGTH];
            lastLastIndex = lastIndex;
            if (output[LENGTH] >= splitLimit) break;
          }
          if (separatorCopy[LAST_INDEX] === match.index) separatorCopy[LAST_INDEX]++;
        }
        if (lastLastIndex === string[LENGTH]) {
          if (lastLength || !separatorCopy.test('')) output.push('');
        } else output.push(string.slice(lastLastIndex));
        return output[LENGTH] > splitLimit ? output.slice(0, splitLimit) : output;
      };
    } else if ('0'[$SPLIT](undefined, 0)[LENGTH]) {
      $split = function (separator, limit) {
        return separator === undefined && limit === 0 ? [] : _split.call(this, separator, limit);
      };
    }
    return [function split(separator, limit) {
      var O = defined(this),
          fn = separator == undefined ? undefined : separator[SPLIT];
      return fn !== undefined ? fn.call(separator, O, limit) : $split.call(String(O), separator, limit);
    }, $split];
  });
  return module.exports;
});
$__System.registerDynamic('bf', ['1f', '9', '93', '3b', 'c', '2d', 'a0', 'c0', 'c1', 'c2', 'c3', 'c4', '13', 'c5', '11', 'b5', '32', '98', 'c6'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  (function (process) {
    'use strict';

    var LIBRARY = $__require('1f'),
        global = $__require('9'),
        ctx = $__require('93'),
        classof = $__require('3b'),
        $export = $__require('c'),
        isObject = $__require('2d'),
        aFunction = $__require('a0'),
        anInstance = $__require('c0'),
        forOf = $__require('c1'),
        speciesConstructor = $__require('c2'),
        task = $__require('c3').set,
        microtask = $__require('c4')(),
        PROMISE = 'Promise',
        TypeError = global.TypeError,
        process = global.process,
        $Promise = global[PROMISE],
        process = global.process,
        isNode = classof(process) == 'process',
        empty = function () {},
        Internal,
        GenericPromiseCapability,
        Wrapper;
    var USE_NATIVE = !!function () {
      try {
        var promise = $Promise.resolve(1),
            FakePromise = (promise.constructor = {})[$__require('13')('species')] = function (exec) {
          exec(empty, empty);
        };
        return (isNode || typeof PromiseRejectionEvent == 'function') && promise.then(empty) instanceof FakePromise;
      } catch (e) {}
    }();
    var sameConstructor = function (a, b) {
      return a === b || a === $Promise && b === Wrapper;
    };
    var isThenable = function (it) {
      var then;
      return isObject(it) && typeof (then = it.then) == 'function' ? then : false;
    };
    var newPromiseCapability = function (C) {
      return sameConstructor($Promise, C) ? new PromiseCapability(C) : new GenericPromiseCapability(C);
    };
    var PromiseCapability = GenericPromiseCapability = function (C) {
      var resolve, reject;
      this.promise = new C(function ($$resolve, $$reject) {
        if (resolve !== undefined || reject !== undefined) throw TypeError('Bad Promise constructor');
        resolve = $$resolve;
        reject = $$reject;
      });
      this.resolve = aFunction(resolve);
      this.reject = aFunction(reject);
    };
    var perform = function (exec) {
      try {
        exec();
      } catch (e) {
        return { error: e };
      }
    };
    var notify = function (promise, isReject) {
      if (promise._n) return;
      promise._n = true;
      var chain = promise._c;
      microtask(function () {
        var value = promise._v,
            ok = promise._s == 1,
            i = 0;
        var run = function (reaction) {
          var handler = ok ? reaction.ok : reaction.fail,
              resolve = reaction.resolve,
              reject = reaction.reject,
              domain = reaction.domain,
              result,
              then;
          try {
            if (handler) {
              if (!ok) {
                if (promise._h == 2) onHandleUnhandled(promise);
                promise._h = 1;
              }
              if (handler === true) result = value;else {
                if (domain) domain.enter();
                result = handler(value);
                if (domain) domain.exit();
              }
              if (result === reaction.promise) {
                reject(TypeError('Promise-chain cycle'));
              } else if (then = isThenable(result)) {
                then.call(result, resolve, reject);
              } else resolve(result);
            } else reject(value);
          } catch (e) {
            reject(e);
          }
        };
        while (chain.length > i) run(chain[i++]);
        promise._c = [];
        promise._n = false;
        if (isReject && !promise._h) onUnhandled(promise);
      });
    };
    var onUnhandled = function (promise) {
      task.call(global, function () {
        var value = promise._v,
            abrupt,
            handler,
            console;
        if (isUnhandled(promise)) {
          abrupt = perform(function () {
            if (isNode) {
              process.emit('unhandledRejection', value, promise);
            } else if (handler = global.onunhandledrejection) {
              handler({
                promise: promise,
                reason: value
              });
            } else if ((console = global.console) && console.error) {
              console.error('Unhandled promise rejection', value);
            }
          });
          promise._h = isNode || isUnhandled(promise) ? 2 : 1;
        }
        promise._a = undefined;
        if (abrupt) throw abrupt.error;
      });
    };
    var isUnhandled = function (promise) {
      if (promise._h == 1) return false;
      var chain = promise._a || promise._c,
          i = 0,
          reaction;
      while (chain.length > i) {
        reaction = chain[i++];
        if (reaction.fail || !isUnhandled(reaction.promise)) return false;
      }
      return true;
    };
    var onHandleUnhandled = function (promise) {
      task.call(global, function () {
        var handler;
        if (isNode) {
          process.emit('rejectionHandled', promise);
        } else if (handler = global.onrejectionhandled) {
          handler({
            promise: promise,
            reason: promise._v
          });
        }
      });
    };
    var $reject = function (value) {
      var promise = this;
      if (promise._d) return;
      promise._d = true;
      promise = promise._w || promise;
      promise._v = value;
      promise._s = 2;
      if (!promise._a) promise._a = promise._c.slice();
      notify(promise, true);
    };
    var $resolve = function (value) {
      var promise = this,
          then;
      if (promise._d) return;
      promise._d = true;
      promise = promise._w || promise;
      try {
        if (promise === value) throw TypeError("Promise can't be resolved itself");
        if (then = isThenable(value)) {
          microtask(function () {
            var wrapper = {
              _w: promise,
              _d: false
            };
            try {
              then.call(value, ctx($resolve, wrapper, 1), ctx($reject, wrapper, 1));
            } catch (e) {
              $reject.call(wrapper, e);
            }
          });
        } else {
          promise._v = value;
          promise._s = 1;
          notify(promise, false);
        }
      } catch (e) {
        $reject.call({
          _w: promise,
          _d: false
        }, e);
      }
    };
    if (!USE_NATIVE) {
      $Promise = function Promise(executor) {
        anInstance(this, $Promise, PROMISE, '_h');
        aFunction(executor);
        Internal.call(this);
        try {
          executor(ctx($resolve, this, 1), ctx($reject, this, 1));
        } catch (err) {
          $reject.call(this, err);
        }
      };
      Internal = function Promise(executor) {
        this._c = [];
        this._a = undefined;
        this._s = 0;
        this._d = false;
        this._v = undefined;
        this._h = 0;
        this._n = false;
      };
      Internal.prototype = $__require('c5')($Promise.prototype, {
        then: function then(onFulfilled, onRejected) {
          var reaction = newPromiseCapability(speciesConstructor(this, $Promise));
          reaction.ok = typeof onFulfilled == 'function' ? onFulfilled : true;
          reaction.fail = typeof onRejected == 'function' && onRejected;
          reaction.domain = isNode ? process.domain : undefined;
          this._c.push(reaction);
          if (this._a) this._a.push(reaction);
          if (this._s) notify(this, false);
          return reaction.promise;
        },
        'catch': function (onRejected) {
          return this.then(undefined, onRejected);
        }
      });
      PromiseCapability = function () {
        var promise = new Internal();
        this.promise = promise;
        this.resolve = ctx($resolve, promise, 1);
        this.reject = ctx($reject, promise, 1);
      };
    }
    $export($export.G + $export.W + $export.F * !USE_NATIVE, { Promise: $Promise });
    $__require('11')($Promise, PROMISE);
    $__require('b5')(PROMISE);
    Wrapper = $__require('32')[PROMISE];
    $export($export.S + $export.F * !USE_NATIVE, PROMISE, { reject: function reject(r) {
        var capability = newPromiseCapability(this),
            $$reject = capability.reject;
        $$reject(r);
        return capability.promise;
      } });
    $export($export.S + $export.F * (LIBRARY || !USE_NATIVE), PROMISE, { resolve: function resolve(x) {
        if (x instanceof $Promise && sameConstructor(x.constructor, this)) return x;
        var capability = newPromiseCapability(this),
            $$resolve = capability.resolve;
        $$resolve(x);
        return capability.promise;
      } });
    $export($export.S + $export.F * !(USE_NATIVE && $__require('98')(function (iter) {
      $Promise.all(iter)['catch'](empty);
    })), PROMISE, {
      all: function all(iterable) {
        var C = this,
            capability = newPromiseCapability(C),
            resolve = capability.resolve,
            reject = capability.reject;
        var abrupt = perform(function () {
          var values = [],
              index = 0,
              remaining = 1;
          forOf(iterable, false, function (promise) {
            var $index = index++,
                alreadyCalled = false;
            values.push(undefined);
            remaining++;
            C.resolve(promise).then(function (value) {
              if (alreadyCalled) return;
              alreadyCalled = true;
              values[$index] = value;
              --remaining || resolve(values);
            }, reject);
          });
          --remaining || resolve(values);
        });
        if (abrupt) reject(abrupt.error);
        return capability.promise;
      },
      race: function race(iterable) {
        var C = this,
            capability = newPromiseCapability(C),
            reject = capability.reject;
        var abrupt = perform(function () {
          forOf(iterable, false, function (promise) {
            C.resolve(promise).then(capability.resolve, reject);
          });
        });
        if (abrupt) reject(abrupt.error);
        return capability.promise;
      }
    });
  })($__require('c6'));
  return module.exports;
});
$__System.registerDynamic('c7', ['c8', 'c9'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var weak = $__require('c8');
  $__require('c9')('WeakSet', function (get) {
    return function WeakSet() {
      return get(this, arguments.length > 0 ? arguments[0] : undefined);
    };
  }, { add: function add(value) {
      return weak.def(this, value, true);
    } }, weak, false, true);
  return module.exports;
});
$__System.registerDynamic('ca', ['c', 'cb', 'cc', '17', '6d', '6f', '2d', '9', 'c2', 'f', 'b5'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      $typed = $__require('cb'),
      buffer = $__require('cc'),
      anObject = $__require('17'),
      toIndex = $__require('6d'),
      toLength = $__require('6f'),
      isObject = $__require('2d'),
      ArrayBuffer = $__require('9').ArrayBuffer,
      speciesConstructor = $__require('c2'),
      $ArrayBuffer = buffer.ArrayBuffer,
      $DataView = buffer.DataView,
      $isView = $typed.ABV && ArrayBuffer.isView,
      $slice = $ArrayBuffer.prototype.slice,
      VIEW = $typed.VIEW,
      ARRAY_BUFFER = 'ArrayBuffer';
  $export($export.G + $export.W + $export.F * (ArrayBuffer !== $ArrayBuffer), { ArrayBuffer: $ArrayBuffer });
  $export($export.S + $export.F * !$typed.CONSTR, ARRAY_BUFFER, { isView: function isView(it) {
      return $isView && $isView(it) || isObject(it) && VIEW in it;
    } });
  $export($export.P + $export.U + $export.F * $__require('f')(function () {
    return !new $ArrayBuffer(2).slice(1, undefined).byteLength;
  }), ARRAY_BUFFER, { slice: function slice(start, end) {
      if ($slice !== undefined && end === undefined) return $slice.call(anObject(this), start);
      var len = anObject(this).byteLength,
          first = toIndex(start, len),
          final = toIndex(end === undefined ? len : end, len),
          result = new (speciesConstructor(this, $ArrayBuffer))(toLength(final - first)),
          viewS = new $DataView(this),
          viewT = new $DataView(result),
          index = 0;
      while (first < final) {
        viewT.setUint8(index++, viewS.getUint8(first++));
      }
      return result;
    } });
  $__require('b5')(ARRAY_BUFFER);
  return module.exports;
});
$__System.registerDynamic('cd', ['c', 'cb', 'cc'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.G + $export.W + $export.F * !$__require('cb').ABV, { DataView: $__require('cc').DataView });
  return module.exports;
});
$__System.registerDynamic('ce', ['cf'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('cf')('Int8', 1, function (init) {
    return function Int8Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });
  return module.exports;
});
$__System.registerDynamic('d0', ['cf'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('cf')('Uint8', 1, function (init) {
    return function Uint8Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });
  return module.exports;
});
$__System.registerDynamic('d1', ['cf'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('cf')('Uint8', 1, function (init) {
    return function Uint8ClampedArray(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  }, true);
  return module.exports;
});
$__System.registerDynamic('d2', ['cf'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('cf')('Int16', 2, function (init) {
    return function Int16Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });
  return module.exports;
});
$__System.registerDynamic('d3', ['cf'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('cf')('Uint16', 2, function (init) {
    return function Uint16Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });
  return module.exports;
});
$__System.registerDynamic('d4', ['cf'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('cf')('Int32', 4, function (init) {
    return function Int32Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });
  return module.exports;
});
$__System.registerDynamic('d5', ['cf'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('cf')('Uint32', 4, function (init) {
    return function Uint32Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });
  return module.exports;
});
$__System.registerDynamic('d6', ['cf'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('cf')('Float32', 4, function (init) {
    return function Float32Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });
  return module.exports;
});
$__System.registerDynamic('cb', ['9', '20', '12'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var global = $__require('9'),
      hide = $__require('20'),
      uid = $__require('12'),
      TYPED = uid('typed_array'),
      VIEW = uid('view'),
      ABV = !!(global.ArrayBuffer && global.DataView),
      CONSTR = ABV,
      i = 0,
      l = 9,
      Typed;
  var TypedArrayConstructors = 'Int8Array,Uint8Array,Uint8ClampedArray,Int16Array,Uint16Array,Int32Array,Uint32Array,Float32Array,Float64Array'.split(',');
  while (i < l) {
    if (Typed = global[TypedArrayConstructors[i++]]) {
      hide(Typed.prototype, TYPED, true);
      hide(Typed.prototype, VIEW, true);
    } else CONSTR = false;
  }
  module.exports = {
    ABV: ABV,
    CONSTR: CONSTR,
    TYPED: TYPED,
    VIEW: VIEW
  };
  return module.exports;
});
$__System.registerDynamic('cc', ['9', 'b', '1f', 'cb', '20', 'c5', 'f', 'c0', '49', '6f', '1e', '1d', 'b1', '11'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var global = $__require('9'),
      DESCRIPTORS = $__require('b'),
      LIBRARY = $__require('1f'),
      $typed = $__require('cb'),
      hide = $__require('20'),
      redefineAll = $__require('c5'),
      fails = $__require('f'),
      anInstance = $__require('c0'),
      toInteger = $__require('49'),
      toLength = $__require('6f'),
      gOPN = $__require('1e').f,
      dP = $__require('1d').f,
      arrayFill = $__require('b1'),
      setToStringTag = $__require('11'),
      ARRAY_BUFFER = 'ArrayBuffer',
      DATA_VIEW = 'DataView',
      PROTOTYPE = 'prototype',
      WRONG_LENGTH = 'Wrong length!',
      WRONG_INDEX = 'Wrong index!',
      $ArrayBuffer = global[ARRAY_BUFFER],
      $DataView = global[DATA_VIEW],
      Math = global.Math,
      RangeError = global.RangeError,
      Infinity = global.Infinity,
      BaseBuffer = $ArrayBuffer,
      abs = Math.abs,
      pow = Math.pow,
      floor = Math.floor,
      log = Math.log,
      LN2 = Math.LN2,
      BUFFER = 'buffer',
      BYTE_LENGTH = 'byteLength',
      BYTE_OFFSET = 'byteOffset',
      $BUFFER = DESCRIPTORS ? '_b' : BUFFER,
      $LENGTH = DESCRIPTORS ? '_l' : BYTE_LENGTH,
      $OFFSET = DESCRIPTORS ? '_o' : BYTE_OFFSET;
  var packIEEE754 = function (value, mLen, nBytes) {
    var buffer = Array(nBytes),
        eLen = nBytes * 8 - mLen - 1,
        eMax = (1 << eLen) - 1,
        eBias = eMax >> 1,
        rt = mLen === 23 ? pow(2, -24) - pow(2, -77) : 0,
        i = 0,
        s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0,
        e,
        m,
        c;
    value = abs(value);
    if (value != value || value === Infinity) {
      m = value != value ? 1 : 0;
      e = eMax;
    } else {
      e = floor(log(value) / LN2);
      if (value * (c = pow(2, -e)) < 1) {
        e--;
        c *= 2;
      }
      if (e + eBias >= 1) {
        value += rt / c;
      } else {
        value += rt * pow(2, 1 - eBias);
      }
      if (value * c >= 2) {
        e++;
        c /= 2;
      }
      if (e + eBias >= eMax) {
        m = 0;
        e = eMax;
      } else if (e + eBias >= 1) {
        m = (value * c - 1) * pow(2, mLen);
        e = e + eBias;
      } else {
        m = value * pow(2, eBias - 1) * pow(2, mLen);
        e = 0;
      }
    }
    for (; mLen >= 8; buffer[i++] = m & 255, m /= 256, mLen -= 8);
    e = e << mLen | m;
    eLen += mLen;
    for (; eLen > 0; buffer[i++] = e & 255, e /= 256, eLen -= 8);
    buffer[--i] |= s * 128;
    return buffer;
  };
  var unpackIEEE754 = function (buffer, mLen, nBytes) {
    var eLen = nBytes * 8 - mLen - 1,
        eMax = (1 << eLen) - 1,
        eBias = eMax >> 1,
        nBits = eLen - 7,
        i = nBytes - 1,
        s = buffer[i--],
        e = s & 127,
        m;
    s >>= 7;
    for (; nBits > 0; e = e * 256 + buffer[i], i--, nBits -= 8);
    m = e & (1 << -nBits) - 1;
    e >>= -nBits;
    nBits += mLen;
    for (; nBits > 0; m = m * 256 + buffer[i], i--, nBits -= 8);
    if (e === 0) {
      e = 1 - eBias;
    } else if (e === eMax) {
      return m ? NaN : s ? -Infinity : Infinity;
    } else {
      m = m + pow(2, mLen);
      e = e - eBias;
    }
    return (s ? -1 : 1) * m * pow(2, e - mLen);
  };
  var unpackI32 = function (bytes) {
    return bytes[3] << 24 | bytes[2] << 16 | bytes[1] << 8 | bytes[0];
  };
  var packI8 = function (it) {
    return [it & 0xff];
  };
  var packI16 = function (it) {
    return [it & 0xff, it >> 8 & 0xff];
  };
  var packI32 = function (it) {
    return [it & 0xff, it >> 8 & 0xff, it >> 16 & 0xff, it >> 24 & 0xff];
  };
  var packF64 = function (it) {
    return packIEEE754(it, 52, 8);
  };
  var packF32 = function (it) {
    return packIEEE754(it, 23, 4);
  };
  var addGetter = function (C, key, internal) {
    dP(C[PROTOTYPE], key, { get: function () {
        return this[internal];
      } });
  };
  var get = function (view, bytes, index, isLittleEndian) {
    var numIndex = +index,
        intIndex = toInteger(numIndex);
    if (numIndex != intIndex || intIndex < 0 || intIndex + bytes > view[$LENGTH]) throw RangeError(WRONG_INDEX);
    var store = view[$BUFFER]._b,
        start = intIndex + view[$OFFSET],
        pack = store.slice(start, start + bytes);
    return isLittleEndian ? pack : pack.reverse();
  };
  var set = function (view, bytes, index, conversion, value, isLittleEndian) {
    var numIndex = +index,
        intIndex = toInteger(numIndex);
    if (numIndex != intIndex || intIndex < 0 || intIndex + bytes > view[$LENGTH]) throw RangeError(WRONG_INDEX);
    var store = view[$BUFFER]._b,
        start = intIndex + view[$OFFSET],
        pack = conversion(+value);
    for (var i = 0; i < bytes; i++) store[start + i] = pack[isLittleEndian ? i : bytes - i - 1];
  };
  var validateArrayBufferArguments = function (that, length) {
    anInstance(that, $ArrayBuffer, ARRAY_BUFFER);
    var numberLength = +length,
        byteLength = toLength(numberLength);
    if (numberLength != byteLength) throw RangeError(WRONG_LENGTH);
    return byteLength;
  };
  if (!$typed.ABV) {
    $ArrayBuffer = function ArrayBuffer(length) {
      var byteLength = validateArrayBufferArguments(this, length);
      this._b = arrayFill.call(Array(byteLength), 0);
      this[$LENGTH] = byteLength;
    };
    $DataView = function DataView(buffer, byteOffset, byteLength) {
      anInstance(this, $DataView, DATA_VIEW);
      anInstance(buffer, $ArrayBuffer, DATA_VIEW);
      var bufferLength = buffer[$LENGTH],
          offset = toInteger(byteOffset);
      if (offset < 0 || offset > bufferLength) throw RangeError('Wrong offset!');
      byteLength = byteLength === undefined ? bufferLength - offset : toLength(byteLength);
      if (offset + byteLength > bufferLength) throw RangeError(WRONG_LENGTH);
      this[$BUFFER] = buffer;
      this[$OFFSET] = offset;
      this[$LENGTH] = byteLength;
    };
    if (DESCRIPTORS) {
      addGetter($ArrayBuffer, BYTE_LENGTH, '_l');
      addGetter($DataView, BUFFER, '_b');
      addGetter($DataView, BYTE_LENGTH, '_l');
      addGetter($DataView, BYTE_OFFSET, '_o');
    }
    redefineAll($DataView[PROTOTYPE], {
      getInt8: function getInt8(byteOffset) {
        return get(this, 1, byteOffset)[0] << 24 >> 24;
      },
      getUint8: function getUint8(byteOffset) {
        return get(this, 1, byteOffset)[0];
      },
      getInt16: function getInt16(byteOffset) {
        var bytes = get(this, 2, byteOffset, arguments[1]);
        return (bytes[1] << 8 | bytes[0]) << 16 >> 16;
      },
      getUint16: function getUint16(byteOffset) {
        var bytes = get(this, 2, byteOffset, arguments[1]);
        return bytes[1] << 8 | bytes[0];
      },
      getInt32: function getInt32(byteOffset) {
        return unpackI32(get(this, 4, byteOffset, arguments[1]));
      },
      getUint32: function getUint32(byteOffset) {
        return unpackI32(get(this, 4, byteOffset, arguments[1])) >>> 0;
      },
      getFloat32: function getFloat32(byteOffset) {
        return unpackIEEE754(get(this, 4, byteOffset, arguments[1]), 23, 4);
      },
      getFloat64: function getFloat64(byteOffset) {
        return unpackIEEE754(get(this, 8, byteOffset, arguments[1]), 52, 8);
      },
      setInt8: function setInt8(byteOffset, value) {
        set(this, 1, byteOffset, packI8, value);
      },
      setUint8: function setUint8(byteOffset, value) {
        set(this, 1, byteOffset, packI8, value);
      },
      setInt16: function setInt16(byteOffset, value) {
        set(this, 2, byteOffset, packI16, value, arguments[2]);
      },
      setUint16: function setUint16(byteOffset, value) {
        set(this, 2, byteOffset, packI16, value, arguments[2]);
      },
      setInt32: function setInt32(byteOffset, value) {
        set(this, 4, byteOffset, packI32, value, arguments[2]);
      },
      setUint32: function setUint32(byteOffset, value) {
        set(this, 4, byteOffset, packI32, value, arguments[2]);
      },
      setFloat32: function setFloat32(byteOffset, value) {
        set(this, 4, byteOffset, packF32, value, arguments[2]);
      },
      setFloat64: function setFloat64(byteOffset, value) {
        set(this, 8, byteOffset, packF64, value, arguments[2]);
      }
    });
  } else {
    if (!fails(function () {
      new $ArrayBuffer();
    }) || !fails(function () {
      new $ArrayBuffer(.5);
    })) {
      $ArrayBuffer = function ArrayBuffer(length) {
        return new BaseBuffer(validateArrayBufferArguments(this, length));
      };
      var ArrayBufferProto = $ArrayBuffer[PROTOTYPE] = BaseBuffer[PROTOTYPE];
      for (var keys = gOPN(BaseBuffer), j = 0, key; keys.length > j;) {
        if (!((key = keys[j++]) in $ArrayBuffer)) hide($ArrayBuffer, key, BaseBuffer[key]);
      }
      ;
      if (!LIBRARY) ArrayBufferProto.constructor = $ArrayBuffer;
    }
    var view = new $DataView(new $ArrayBuffer(2)),
        $setInt8 = $DataView[PROTOTYPE].setInt8;
    view.setInt8(0, 2147483648);
    view.setInt8(1, 2147483649);
    if (view.getInt8(0) || !view.getInt8(1)) redefineAll($DataView[PROTOTYPE], {
      setInt8: function setInt8(byteOffset, value) {
        $setInt8.call(this, byteOffset, value << 24 >> 24);
      },
      setUint8: function setUint8(byteOffset, value) {
        $setInt8.call(this, byteOffset, value << 24 >> 24);
      }
    }, true);
  }
  setToStringTag($ArrayBuffer, ARRAY_BUFFER);
  setToStringTag($DataView, DATA_VIEW);
  hide($DataView[PROTOTYPE], $typed.VIEW, true);
  exports[ARRAY_BUFFER] = $ArrayBuffer;
  exports[DATA_VIEW] = $DataView;
  return module.exports;
});
$__System.registerDynamic("37", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  // 7.2.9 SameValue(x, y)
  module.exports = Object.is || function is(x, y) {
    return x === y ? x !== 0 || 1 / x === 1 / y : x != x && y != y;
  };
  return module.exports;
});
$__System.registerDynamic('c2', ['17', 'a0', '13'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var anObject = $__require('17'),
        aFunction = $__require('a0'),
        SPECIES = $__require('13')('species');
    module.exports = function (O, D) {
        var C = anObject(O).constructor,
            S;
        return C === undefined || (S = anObject(C)[SPECIES]) == undefined ? D : aFunction(S);
    };
    return module.exports;
});
$__System.registerDynamic('b1', ['28', '6d', '6f'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var toObject = $__require('28'),
        toIndex = $__require('6d'),
        toLength = $__require('6f');
    module.exports = function fill(value) {
        var O = toObject(this),
            length = toLength(O.length),
            aLen = arguments.length,
            index = toIndex(aLen > 1 ? arguments[1] : undefined, length),
            end = aLen > 2 ? arguments[2] : undefined,
            endPos = end === undefined ? length : toIndex(end, length);
        while (endPos > index) O[index++] = value;
        return O;
    };
    return module.exports;
});
$__System.registerDynamic('ae', ['28', '6d', '6f'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var toObject = $__require('28'),
      toIndex = $__require('6d'),
      toLength = $__require('6f');
  module.exports = [].copyWithin || function copyWithin(target, start) {
    var O = toObject(this),
        len = toLength(O.length),
        to = toIndex(target, len),
        from = toIndex(start, len),
        end = arguments.length > 2 ? arguments[2] : undefined,
        count = Math.min((end === undefined ? len : toIndex(end, len)) - from, len - to),
        inc = 1;
    if (from < to && to < from + count) {
      inc = -1;
      from += count - 1;
      to += count - 1;
    }
    while (count-- > 0) {
      if (from in O) O[to] = O[from];else delete O[to];
      to += inc;
      from += inc;
    }
    return O;
  };
  return module.exports;
});
$__System.registerDynamic('cf', ['b', '1f', '9', 'f', 'c', 'cb', 'cc', '93', 'c0', '19', '20', 'c5', '49', '6f', '6d', '18', 'a', '37', '3b', '2d', '28', '95', '1a', '29', '1e', '97', '12', '13', 'a2', 'ab', 'c2', 'd7', 'd8', '98', 'b5', 'b1', 'ae', '1d', '1c'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  if ($__require('b')) {
    var LIBRARY = $__require('1f'),
        global = $__require('9'),
        fails = $__require('f'),
        $export = $__require('c'),
        $typed = $__require('cb'),
        $buffer = $__require('cc'),
        ctx = $__require('93'),
        anInstance = $__require('c0'),
        propertyDesc = $__require('19'),
        hide = $__require('20'),
        redefineAll = $__require('c5'),
        toInteger = $__require('49'),
        toLength = $__require('6f'),
        toIndex = $__require('6d'),
        toPrimitive = $__require('18'),
        has = $__require('a'),
        same = $__require('37'),
        classof = $__require('3b'),
        isObject = $__require('2d'),
        toObject = $__require('28'),
        isArrayIter = $__require('95'),
        create = $__require('1a'),
        getPrototypeOf = $__require('29'),
        gOPN = $__require('1e').f,
        getIterFn = $__require('97'),
        uid = $__require('12'),
        wks = $__require('13'),
        createArrayMethod = $__require('a2'),
        createArrayIncludes = $__require('ab'),
        speciesConstructor = $__require('c2'),
        ArrayIterators = $__require('d7'),
        Iterators = $__require('d8'),
        $iterDetect = $__require('98'),
        setSpecies = $__require('b5'),
        arrayFill = $__require('b1'),
        arrayCopyWithin = $__require('ae'),
        $DP = $__require('1d'),
        $GOPD = $__require('1c'),
        dP = $DP.f,
        gOPD = $GOPD.f,
        RangeError = global.RangeError,
        TypeError = global.TypeError,
        Uint8Array = global.Uint8Array,
        ARRAY_BUFFER = 'ArrayBuffer',
        SHARED_BUFFER = 'Shared' + ARRAY_BUFFER,
        BYTES_PER_ELEMENT = 'BYTES_PER_ELEMENT',
        PROTOTYPE = 'prototype',
        ArrayProto = Array[PROTOTYPE],
        $ArrayBuffer = $buffer.ArrayBuffer,
        $DataView = $buffer.DataView,
        arrayForEach = createArrayMethod(0),
        arrayFilter = createArrayMethod(2),
        arraySome = createArrayMethod(3),
        arrayEvery = createArrayMethod(4),
        arrayFind = createArrayMethod(5),
        arrayFindIndex = createArrayMethod(6),
        arrayIncludes = createArrayIncludes(true),
        arrayIndexOf = createArrayIncludes(false),
        arrayValues = ArrayIterators.values,
        arrayKeys = ArrayIterators.keys,
        arrayEntries = ArrayIterators.entries,
        arrayLastIndexOf = ArrayProto.lastIndexOf,
        arrayReduce = ArrayProto.reduce,
        arrayReduceRight = ArrayProto.reduceRight,
        arrayJoin = ArrayProto.join,
        arraySort = ArrayProto.sort,
        arraySlice = ArrayProto.slice,
        arrayToString = ArrayProto.toString,
        arrayToLocaleString = ArrayProto.toLocaleString,
        ITERATOR = wks('iterator'),
        TAG = wks('toStringTag'),
        TYPED_CONSTRUCTOR = uid('typed_constructor'),
        DEF_CONSTRUCTOR = uid('def_constructor'),
        ALL_CONSTRUCTORS = $typed.CONSTR,
        TYPED_ARRAY = $typed.TYPED,
        VIEW = $typed.VIEW,
        WRONG_LENGTH = 'Wrong length!';
    var $map = createArrayMethod(1, function (O, length) {
      return allocate(speciesConstructor(O, O[DEF_CONSTRUCTOR]), length);
    });
    var LITTLE_ENDIAN = fails(function () {
      return new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
    });
    var FORCED_SET = !!Uint8Array && !!Uint8Array[PROTOTYPE].set && fails(function () {
      new Uint8Array(1).set({});
    });
    var strictToLength = function (it, SAME) {
      if (it === undefined) throw TypeError(WRONG_LENGTH);
      var number = +it,
          length = toLength(it);
      if (SAME && !same(number, length)) throw RangeError(WRONG_LENGTH);
      return length;
    };
    var toOffset = function (it, BYTES) {
      var offset = toInteger(it);
      if (offset < 0 || offset % BYTES) throw RangeError('Wrong offset!');
      return offset;
    };
    var validate = function (it) {
      if (isObject(it) && TYPED_ARRAY in it) return it;
      throw TypeError(it + ' is not a typed array!');
    };
    var allocate = function (C, length) {
      if (!(isObject(C) && TYPED_CONSTRUCTOR in C)) {
        throw TypeError('It is not a typed array constructor!');
      }
      return new C(length);
    };
    var speciesFromList = function (O, list) {
      return fromList(speciesConstructor(O, O[DEF_CONSTRUCTOR]), list);
    };
    var fromList = function (C, list) {
      var index = 0,
          length = list.length,
          result = allocate(C, length);
      while (length > index) result[index] = list[index++];
      return result;
    };
    var addGetter = function (it, key, internal) {
      dP(it, key, { get: function () {
          return this._d[internal];
        } });
    };
    var $from = function from(source) {
      var O = toObject(source),
          aLen = arguments.length,
          mapfn = aLen > 1 ? arguments[1] : undefined,
          mapping = mapfn !== undefined,
          iterFn = getIterFn(O),
          i,
          length,
          values,
          result,
          step,
          iterator;
      if (iterFn != undefined && !isArrayIter(iterFn)) {
        for (iterator = iterFn.call(O), values = [], i = 0; !(step = iterator.next()).done; i++) {
          values.push(step.value);
        }
        O = values;
      }
      if (mapping && aLen > 2) mapfn = ctx(mapfn, arguments[2], 2);
      for (i = 0, length = toLength(O.length), result = allocate(this, length); length > i; i++) {
        result[i] = mapping ? mapfn(O[i], i) : O[i];
      }
      return result;
    };
    var $of = function of() {
      var index = 0,
          length = arguments.length,
          result = allocate(this, length);
      while (length > index) result[index] = arguments[index++];
      return result;
    };
    var TO_LOCALE_BUG = !!Uint8Array && fails(function () {
      arrayToLocaleString.call(new Uint8Array(1));
    });
    var $toLocaleString = function toLocaleString() {
      return arrayToLocaleString.apply(TO_LOCALE_BUG ? arraySlice.call(validate(this)) : validate(this), arguments);
    };
    var proto = {
      copyWithin: function copyWithin(target, start) {
        return arrayCopyWithin.call(validate(this), target, start, arguments.length > 2 ? arguments[2] : undefined);
      },
      every: function every(callbackfn) {
        return arrayEvery(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
      },
      fill: function fill(value) {
        return arrayFill.apply(validate(this), arguments);
      },
      filter: function filter(callbackfn) {
        return speciesFromList(this, arrayFilter(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined));
      },
      find: function find(predicate) {
        return arrayFind(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
      },
      findIndex: function findIndex(predicate) {
        return arrayFindIndex(validate(this), predicate, arguments.length > 1 ? arguments[1] : undefined);
      },
      forEach: function forEach(callbackfn) {
        arrayForEach(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
      },
      indexOf: function indexOf(searchElement) {
        return arrayIndexOf(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
      },
      includes: function includes(searchElement) {
        return arrayIncludes(validate(this), searchElement, arguments.length > 1 ? arguments[1] : undefined);
      },
      join: function join(separator) {
        return arrayJoin.apply(validate(this), arguments);
      },
      lastIndexOf: function lastIndexOf(searchElement) {
        return arrayLastIndexOf.apply(validate(this), arguments);
      },
      map: function map(mapfn) {
        return $map(validate(this), mapfn, arguments.length > 1 ? arguments[1] : undefined);
      },
      reduce: function reduce(callbackfn) {
        return arrayReduce.apply(validate(this), arguments);
      },
      reduceRight: function reduceRight(callbackfn) {
        return arrayReduceRight.apply(validate(this), arguments);
      },
      reverse: function reverse() {
        var that = this,
            length = validate(that).length,
            middle = Math.floor(length / 2),
            index = 0,
            value;
        while (index < middle) {
          value = that[index];
          that[index++] = that[--length];
          that[length] = value;
        }
        return that;
      },
      some: function some(callbackfn) {
        return arraySome(validate(this), callbackfn, arguments.length > 1 ? arguments[1] : undefined);
      },
      sort: function sort(comparefn) {
        return arraySort.call(validate(this), comparefn);
      },
      subarray: function subarray(begin, end) {
        var O = validate(this),
            length = O.length,
            $begin = toIndex(begin, length);
        return new (speciesConstructor(O, O[DEF_CONSTRUCTOR]))(O.buffer, O.byteOffset + $begin * O.BYTES_PER_ELEMENT, toLength((end === undefined ? length : toIndex(end, length)) - $begin));
      }
    };
    var $slice = function slice(start, end) {
      return speciesFromList(this, arraySlice.call(validate(this), start, end));
    };
    var $set = function set(arrayLike) {
      validate(this);
      var offset = toOffset(arguments[1], 1),
          length = this.length,
          src = toObject(arrayLike),
          len = toLength(src.length),
          index = 0;
      if (len + offset > length) throw RangeError(WRONG_LENGTH);
      while (index < len) this[offset + index] = src[index++];
    };
    var $iterators = {
      entries: function entries() {
        return arrayEntries.call(validate(this));
      },
      keys: function keys() {
        return arrayKeys.call(validate(this));
      },
      values: function values() {
        return arrayValues.call(validate(this));
      }
    };
    var isTAIndex = function (target, key) {
      return isObject(target) && target[TYPED_ARRAY] && typeof key != 'symbol' && key in target && String(+key) == String(key);
    };
    var $getDesc = function getOwnPropertyDescriptor(target, key) {
      return isTAIndex(target, key = toPrimitive(key, true)) ? propertyDesc(2, target[key]) : gOPD(target, key);
    };
    var $setDesc = function defineProperty(target, key, desc) {
      if (isTAIndex(target, key = toPrimitive(key, true)) && isObject(desc) && has(desc, 'value') && !has(desc, 'get') && !has(desc, 'set') && !desc.configurable && (!has(desc, 'writable') || desc.writable) && (!has(desc, 'enumerable') || desc.enumerable)) {
        target[key] = desc.value;
        return target;
      } else return dP(target, key, desc);
    };
    if (!ALL_CONSTRUCTORS) {
      $GOPD.f = $getDesc;
      $DP.f = $setDesc;
    }
    $export($export.S + $export.F * !ALL_CONSTRUCTORS, 'Object', {
      getOwnPropertyDescriptor: $getDesc,
      defineProperty: $setDesc
    });
    if (fails(function () {
      arrayToString.call({});
    })) {
      arrayToString = arrayToLocaleString = function toString() {
        return arrayJoin.call(this);
      };
    }
    var $TypedArrayPrototype$ = redefineAll({}, proto);
    redefineAll($TypedArrayPrototype$, $iterators);
    hide($TypedArrayPrototype$, ITERATOR, $iterators.values);
    redefineAll($TypedArrayPrototype$, {
      slice: $slice,
      set: $set,
      constructor: function () {},
      toString: arrayToString,
      toLocaleString: $toLocaleString
    });
    addGetter($TypedArrayPrototype$, 'buffer', 'b');
    addGetter($TypedArrayPrototype$, 'byteOffset', 'o');
    addGetter($TypedArrayPrototype$, 'byteLength', 'l');
    addGetter($TypedArrayPrototype$, 'length', 'e');
    dP($TypedArrayPrototype$, TAG, { get: function () {
        return this[TYPED_ARRAY];
      } });
    module.exports = function (KEY, BYTES, wrapper, CLAMPED) {
      CLAMPED = !!CLAMPED;
      var NAME = KEY + (CLAMPED ? 'Clamped' : '') + 'Array',
          ISNT_UINT8 = NAME != 'Uint8Array',
          GETTER = 'get' + KEY,
          SETTER = 'set' + KEY,
          TypedArray = global[NAME],
          Base = TypedArray || {},
          TAC = TypedArray && getPrototypeOf(TypedArray),
          FORCED = !TypedArray || !$typed.ABV,
          O = {},
          TypedArrayPrototype = TypedArray && TypedArray[PROTOTYPE];
      var getter = function (that, index) {
        var data = that._d;
        return data.v[GETTER](index * BYTES + data.o, LITTLE_ENDIAN);
      };
      var setter = function (that, index, value) {
        var data = that._d;
        if (CLAMPED) value = (value = Math.round(value)) < 0 ? 0 : value > 0xff ? 0xff : value & 0xff;
        data.v[SETTER](index * BYTES + data.o, value, LITTLE_ENDIAN);
      };
      var addElement = function (that, index) {
        dP(that, index, {
          get: function () {
            return getter(this, index);
          },
          set: function (value) {
            return setter(this, index, value);
          },
          enumerable: true
        });
      };
      if (FORCED) {
        TypedArray = wrapper(function (that, data, $offset, $length) {
          anInstance(that, TypedArray, NAME, '_d');
          var index = 0,
              offset = 0,
              buffer,
              byteLength,
              length,
              klass;
          if (!isObject(data)) {
            length = strictToLength(data, true);
            byteLength = length * BYTES;
            buffer = new $ArrayBuffer(byteLength);
          } else if (data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER) {
            buffer = data;
            offset = toOffset($offset, BYTES);
            var $len = data.byteLength;
            if ($length === undefined) {
              if ($len % BYTES) throw RangeError(WRONG_LENGTH);
              byteLength = $len - offset;
              if (byteLength < 0) throw RangeError(WRONG_LENGTH);
            } else {
              byteLength = toLength($length) * BYTES;
              if (byteLength + offset > $len) throw RangeError(WRONG_LENGTH);
            }
            length = byteLength / BYTES;
          } else if (TYPED_ARRAY in data) {
            return fromList(TypedArray, data);
          } else {
            return $from.call(TypedArray, data);
          }
          hide(that, '_d', {
            b: buffer,
            o: offset,
            l: byteLength,
            e: length,
            v: new $DataView(buffer)
          });
          while (index < length) addElement(that, index++);
        });
        TypedArrayPrototype = TypedArray[PROTOTYPE] = create($TypedArrayPrototype$);
        hide(TypedArrayPrototype, 'constructor', TypedArray);
      } else if (!$iterDetect(function (iter) {
        new TypedArray(null);
        new TypedArray(iter);
      }, true)) {
        TypedArray = wrapper(function (that, data, $offset, $length) {
          anInstance(that, TypedArray, NAME);
          var klass;
          if (!isObject(data)) return new Base(strictToLength(data, ISNT_UINT8));
          if (data instanceof $ArrayBuffer || (klass = classof(data)) == ARRAY_BUFFER || klass == SHARED_BUFFER) {
            return $length !== undefined ? new Base(data, toOffset($offset, BYTES), $length) : $offset !== undefined ? new Base(data, toOffset($offset, BYTES)) : new Base(data);
          }
          if (TYPED_ARRAY in data) return fromList(TypedArray, data);
          return $from.call(TypedArray, data);
        });
        arrayForEach(TAC !== Function.prototype ? gOPN(Base).concat(gOPN(TAC)) : gOPN(Base), function (key) {
          if (!(key in TypedArray)) hide(TypedArray, key, Base[key]);
        });
        TypedArray[PROTOTYPE] = TypedArrayPrototype;
        if (!LIBRARY) TypedArrayPrototype.constructor = TypedArray;
      }
      var $nativeIterator = TypedArrayPrototype[ITERATOR],
          CORRECT_ITER_NAME = !!$nativeIterator && ($nativeIterator.name == 'values' || $nativeIterator.name == undefined),
          $iterator = $iterators.values;
      hide(TypedArray, TYPED_CONSTRUCTOR, true);
      hide(TypedArrayPrototype, TYPED_ARRAY, NAME);
      hide(TypedArrayPrototype, VIEW, true);
      hide(TypedArrayPrototype, DEF_CONSTRUCTOR, TypedArray);
      if (CLAMPED ? new TypedArray(1)[TAG] != NAME : !(TAG in TypedArrayPrototype)) {
        dP(TypedArrayPrototype, TAG, { get: function () {
            return NAME;
          } });
      }
      O[NAME] = TypedArray;
      $export($export.G + $export.W + $export.F * (TypedArray != Base), O);
      $export($export.S, NAME, {
        BYTES_PER_ELEMENT: BYTES,
        from: $from,
        of: $of
      });
      if (!(BYTES_PER_ELEMENT in TypedArrayPrototype)) hide(TypedArrayPrototype, BYTES_PER_ELEMENT, BYTES);
      $export($export.P, NAME, proto);
      setSpecies(NAME);
      $export($export.P + $export.F * FORCED_SET, NAME, { set: $set });
      $export($export.P + $export.F * !CORRECT_ITER_NAME, NAME, $iterators);
      $export($export.P + $export.F * (TypedArrayPrototype.toString != arrayToString), NAME, { toString: arrayToString });
      $export($export.P + $export.F * fails(function () {
        new TypedArray(1).slice();
      }), NAME, { slice: $slice });
      $export($export.P + $export.F * (fails(function () {
        return [1, 2].toLocaleString() != new TypedArray([1, 2]).toLocaleString();
      }) || !fails(function () {
        TypedArrayPrototype.toLocaleString.call([1, 2]);
      })), NAME, { toLocaleString: $toLocaleString });
      Iterators[NAME] = CORRECT_ITER_NAME ? $nativeIterator : $iterator;
      if (!LIBRARY && !CORRECT_ITER_NAME) hide(TypedArrayPrototype, ITERATOR, $iterator);
    };
  } else module.exports = function () {};
  return module.exports;
});
$__System.registerDynamic('d9', ['cf'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('cf')('Float64', 8, function (init) {
    return function Float64Array(data, byteOffset, length) {
      return init(this, data, byteOffset, length);
    };
  });
  return module.exports;
});
$__System.registerDynamic('da', ['c', 'a0', '17', '9', 'f'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        aFunction = $__require('a0'),
        anObject = $__require('17'),
        rApply = ($__require('9').Reflect || {}).apply,
        fApply = Function.apply;
    $export($export.S + $export.F * !$__require('f')(function () {
        rApply(function () {});
    }), 'Reflect', { apply: function apply(target, thisArgument, argumentsList) {
            var T = aFunction(target),
                L = anObject(argumentsList);
            return rApply ? rApply(T, thisArgument, L) : fApply.call(T, thisArgument, L);
        } });
    return module.exports;
});
$__System.registerDynamic('3d', ['a0', '2d', 'db'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var aFunction = $__require('a0'),
      isObject = $__require('2d'),
      invoke = $__require('db'),
      arraySlice = [].slice,
      factories = {};
  var construct = function (F, len, args) {
    if (!(len in factories)) {
      for (var n = [], i = 0; i < len; i++) n[i] = 'a[' + i + ']';
      factories[len] = Function('F,a', 'return new F(' + n.join(',') + ')');
    }
    return factories[len](F, args);
  };
  module.exports = Function.bind || function bind(that) {
    var fn = aFunction(this),
        partArgs = arraySlice.call(arguments, 1);
    var bound = function () {
      var args = partArgs.concat(arraySlice.call(arguments));
      return this instanceof bound ? construct(fn, args.length, args) : invoke(fn, args, that);
    };
    if (isObject(fn.prototype)) bound.prototype = fn.prototype;
    return bound;
  };
  return module.exports;
});
$__System.registerDynamic('dc', ['c', '1a', 'a0', '17', '2d', 'f', '3d', '9'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c'),
      create = $__require('1a'),
      aFunction = $__require('a0'),
      anObject = $__require('17'),
      isObject = $__require('2d'),
      fails = $__require('f'),
      bind = $__require('3d'),
      rConstruct = ($__require('9').Reflect || {}).construct;
  var NEW_TARGET_BUG = fails(function () {
    function F() {}
    return !(rConstruct(function () {}, [], F) instanceof F);
  });
  var ARGS_BUG = !fails(function () {
    rConstruct(function () {});
  });
  $export($export.S + $export.F * (NEW_TARGET_BUG || ARGS_BUG), 'Reflect', { construct: function construct(Target, args) {
      aFunction(Target);
      anObject(args);
      var newTarget = arguments.length < 3 ? Target : aFunction(arguments[2]);
      if (ARGS_BUG && !NEW_TARGET_BUG) return rConstruct(Target, args, newTarget);
      if (Target == newTarget) {
        switch (args.length) {
          case 0:
            return new Target();
          case 1:
            return new Target(args[0]);
          case 2:
            return new Target(args[0], args[1]);
          case 3:
            return new Target(args[0], args[1], args[2]);
          case 4:
            return new Target(args[0], args[1], args[2], args[3]);
        }
        var $args = [null];
        $args.push.apply($args, args);
        return new (bind.apply(Target, $args))();
      }
      var proto = newTarget.prototype,
          instance = create(isObject(proto) ? proto : Object.prototype),
          result = Function.apply.call(Target, instance, args);
      return isObject(result) ? result : instance;
    } });
  return module.exports;
});
$__System.registerDynamic('dd', ['1d', 'c', '17', '18', 'f'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var dP = $__require('1d'),
      $export = $__require('c'),
      anObject = $__require('17'),
      toPrimitive = $__require('18');
  $export($export.S + $export.F * $__require('f')(function () {
    Reflect.defineProperty(dP.f({}, 1, { value: 1 }), 1, { value: 2 });
  }), 'Reflect', { defineProperty: function defineProperty(target, propertyKey, attributes) {
      anObject(target);
      propertyKey = toPrimitive(propertyKey, true);
      anObject(attributes);
      try {
        dP.f(target, propertyKey, attributes);
        return true;
      } catch (e) {
        return false;
      }
    } });
  return module.exports;
});
$__System.registerDynamic('de', ['c', '1c', '17'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        gOPD = $__require('1c').f,
        anObject = $__require('17');
    $export($export.S, 'Reflect', { deleteProperty: function deleteProperty(target, propertyKey) {
            var desc = gOPD(anObject(target), propertyKey);
            return desc && !desc.configurable ? false : delete target[propertyKey];
        } });
    return module.exports;
});
$__System.registerDynamic('df', ['c', '17', 'e0'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      anObject = $__require('17');
  var Enumerate = function (iterated) {
    this._t = anObject(iterated);
    this._i = 0;
    var keys = this._k = [],
        key;
    for (key in iterated) keys.push(key);
  };
  $__require('e0')(Enumerate, 'Object', function () {
    var that = this,
        keys = that._k,
        key;
    do {
      if (that._i >= keys.length) return {
        value: undefined,
        done: true
      };
    } while (!((key = keys[that._i++]) in that._t));
    return {
      value: key,
      done: false
    };
  });
  $export($export.S, 'Reflect', { enumerate: function enumerate(target) {
      return new Enumerate(target);
    } });
  return module.exports;
});
$__System.registerDynamic('e1', ['1c', '29', 'a', 'c', '2d', '17'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var gOPD = $__require('1c'),
      getPrototypeOf = $__require('29'),
      has = $__require('a'),
      $export = $__require('c'),
      isObject = $__require('2d'),
      anObject = $__require('17');
  function get(target, propertyKey) {
    var receiver = arguments.length < 3 ? target : arguments[2],
        desc,
        proto;
    if (anObject(target) === receiver) return target[propertyKey];
    if (desc = gOPD.f(target, propertyKey)) return has(desc, 'value') ? desc.value : desc.get !== undefined ? desc.get.call(receiver) : undefined;
    if (isObject(proto = getPrototypeOf(target))) return get(proto, propertyKey, receiver);
  }
  $export($export.S, 'Reflect', { get: get });
  return module.exports;
});
$__System.registerDynamic('e2', ['1c', 'c', '17'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var gOPD = $__require('1c'),
        $export = $__require('c'),
        anObject = $__require('17');
    $export($export.S, 'Reflect', { getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, propertyKey) {
            return gOPD.f(anObject(target), propertyKey);
        } });
    return module.exports;
});
$__System.registerDynamic('e3', ['c', '29', '17'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        getProto = $__require('29'),
        anObject = $__require('17');
    $export($export.S, 'Reflect', { getPrototypeOf: function getPrototypeOf(target) {
            return getProto(anObject(target));
        } });
    return module.exports;
});
$__System.registerDynamic('e4', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Reflect', { has: function has(target, propertyKey) {
            return propertyKey in target;
        } });
    return module.exports;
});
$__System.registerDynamic('e5', ['c', '17'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        anObject = $__require('17'),
        $isExtensible = Object.isExtensible;
    $export($export.S, 'Reflect', { isExtensible: function isExtensible(target) {
            anObject(target);
            return $isExtensible ? $isExtensible(target) : true;
        } });
    return module.exports;
});
$__System.registerDynamic('e6', ['c', 'e7'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'Reflect', { ownKeys: $__require('e7') });
  return module.exports;
});
$__System.registerDynamic('e8', ['c', '17'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c'),
      anObject = $__require('17'),
      $preventExtensions = Object.preventExtensions;
  $export($export.S, 'Reflect', { preventExtensions: function preventExtensions(target) {
      anObject(target);
      try {
        if ($preventExtensions) $preventExtensions(target);
        return true;
      } catch (e) {
        return false;
      }
    } });
  return module.exports;
});
$__System.registerDynamic('e9', ['1d', '1c', '29', 'a', 'c', '19', '17', '2d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var dP = $__require('1d'),
      gOPD = $__require('1c'),
      getPrototypeOf = $__require('29'),
      has = $__require('a'),
      $export = $__require('c'),
      createDesc = $__require('19'),
      anObject = $__require('17'),
      isObject = $__require('2d');
  function set(target, propertyKey, V) {
    var receiver = arguments.length < 4 ? target : arguments[3],
        ownDesc = gOPD.f(anObject(target), propertyKey),
        existingDescriptor,
        proto;
    if (!ownDesc) {
      if (isObject(proto = getPrototypeOf(target))) {
        return set(proto, propertyKey, V, receiver);
      }
      ownDesc = createDesc(0);
    }
    if (has(ownDesc, 'value')) {
      if (ownDesc.writable === false || !isObject(receiver)) return false;
      existingDescriptor = gOPD.f(receiver, propertyKey) || createDesc(0);
      existingDescriptor.value = V;
      dP.f(receiver, propertyKey, existingDescriptor);
      return true;
    }
    return ownDesc.set === undefined ? false : (ownDesc.set.call(receiver, V), true);
  }
  $export($export.S, 'Reflect', { set: set });
  return module.exports;
});
$__System.registerDynamic('ea', ['c', '39'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c'),
      setProto = $__require('39');
  if (setProto) $export($export.S, 'Reflect', { setPrototypeOf: function setPrototypeOf(target, proto) {
      setProto.check(target, proto);
      try {
        setProto.set(target, proto);
        return true;
      } catch (e) {
        return false;
      }
    } });
  return module.exports;
});
$__System.registerDynamic('eb', ['c', 'ab', 'af'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $includes = $__require('ab')(true);
    $export($export.P, 'Array', { includes: function includes(el) {
            return $includes(this, el, arguments.length > 1 ? arguments[1] : undefined);
        } });
    $__require('af')('includes');
    return module.exports;
});
$__System.registerDynamic('72', ['49', '7b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var toInteger = $__require('49'),
      defined = $__require('7b');
  module.exports = function (TO_STRING) {
    return function (that, pos) {
      var s = String(defined(that)),
          i = toInteger(pos),
          l = s.length,
          a,
          b;
      if (i < 0 || i >= l) return TO_STRING ? '' : undefined;
      a = s.charCodeAt(i);
      return a < 0xd800 || a > 0xdbff || i + 1 === l || (b = s.charCodeAt(i + 1)) < 0xdc00 || b > 0xdfff ? TO_STRING ? s.charAt(i) : a : TO_STRING ? s.slice(i, i + 2) : (a - 0xd800 << 10) + (b - 0xdc00) + 0x10000;
    };
  };
  return module.exports;
});
$__System.registerDynamic('ec', ['c', '72'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $at = $__require('72')(true);
    $export($export.P, 'String', { at: function at(pos) {
            return $at(this, pos);
        } });
    return module.exports;
});
$__System.registerDynamic('ed', ['c', 'ee'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $pad = $__require('ee');
    $export($export.P, 'String', { padStart: function padStart(maxLength) {
            return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, true);
        } });
    return module.exports;
});
$__System.registerDynamic('4b', ['49', '7b'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var toInteger = $__require('49'),
      defined = $__require('7b');
  module.exports = function repeat(count) {
    var str = String(defined(this)),
        res = '',
        n = toInteger(count);
    if (n < 0 || n == Infinity) throw RangeError("Count can't be negative");
    for (; n > 0; (n >>>= 1) && (str += str)) if (n & 1) res += str;
    return res;
  };
  return module.exports;
});
$__System.registerDynamic('ee', ['6f', '4b', '7b'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var toLength = $__require('6f'),
        repeat = $__require('4b'),
        defined = $__require('7b');
    module.exports = function (that, maxLength, fillString, left) {
        var S = String(defined(that)),
            stringLength = S.length,
            fillStr = fillString === undefined ? ' ' : String(fillString),
            intMaxLength = toLength(maxLength);
        if (intMaxLength <= stringLength || fillStr == '') return S;
        var fillLen = intMaxLength - stringLength,
            stringFiller = repeat.call(fillStr, Math.ceil(fillLen / fillStr.length));
        if (stringFiller.length > fillLen) stringFiller = stringFiller.slice(0, fillLen);
        return left ? stringFiller + S : S + stringFiller;
    };
    return module.exports;
});
$__System.registerDynamic('ef', ['c', 'ee'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        $pad = $__require('ee');
    $export($export.P, 'String', { padEnd: function padEnd(maxLength) {
            return $pad(this, maxLength, arguments.length > 1 ? arguments[1] : undefined, false);
        } });
    return module.exports;
});
$__System.registerDynamic('f0', ['47'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('47')('trimLeft', function ($trim) {
    return function trimLeft() {
      return $trim(this, 1);
    };
  }, 'trimStart');
  return module.exports;
});
$__System.registerDynamic('55', [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = '\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003' + '\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF';
  return module.exports;
});
$__System.registerDynamic('47', ['c', '7b', 'f', '55'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c'),
      defined = $__require('7b'),
      fails = $__require('f'),
      spaces = $__require('55'),
      space = '[' + spaces + ']',
      non = '\u200b\u0085',
      ltrim = RegExp('^' + space + space + '*'),
      rtrim = RegExp(space + space + '*$');
  var exporter = function (KEY, exec, ALIAS) {
    var exp = {};
    var FORCE = fails(function () {
      return !!spaces[KEY]() || non[KEY]() != non;
    });
    var fn = exp[KEY] = FORCE ? exec(trim) : spaces[KEY];
    if (ALIAS) exp[ALIAS] = fn;
    $export($export.P + $export.F * FORCE, 'String', exp);
  };
  var trim = exporter.trim = function (string, TYPE) {
    string = String(defined(string));
    if (TYPE & 1) string = string.replace(ltrim, '');
    if (TYPE & 2) string = string.replace(rtrim, '');
    return string;
  };
  module.exports = exporter;
  return module.exports;
});
$__System.registerDynamic('f1', ['47'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  $__require('47')('trimRight', function ($trim) {
    return function trimRight() {
      return $trim(this, 2);
    };
  }, 'trimEnd');
  return module.exports;
});
$__System.registerDynamic('7a', ['2d', '45', '13'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d'),
      cof = $__require('45'),
      MATCH = $__require('13')('match');
  module.exports = function (it) {
    var isRegExp;
    return isObject(it) && ((isRegExp = it[MATCH]) !== undefined ? !!isRegExp : cof(it) == 'RegExp');
  };
  return module.exports;
});
$__System.registerDynamic('b7', ['17'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var anObject = $__require('17');
  module.exports = function () {
    var that = anObject(this),
        result = '';
    if (that.global) result += 'g';
    if (that.ignoreCase) result += 'i';
    if (that.multiline) result += 'm';
    if (that.unicode) result += 'u';
    if (that.sticky) result += 'y';
    return result;
  };
  return module.exports;
});
$__System.registerDynamic('f2', ['c', '7b', '6f', '7a', 'b7', 'e0'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      defined = $__require('7b'),
      toLength = $__require('6f'),
      isRegExp = $__require('7a'),
      getFlags = $__require('b7'),
      RegExpProto = RegExp.prototype;
  var $RegExpStringIterator = function (regexp, string) {
    this._r = regexp;
    this._s = string;
  };
  $__require('e0')($RegExpStringIterator, 'RegExp String', function next() {
    var match = this._r.exec(this._s);
    return {
      value: match,
      done: match === null
    };
  });
  $export($export.P, 'String', { matchAll: function matchAll(regexp) {
      defined(this);
      if (!isRegExp(regexp)) throw TypeError(regexp + ' is not a regexp!');
      var S = String(this),
          flags = 'flags' in RegExpProto ? String(regexp.flags) : getFlags.call(regexp),
          rx = new RegExp(regexp.source, ~flags.indexOf('g') ? flags : 'g' + flags);
      rx.lastIndex = toLength(regexp.lastIndex);
      return new $RegExpStringIterator(rx, S);
    } });
  return module.exports;
});
$__System.registerDynamic('f3', ['15'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('15')('asyncIterator');
  return module.exports;
});
$__System.registerDynamic('14', ['13'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  exports.f = $__require('13');
  return module.exports;
});
$__System.registerDynamic('15', ['9', '32', '1f', '14', '1d'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var global = $__require('9'),
        core = $__require('32'),
        LIBRARY = $__require('1f'),
        wksExt = $__require('14'),
        defineProperty = $__require('1d').f;
    module.exports = function (name) {
        var $Symbol = core.Symbol || (core.Symbol = LIBRARY ? {} : global.Symbol || {});
        if (name.charAt(0) != '_' && !(name in $Symbol)) defineProperty($Symbol, name, { value: wksExt.f(name) });
    };
    return module.exports;
});
$__System.registerDynamic('f4', ['15'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('15')('observable');
  return module.exports;
});
$__System.registerDynamic('1e', ['f5', 'f6'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $keys = $__require('f5'),
      hiddenKeys = $__require('f6').concat('length', 'prototype');
  exports.f = Object.getOwnPropertyNames || function getOwnPropertyNames(O) {
    return $keys(O, hiddenKeys);
  };
  return module.exports;
});
$__System.registerDynamic('e7', ['1e', '6', '17', '9'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var gOPN = $__require('1e'),
        gOPS = $__require('6'),
        anObject = $__require('17'),
        Reflect = $__require('9').Reflect;
    module.exports = Reflect && Reflect.ownKeys || function ownKeys(it) {
        var keys = gOPN.f(anObject(it)),
            getSymbols = gOPS.f;
        return getSymbols ? keys.concat(getSymbols(it)) : keys;
    };
    return module.exports;
});
$__System.registerDynamic('96', ['1d', '19'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $defineProperty = $__require('1d'),
      createDesc = $__require('19');
  module.exports = function (object, index, value) {
    if (index in object) $defineProperty.f(object, index, createDesc(0, value));else object[index] = value;
  };
  return module.exports;
});
$__System.registerDynamic('f7', ['c', 'e7', '4', '1c', '96'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        ownKeys = $__require('e7'),
        toIObject = $__require('4'),
        gOPD = $__require('1c'),
        createProperty = $__require('96');
    $export($export.S, 'Object', { getOwnPropertyDescriptors: function getOwnPropertyDescriptors(object) {
            var O = toIObject(object),
                getDesc = gOPD.f,
                keys = ownKeys(O),
                result = {},
                i = 0,
                key;
            while (keys.length > i) createProperty(result, key = keys[i++], getDesc(O, key));
            return result;
        } });
    return module.exports;
});
$__System.registerDynamic('f8', ['c', 'f9'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $values = $__require('f9')(false);
    $export($export.S, 'Object', { values: function values(it) {
            return $values(it);
        } });
    return module.exports;
});
$__System.registerDynamic('f9', ['3', '4', '7'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var getKeys = $__require('3'),
      toIObject = $__require('4'),
      isEnum = $__require('7').f;
  module.exports = function (isEntries) {
    return function (it) {
      var O = toIObject(it),
          keys = getKeys(O),
          length = keys.length,
          i = 0,
          result = [],
          key;
      while (length > i) if (isEnum.call(O, key = keys[i++])) {
        result.push(isEntries ? [key, O[key]] : O[key]);
      }
      return result;
    };
  };
  return module.exports;
});
$__System.registerDynamic('fa', ['c', 'f9'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $entries = $__require('f9')(true);
    $export($export.S, 'Object', { entries: function entries(it) {
            return $entries(it);
        } });
    return module.exports;
});
$__System.registerDynamic('fb', ['c', '28', 'a0', '1d', 'b', 'fc'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      toObject = $__require('28'),
      aFunction = $__require('a0'),
      $defineProperty = $__require('1d');
  $__require('b') && $export($export.P + $__require('fc'), 'Object', { __defineGetter__: function __defineGetter__(P, getter) {
      $defineProperty.f(toObject(this), P, {
        get: aFunction(getter),
        enumerable: true,
        configurable: true
      });
    } });
  return module.exports;
});
$__System.registerDynamic('fd', ['c', '28', 'a0', '1d', 'b', 'fc'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      toObject = $__require('28'),
      aFunction = $__require('a0'),
      $defineProperty = $__require('1d');
  $__require('b') && $export($export.P + $__require('fc'), 'Object', { __defineSetter__: function __defineSetter__(P, setter) {
      $defineProperty.f(toObject(this), P, {
        set: aFunction(setter),
        enumerable: true,
        configurable: true
      });
    } });
  return module.exports;
});
$__System.registerDynamic('fe', ['c', '28', '18', '29', '1c', 'b', 'fc'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        toObject = $__require('28'),
        toPrimitive = $__require('18'),
        getPrototypeOf = $__require('29'),
        getOwnPropertyDescriptor = $__require('1c').f;
    $__require('b') && $export($export.P + $__require('fc'), 'Object', { __lookupGetter__: function __lookupGetter__(P) {
            var O = toObject(this),
                K = toPrimitive(P, true),
                D;
            do {
                if (D = getOwnPropertyDescriptor(O, K)) return D.get;
            } while (O = getPrototypeOf(O));
        } });
    return module.exports;
});
$__System.registerDynamic('fc', ['1f', 'f', '9'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = $__require('1f') || !$__require('f')(function () {
    var K = Math.random();
    __defineSetter__.call(null, K, function () {});
    delete $__require('9')[K];
  });
  return module.exports;
});
$__System.registerDynamic('ff', ['c', '28', '18', '29', '1c', 'b', 'fc'], true, function ($__require, exports, module) {
    /* */
    'use strict';

    var define,
        global = this || self,
        GLOBAL = global;
    var $export = $__require('c'),
        toObject = $__require('28'),
        toPrimitive = $__require('18'),
        getPrototypeOf = $__require('29'),
        getOwnPropertyDescriptor = $__require('1c').f;
    $__require('b') && $export($export.P + $__require('fc'), 'Object', { __lookupSetter__: function __lookupSetter__(P) {
            var O = toObject(this),
                K = toPrimitive(P, true),
                D;
            do {
                if (D = getOwnPropertyDescriptor(O, K)) return D.set;
            } while (O = getPrototypeOf(O));
        } });
    return module.exports;
});
$__System.registerDynamic('100', ['c', '101'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.P + $export.R, 'Map', { toJSON: $__require('101')('Map') });
  return module.exports;
});
$__System.registerDynamic('101', ['3b', '102'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var classof = $__require('3b'),
      from = $__require('102');
  module.exports = function (NAME) {
    return function toJSON() {
      if (classof(this) != NAME) throw TypeError(NAME + "#toJSON isn't generic");
      return from(this);
    };
  };
  return module.exports;
});
$__System.registerDynamic('103', ['c', '101'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.P + $export.R, 'Set', { toJSON: $__require('101')('Set') });
  return module.exports;
});
$__System.registerDynamic('104', ['c', '9'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c');
  $export($export.S, 'System', { global: $__require('9') });
  return module.exports;
});
$__System.registerDynamic('105', ['c', '45'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        cof = $__require('45');
    $export($export.S, 'Error', { isError: function isError(it) {
            return cof(it) === 'Error';
        } });
    return module.exports;
});
$__System.registerDynamic('106', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Math', { iaddh: function iaddh(x0, x1, y0, y1) {
            var $x0 = x0 >>> 0,
                $x1 = x1 >>> 0,
                $y0 = y0 >>> 0;
            return $x1 + (y1 >>> 0) + (($x0 & $y0 | ($x0 | $y0) & ~($x0 + $y0 >>> 0)) >>> 31) | 0;
        } });
    return module.exports;
});
$__System.registerDynamic('107', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Math', { isubh: function isubh(x0, x1, y0, y1) {
            var $x0 = x0 >>> 0,
                $x1 = x1 >>> 0,
                $y0 = y0 >>> 0;
            return $x1 - (y1 >>> 0) - ((~$x0 & $y0 | ~($x0 ^ $y0) & $x0 - $y0 >>> 0) >>> 31) | 0;
        } });
    return module.exports;
});
$__System.registerDynamic('108', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Math', { imulh: function imulh(u, v) {
            var UINT16 = 0xffff,
                $u = +u,
                $v = +v,
                u0 = $u & UINT16,
                v0 = $v & UINT16,
                u1 = $u >> 16,
                v1 = $v >> 16,
                t = (u1 * v0 >>> 0) + (u0 * v0 >>> 16);
            return u1 * v1 + (t >> 16) + ((u0 * v1 >>> 0) + (t & UINT16) >> 16);
        } });
    return module.exports;
});
$__System.registerDynamic('109', ['c'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c');
    $export($export.S, 'Math', { umulh: function umulh(u, v) {
            var UINT16 = 0xffff,
                $u = +u,
                $v = +v,
                u0 = $u & UINT16,
                v0 = $v & UINT16,
                u1 = $u >>> 16,
                v1 = $v >>> 16,
                t = (u1 * v0 >>> 0) + (u0 * v0 >>> 16);
            return u1 * v1 + (t >>> 16) + ((u0 * v1 >>> 0) + (t & UINT16) >>> 16);
        } });
    return module.exports;
});
$__System.registerDynamic('10a', ['10b', '17'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var metadata = $__require('10b'),
        anObject = $__require('17'),
        toMetaKey = metadata.key,
        ordinaryDefineOwnMetadata = metadata.set;
    metadata.exp({ defineMetadata: function defineMetadata(metadataKey, metadataValue, target, targetKey) {
            ordinaryDefineOwnMetadata(metadataKey, metadataValue, anObject(target), toMetaKey(targetKey));
        } });
    return module.exports;
});
$__System.registerDynamic('10c', ['10b', '17'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var metadata = $__require('10b'),
        anObject = $__require('17'),
        toMetaKey = metadata.key,
        getOrCreateMetadataMap = metadata.map,
        store = metadata.store;
    metadata.exp({ deleteMetadata: function deleteMetadata(metadataKey, target) {
            var targetKey = arguments.length < 3 ? undefined : toMetaKey(arguments[2]),
                metadataMap = getOrCreateMetadataMap(anObject(target), targetKey, false);
            if (metadataMap === undefined || !metadataMap['delete'](metadataKey)) return false;
            if (metadataMap.size) return true;
            var targetMetadata = store.get(target);
            targetMetadata['delete'](targetKey);
            return !!targetMetadata.size || store['delete'](target);
        } });
    return module.exports;
});
$__System.registerDynamic('10d', ['10b', '17', '29'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var metadata = $__require('10b'),
      anObject = $__require('17'),
      getPrototypeOf = $__require('29'),
      ordinaryHasOwnMetadata = metadata.has,
      ordinaryGetOwnMetadata = metadata.get,
      toMetaKey = metadata.key;
  var ordinaryGetMetadata = function (MetadataKey, O, P) {
    var hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
    if (hasOwn) return ordinaryGetOwnMetadata(MetadataKey, O, P);
    var parent = getPrototypeOf(O);
    return parent !== null ? ordinaryGetMetadata(MetadataKey, parent, P) : undefined;
  };
  metadata.exp({ getMetadata: function getMetadata(metadataKey, target) {
      return ordinaryGetMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
    } });
  return module.exports;
});
$__System.registerDynamic('10e', ['10f', 'c9'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var strong = $__require('10f');
  module.exports = $__require('c9')('Set', function (get) {
    return function Set() {
      return get(this, arguments.length > 0 ? arguments[0] : undefined);
    };
  }, { add: function add(value) {
      return strong.def(this, value = value === 0 ? 0 : value, value);
    } }, strong);
  return module.exports;
});
$__System.registerDynamic('102', ['c1'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var forOf = $__require('c1');
  module.exports = function (iter, ITERATOR) {
    var result = [];
    forOf(iter, false, result.push, result, ITERATOR);
    return result;
  };
  return module.exports;
});
$__System.registerDynamic('110', ['10e', '102', '10b', '17', '29'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var Set = $__require('10e'),
        from = $__require('102'),
        metadata = $__require('10b'),
        anObject = $__require('17'),
        getPrototypeOf = $__require('29'),
        ordinaryOwnMetadataKeys = metadata.keys,
        toMetaKey = metadata.key;
    var ordinaryMetadataKeys = function (O, P) {
        var oKeys = ordinaryOwnMetadataKeys(O, P),
            parent = getPrototypeOf(O);
        if (parent === null) return oKeys;
        var pKeys = ordinaryMetadataKeys(parent, P);
        return pKeys.length ? oKeys.length ? from(new Set(oKeys.concat(pKeys))) : pKeys : oKeys;
    };
    metadata.exp({ getMetadataKeys: function getMetadataKeys(target) {
            return ordinaryMetadataKeys(anObject(target), arguments.length < 2 ? undefined : toMetaKey(arguments[1]));
        } });
    return module.exports;
});
$__System.registerDynamic('111', ['10b', '17'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var metadata = $__require('10b'),
        anObject = $__require('17'),
        ordinaryGetOwnMetadata = metadata.get,
        toMetaKey = metadata.key;
    metadata.exp({ getOwnMetadata: function getOwnMetadata(metadataKey, target) {
            return ordinaryGetOwnMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
        } });
    return module.exports;
});
$__System.registerDynamic('112', ['10b', '17'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var metadata = $__require('10b'),
        anObject = $__require('17'),
        ordinaryOwnMetadataKeys = metadata.keys,
        toMetaKey = metadata.key;
    metadata.exp({ getOwnMetadataKeys: function getOwnMetadataKeys(target) {
            return ordinaryOwnMetadataKeys(anObject(target), arguments.length < 2 ? undefined : toMetaKey(arguments[1]));
        } });
    return module.exports;
});
$__System.registerDynamic('113', ['10b', '17', '29'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var metadata = $__require('10b'),
      anObject = $__require('17'),
      getPrototypeOf = $__require('29'),
      ordinaryHasOwnMetadata = metadata.has,
      toMetaKey = metadata.key;
  var ordinaryHasMetadata = function (MetadataKey, O, P) {
    var hasOwn = ordinaryHasOwnMetadata(MetadataKey, O, P);
    if (hasOwn) return true;
    var parent = getPrototypeOf(O);
    return parent !== null ? ordinaryHasMetadata(MetadataKey, parent, P) : false;
  };
  metadata.exp({ hasMetadata: function hasMetadata(metadataKey, target) {
      return ordinaryHasMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
    } });
  return module.exports;
});
$__System.registerDynamic('114', ['10b', '17'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var metadata = $__require('10b'),
        anObject = $__require('17'),
        ordinaryHasOwnMetadata = metadata.has,
        toMetaKey = metadata.key;
    metadata.exp({ hasOwnMetadata: function hasOwnMetadata(metadataKey, target) {
            return ordinaryHasOwnMetadata(metadataKey, anObject(target), arguments.length < 3 ? undefined : toMetaKey(arguments[2]));
        } });
    return module.exports;
});
$__System.registerDynamic('10f', ['1d', '1a', 'c5', '93', 'c0', '7b', 'c1', '73', '115', 'b5', 'b', 'e'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var dP = $__require('1d').f,
      create = $__require('1a'),
      redefineAll = $__require('c5'),
      ctx = $__require('93'),
      anInstance = $__require('c0'),
      defined = $__require('7b'),
      forOf = $__require('c1'),
      $iterDefine = $__require('73'),
      step = $__require('115'),
      setSpecies = $__require('b5'),
      DESCRIPTORS = $__require('b'),
      fastKey = $__require('e').fastKey,
      SIZE = DESCRIPTORS ? '_s' : 'size';
  var getEntry = function (that, key) {
    var index = fastKey(key),
        entry;
    if (index !== 'F') return that._i[index];
    for (entry = that._f; entry; entry = entry.n) {
      if (entry.k == key) return entry;
    }
  };
  module.exports = {
    getConstructor: function (wrapper, NAME, IS_MAP, ADDER) {
      var C = wrapper(function (that, iterable) {
        anInstance(that, C, NAME, '_i');
        that._i = create(null);
        that._f = undefined;
        that._l = undefined;
        that[SIZE] = 0;
        if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
      });
      redefineAll(C.prototype, {
        clear: function clear() {
          for (var that = this, data = that._i, entry = that._f; entry; entry = entry.n) {
            entry.r = true;
            if (entry.p) entry.p = entry.p.n = undefined;
            delete data[entry.i];
          }
          that._f = that._l = undefined;
          that[SIZE] = 0;
        },
        'delete': function (key) {
          var that = this,
              entry = getEntry(that, key);
          if (entry) {
            var next = entry.n,
                prev = entry.p;
            delete that._i[entry.i];
            entry.r = true;
            if (prev) prev.n = next;
            if (next) next.p = prev;
            if (that._f == entry) that._f = next;
            if (that._l == entry) that._l = prev;
            that[SIZE]--;
          }
          return !!entry;
        },
        forEach: function forEach(callbackfn) {
          anInstance(this, C, 'forEach');
          var f = ctx(callbackfn, arguments.length > 1 ? arguments[1] : undefined, 3),
              entry;
          while (entry = entry ? entry.n : this._f) {
            f(entry.v, entry.k, this);
            while (entry && entry.r) entry = entry.p;
          }
        },
        has: function has(key) {
          return !!getEntry(this, key);
        }
      });
      if (DESCRIPTORS) dP(C.prototype, 'size', { get: function () {
          return defined(this[SIZE]);
        } });
      return C;
    },
    def: function (that, key, value) {
      var entry = getEntry(that, key),
          prev,
          index;
      if (entry) {
        entry.v = value;
      } else {
        that._l = entry = {
          i: index = fastKey(key, true),
          k: key,
          v: value,
          p: prev = that._l,
          n: undefined,
          r: false
        };
        if (!that._f) that._f = entry;
        if (prev) prev.n = entry;
        that[SIZE]++;
        if (index !== 'F') that._i[index] = entry;
      }
      return that;
    },
    getEntry: getEntry,
    setStrong: function (C, NAME, IS_MAP) {
      $iterDefine(C, NAME, function (iterated, kind) {
        this._t = iterated;
        this._k = kind;
        this._l = undefined;
      }, function () {
        var that = this,
            kind = that._k,
            entry = that._l;
        while (entry && entry.r) entry = entry.p;
        if (!that._t || !(that._l = entry = entry ? entry.n : that._t._f)) {
          that._t = undefined;
          return step(1);
        }
        if (kind == 'keys') return step(0, entry.k);
        if (kind == 'values') return step(0, entry.v);
        return step(0, [entry.k, entry.v]);
      }, IS_MAP ? 'entries' : 'values', !IS_MAP, true);
      setSpecies(NAME);
    }
  };
  return module.exports;
});
$__System.registerDynamic('116', ['10f', 'c9'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var strong = $__require('10f');
  module.exports = $__require('c9')('Map', function (get) {
    return function Map() {
      return get(this, arguments.length > 0 ? arguments[0] : undefined);
    };
  }, {
    get: function get(key) {
      var entry = strong.getEntry(this, key);
      return entry && entry.v;
    },
    set: function set(key, value) {
      return strong.def(this, key === 0 ? 0 : key, value);
    }
  }, strong, true);
  return module.exports;
});
$__System.registerDynamic("6", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  exports.f = Object.getOwnPropertySymbols;
  return module.exports;
});
$__System.registerDynamic('35', ['3', '6', '7', '28', '9b', 'f'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var getKeys = $__require('3'),
      gOPS = $__require('6'),
      pIE = $__require('7'),
      toObject = $__require('28'),
      IObject = $__require('9b'),
      $assign = Object.assign;
  module.exports = !$assign || $__require('f')(function () {
    var A = {},
        B = {},
        S = Symbol(),
        K = 'abcdefghijklmnopqrst';
    A[S] = 7;
    K.split('').forEach(function (k) {
      B[k] = k;
    });
    return $assign({}, A)[S] != 7 || Object.keys($assign({}, B)).join('') != K;
  }) ? function assign(target, source) {
    var T = toObject(target),
        aLen = arguments.length,
        index = 1,
        getSymbols = gOPS.f,
        isEnum = pIE.f;
    while (aLen > index) {
      var S = IObject(arguments[index++]),
          keys = getSymbols ? getKeys(S).concat(getSymbols(S)) : getKeys(S),
          length = keys.length,
          j = 0,
          key;
      while (length > j) if (isEnum.call(S, key = keys[j++])) T[key] = S[key];
    }
    return T;
  } : $assign;
  return module.exports;
});
$__System.registerDynamic('16', ['45'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var cof = $__require('45');
  module.exports = Array.isArray || function isArray(arg) {
    return cof(arg) == 'Array';
  };
  return module.exports;
});
$__System.registerDynamic('117', ['2d', '16', '13'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d'),
      isArray = $__require('16'),
      SPECIES = $__require('13')('species');
  module.exports = function (original) {
    var C;
    if (isArray(original)) {
      C = original.constructor;
      if (typeof C == 'function' && (C === Array || isArray(C.prototype))) C = undefined;
      if (isObject(C)) {
        C = C[SPECIES];
        if (C === null) C = undefined;
      }
    }
    return C === undefined ? Array : C;
  };
  return module.exports;
});
$__System.registerDynamic('118', ['117'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var speciesConstructor = $__require('117');
  module.exports = function (original, length) {
    return new (speciesConstructor(original))(length);
  };
  return module.exports;
});
$__System.registerDynamic('a2', ['93', '9b', '28', '6f', '118'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var ctx = $__require('93'),
      IObject = $__require('9b'),
      toObject = $__require('28'),
      toLength = $__require('6f'),
      asc = $__require('118');
  module.exports = function (TYPE, $create) {
    var IS_MAP = TYPE == 1,
        IS_FILTER = TYPE == 2,
        IS_SOME = TYPE == 3,
        IS_EVERY = TYPE == 4,
        IS_FIND_INDEX = TYPE == 6,
        NO_HOLES = TYPE == 5 || IS_FIND_INDEX,
        create = $create || asc;
    return function ($this, callbackfn, that) {
      var O = toObject($this),
          self = IObject(O),
          f = ctx(callbackfn, that, 3),
          length = toLength(self.length),
          index = 0,
          result = IS_MAP ? create($this, length) : IS_FILTER ? create($this, 0) : undefined,
          val,
          res;
      for (; length > index; index++) if (NO_HOLES || index in self) {
        val = self[index];
        res = f(val, index, O);
        if (TYPE) {
          if (IS_MAP) result[index] = res;else if (res) switch (TYPE) {
            case 3:
              return true;
            case 5:
              return val;
            case 6:
              return index;
            case 2:
              result.push(val);
          } else if (IS_EVERY) return false;
        }
      }
      return IS_FIND_INDEX ? -1 : IS_SOME || IS_EVERY ? IS_EVERY : result;
    };
  };
  return module.exports;
});
$__System.registerDynamic('c8', ['c5', 'e', '17', '2d', 'c0', 'c1', 'a2', 'a'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var redefineAll = $__require('c5'),
      getWeak = $__require('e').getWeak,
      anObject = $__require('17'),
      isObject = $__require('2d'),
      anInstance = $__require('c0'),
      forOf = $__require('c1'),
      createArrayMethod = $__require('a2'),
      $has = $__require('a'),
      arrayFind = createArrayMethod(5),
      arrayFindIndex = createArrayMethod(6),
      id = 0;
  var uncaughtFrozenStore = function (that) {
    return that._l || (that._l = new UncaughtFrozenStore());
  };
  var UncaughtFrozenStore = function () {
    this.a = [];
  };
  var findUncaughtFrozen = function (store, key) {
    return arrayFind(store.a, function (it) {
      return it[0] === key;
    });
  };
  UncaughtFrozenStore.prototype = {
    get: function (key) {
      var entry = findUncaughtFrozen(this, key);
      if (entry) return entry[1];
    },
    has: function (key) {
      return !!findUncaughtFrozen(this, key);
    },
    set: function (key, value) {
      var entry = findUncaughtFrozen(this, key);
      if (entry) entry[1] = value;else this.a.push([key, value]);
    },
    'delete': function (key) {
      var index = arrayFindIndex(this.a, function (it) {
        return it[0] === key;
      });
      if (~index) this.a.splice(index, 1);
      return !!~index;
    }
  };
  module.exports = {
    getConstructor: function (wrapper, NAME, IS_MAP, ADDER) {
      var C = wrapper(function (that, iterable) {
        anInstance(that, C, NAME, '_i');
        that._i = id++;
        that._l = undefined;
        if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
      });
      redefineAll(C.prototype, {
        'delete': function (key) {
          if (!isObject(key)) return false;
          var data = getWeak(key);
          if (data === true) return uncaughtFrozenStore(this)['delete'](key);
          return data && $has(data, this._i) && delete data[this._i];
        },
        has: function has(key) {
          if (!isObject(key)) return false;
          var data = getWeak(key);
          if (data === true) return uncaughtFrozenStore(this).has(key);
          return data && $has(data, this._i);
        }
      });
      return C;
    },
    def: function (that, key, value) {
      var data = getWeak(anObject(key), true);
      if (data === true) uncaughtFrozenStore(that).set(key, value);else data[that._i] = value;
      return that;
    },
    ufstore: uncaughtFrozenStore
  };
  return module.exports;
});
$__System.registerDynamic('e', ['12', '2d', 'a', '1d', 'f'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var META = $__require('12')('meta'),
      isObject = $__require('2d'),
      has = $__require('a'),
      setDesc = $__require('1d').f,
      id = 0;
  var isExtensible = Object.isExtensible || function () {
    return true;
  };
  var FREEZE = !$__require('f')(function () {
    return isExtensible(Object.preventExtensions({}));
  });
  var setMeta = function (it) {
    setDesc(it, META, { value: {
        i: 'O' + ++id,
        w: {}
      } });
  };
  var fastKey = function (it, create) {
    if (!isObject(it)) return typeof it == 'symbol' ? it : (typeof it == 'string' ? 'S' : 'P') + it;
    if (!has(it, META)) {
      if (!isExtensible(it)) return 'F';
      if (!create) return 'E';
      setMeta(it);
    }
    return it[META].i;
  };
  var getWeak = function (it, create) {
    if (!has(it, META)) {
      if (!isExtensible(it)) return true;
      if (!create) return false;
      setMeta(it);
    }
    return it[META].w;
  };
  var onFreeze = function (it) {
    if (FREEZE && meta.NEED && isExtensible(it) && !has(it, META)) setMeta(it);
    return it;
  };
  var meta = module.exports = {
    KEY: META,
    NEED: false,
    fastKey: fastKey,
    getWeak: getWeak,
    onFreeze: onFreeze
  };
  return module.exports;
});
$__System.registerDynamic('98', ['13'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var ITERATOR = $__require('13')('iterator'),
      SAFE_CLOSING = false;
  try {
    var riter = [7][ITERATOR]();
    riter['return'] = function () {
      SAFE_CLOSING = true;
    };
    Array.from(riter, function () {
      throw 2;
    });
  } catch (e) {}
  module.exports = function (exec, skipClosing) {
    if (!skipClosing && !SAFE_CLOSING) return false;
    var safe = false;
    try {
      var arr = [7],
          iter = arr[ITERATOR]();
      iter.next = function () {
        return { done: safe = true };
      };
      arr[ITERATOR] = function () {
        return iter;
      };
      exec(arr);
    } catch (e) {}
    return safe;
  };
  return module.exports;
});
$__System.registerDynamic("7", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  exports.f = {}.propertyIsEnumerable;
  return module.exports;
});
$__System.registerDynamic('1c', ['7', '19', '4', '18', 'a', '119', 'b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var pIE = $__require('7'),
      createDesc = $__require('19'),
      toIObject = $__require('4'),
      toPrimitive = $__require('18'),
      has = $__require('a'),
      IE8_DOM_DEFINE = $__require('119'),
      gOPD = Object.getOwnPropertyDescriptor;
  exports.f = $__require('b') ? gOPD : function getOwnPropertyDescriptor(O, P) {
    O = toIObject(O);
    P = toPrimitive(P, true);
    if (IE8_DOM_DEFINE) try {
      return gOPD(O, P);
    } catch (e) {}
    if (has(O, P)) return createDesc(!pIE.f.call(O, P), O[P]);
  };
  return module.exports;
});
$__System.registerDynamic('39', ['2d', '17', '93', '1c'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d'),
      anObject = $__require('17');
  var check = function (O, proto) {
    anObject(O);
    if (!isObject(proto) && proto !== null) throw TypeError(proto + ": can't set as prototype!");
  };
  module.exports = {
    set: Object.setPrototypeOf || ('__proto__' in {} ? function (test, buggy, set) {
      try {
        set = $__require('93')(Function.call, $__require('1c').f(Object.prototype, '__proto__').set, 2);
        set(test, []);
        buggy = !(test instanceof Array);
      } catch (e) {
        buggy = true;
      }
      return function setPrototypeOf(O, proto) {
        check(O, proto);
        if (buggy) O.__proto__ = proto;else set(O, proto);
        return O;
      };
    }({}, false) : undefined),
    check: check
  };
  return module.exports;
});
$__System.registerDynamic('46', ['2d', '39'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d'),
      setPrototypeOf = $__require('39').set;
  module.exports = function (that, target, C) {
    var P,
        S = target.constructor;
    if (S !== C && typeof S == 'function' && (P = S.prototype) !== C.prototype && isObject(P) && setPrototypeOf) {
      setPrototypeOf(that, P);
    }
    return that;
  };
  return module.exports;
});
$__System.registerDynamic('c9', ['9', 'c', 'd', 'c5', 'e', 'c1', 'c0', '2d', 'f', '98', '11', '46'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var global = $__require('9'),
      $export = $__require('c'),
      redefine = $__require('d'),
      redefineAll = $__require('c5'),
      meta = $__require('e'),
      forOf = $__require('c1'),
      anInstance = $__require('c0'),
      isObject = $__require('2d'),
      fails = $__require('f'),
      $iterDetect = $__require('98'),
      setToStringTag = $__require('11'),
      inheritIfRequired = $__require('46');
  module.exports = function (NAME, wrapper, methods, common, IS_MAP, IS_WEAK) {
    var Base = global[NAME],
        C = Base,
        ADDER = IS_MAP ? 'set' : 'add',
        proto = C && C.prototype,
        O = {};
    var fixMethod = function (KEY) {
      var fn = proto[KEY];
      redefine(proto, KEY, KEY == 'delete' ? function (a) {
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'has' ? function has(a) {
        return IS_WEAK && !isObject(a) ? false : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'get' ? function get(a) {
        return IS_WEAK && !isObject(a) ? undefined : fn.call(this, a === 0 ? 0 : a);
      } : KEY == 'add' ? function add(a) {
        fn.call(this, a === 0 ? 0 : a);
        return this;
      } : function set(a, b) {
        fn.call(this, a === 0 ? 0 : a, b);
        return this;
      });
    };
    if (typeof C != 'function' || !(IS_WEAK || proto.forEach && !fails(function () {
      new C().entries().next();
    }))) {
      C = common.getConstructor(wrapper, NAME, IS_MAP, ADDER);
      redefineAll(C.prototype, methods);
      meta.NEED = true;
    } else {
      var instance = new C(),
          HASNT_CHAINING = instance[ADDER](IS_WEAK ? {} : -0, 1) != instance,
          THROWS_ON_PRIMITIVES = fails(function () {
        instance.has(1);
      }),
          ACCEPT_ITERABLES = $iterDetect(function (iter) {
        new C(iter);
      }),
          BUGGY_ZERO = !IS_WEAK && fails(function () {
        var $instance = new C(),
            index = 5;
        while (index--) $instance[ADDER](index, index);
        return !$instance.has(-0);
      });
      if (!ACCEPT_ITERABLES) {
        C = wrapper(function (target, iterable) {
          anInstance(target, C, NAME);
          var that = inheritIfRequired(new Base(), target, C);
          if (iterable != undefined) forOf(iterable, IS_MAP, that[ADDER], that);
          return that;
        });
        C.prototype = proto;
        proto.constructor = C;
      }
      if (THROWS_ON_PRIMITIVES || BUGGY_ZERO) {
        fixMethod('delete');
        fixMethod('has');
        IS_MAP && fixMethod('get');
      }
      if (BUGGY_ZERO || HASNT_CHAINING) fixMethod(ADDER);
      if (IS_WEAK && proto.clear) delete proto.clear;
    }
    setToStringTag(C, NAME);
    O[NAME] = C;
    $export($export.G + $export.W + $export.F * (C != Base), O);
    if (!IS_WEAK) common.setStrong(C, NAME, IS_MAP);
    return C;
  };
  return module.exports;
});
$__System.registerDynamic('11a', ['a2', 'd', 'e', '35', 'c8', '2d', 'c9'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var each = $__require('a2')(0),
      redefine = $__require('d'),
      meta = $__require('e'),
      assign = $__require('35'),
      weak = $__require('c8'),
      isObject = $__require('2d'),
      getWeak = meta.getWeak,
      isExtensible = Object.isExtensible,
      uncaughtFrozenStore = weak.ufstore,
      tmp = {},
      InternalMap;
  var wrapper = function (get) {
    return function WeakMap() {
      return get(this, arguments.length > 0 ? arguments[0] : undefined);
    };
  };
  var methods = {
    get: function get(key) {
      if (isObject(key)) {
        var data = getWeak(key);
        if (data === true) return uncaughtFrozenStore(this).get(key);
        return data ? data[this._i] : undefined;
      }
    },
    set: function set(key, value) {
      return weak.def(this, key, value);
    }
  };
  var $WeakMap = module.exports = $__require('c9')('WeakMap', wrapper, methods, weak, true, true);
  if (new $WeakMap().set((Object.freeze || Object)(tmp), 7).get(tmp) != 7) {
    InternalMap = weak.getConstructor(wrapper);
    assign(InternalMap.prototype, methods);
    meta.NEED = true;
    each(['delete', 'has', 'get', 'set'], function (key) {
      var proto = $WeakMap.prototype,
          method = proto[key];
      redefine(proto, key, function (a, b) {
        if (isObject(a) && !isExtensible(a)) {
          if (!this._f) this._f = new InternalMap();
          var result = this._f[key](a, b);
          return key == 'set' ? this : result;
        }
        return method.call(this, a, b);
      });
    });
  }
  return module.exports;
});
$__System.registerDynamic('10b', ['116', 'c', '10', '11a'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var Map = $__require('116'),
      $export = $__require('c'),
      shared = $__require('10')('metadata'),
      store = shared.store || (shared.store = new ($__require('11a'))());
  var getOrCreateMetadataMap = function (target, targetKey, create) {
    var targetMetadata = store.get(target);
    if (!targetMetadata) {
      if (!create) return undefined;
      store.set(target, targetMetadata = new Map());
    }
    var keyMetadata = targetMetadata.get(targetKey);
    if (!keyMetadata) {
      if (!create) return undefined;
      targetMetadata.set(targetKey, keyMetadata = new Map());
    }
    return keyMetadata;
  };
  var ordinaryHasOwnMetadata = function (MetadataKey, O, P) {
    var metadataMap = getOrCreateMetadataMap(O, P, false);
    return metadataMap === undefined ? false : metadataMap.has(MetadataKey);
  };
  var ordinaryGetOwnMetadata = function (MetadataKey, O, P) {
    var metadataMap = getOrCreateMetadataMap(O, P, false);
    return metadataMap === undefined ? undefined : metadataMap.get(MetadataKey);
  };
  var ordinaryDefineOwnMetadata = function (MetadataKey, MetadataValue, O, P) {
    getOrCreateMetadataMap(O, P, true).set(MetadataKey, MetadataValue);
  };
  var ordinaryOwnMetadataKeys = function (target, targetKey) {
    var metadataMap = getOrCreateMetadataMap(target, targetKey, false),
        keys = [];
    if (metadataMap) metadataMap.forEach(function (_, key) {
      keys.push(key);
    });
    return keys;
  };
  var toMetaKey = function (it) {
    return it === undefined || typeof it == 'symbol' ? it : String(it);
  };
  var exp = function (O) {
    $export($export.S, 'Reflect', O);
  };
  module.exports = {
    store: store,
    map: getOrCreateMetadataMap,
    has: ordinaryHasOwnMetadata,
    get: ordinaryGetOwnMetadata,
    set: ordinaryDefineOwnMetadata,
    keys: ordinaryOwnMetadataKeys,
    key: toMetaKey,
    exp: exp
  };
  return module.exports;
});
$__System.registerDynamic('11b', ['10b', '17', 'a0'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var metadata = $__require('10b'),
        anObject = $__require('17'),
        aFunction = $__require('a0'),
        toMetaKey = metadata.key,
        ordinaryDefineOwnMetadata = metadata.set;
    metadata.exp({ metadata: function metadata(metadataKey, metadataValue) {
            return function decorator(target, targetKey) {
                ordinaryDefineOwnMetadata(metadataKey, metadataValue, (targetKey !== undefined ? anObject : aFunction)(target), toMetaKey(targetKey));
            };
        } });
    return module.exports;
});
$__System.registerDynamic('11c', ['c', 'c4', '9', '45', 'c6'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    (function (process) {
        var $export = $__require('c'),
            microtask = $__require('c4')(),
            process = $__require('9').process,
            isNode = $__require('45')(process) == 'process';
        $export($export.G, { asap: function asap(fn) {
                var domain = isNode && process.domain;
                microtask(domain ? domain.bind(fn) : fn);
            } });
    })($__require('c6'));
    return module.exports;
});
$__System.registerDynamic('c4', ['9', 'c3', '45', 'c6'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  (function (process) {
    var global = $__require('9'),
        macrotask = $__require('c3').set,
        Observer = global.MutationObserver || global.WebKitMutationObserver,
        process = global.process,
        Promise = global.Promise,
        isNode = $__require('45')(process) == 'process';
    module.exports = function () {
      var head, last, notify;
      var flush = function () {
        var parent, fn;
        if (isNode && (parent = process.domain)) parent.exit();
        while (head) {
          fn = head.fn;
          head = head.next;
          try {
            fn();
          } catch (e) {
            if (head) notify();else last = undefined;
            throw e;
          }
        }
        last = undefined;
        if (parent) parent.enter();
      };
      if (isNode) {
        notify = function () {
          process.nextTick(flush);
        };
      } else if (Observer) {
        var toggle = true,
            node = document.createTextNode('');
        new Observer(flush).observe(node, { characterData: true });
        notify = function () {
          node.data = toggle = !toggle;
        };
      } else if (Promise && Promise.resolve) {
        var promise = Promise.resolve();
        notify = function () {
          promise.then(flush);
        };
      } else {
        notify = function () {
          macrotask.call(global, flush);
        };
      }
      return function (fn) {
        var task = {
          fn: fn,
          next: undefined
        };
        if (last) last.next = task;
        if (!head) {
          head = task;
          notify();
        }
        last = task;
      };
    };
  })($__require('c6'));
  return module.exports;
});
$__System.registerDynamic('c0', [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = function (it, Constructor, name, forbiddenField) {
    if (!(it instanceof Constructor) || forbiddenField !== undefined && forbiddenField in it) {
      throw TypeError(name + ': incorrect invocation!');
    }return it;
  };
  return module.exports;
});
$__System.registerDynamic('c5', ['d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var redefine = $__require('d');
  module.exports = function (target, src, safe) {
    for (var key in src) redefine(target, key, src[key], safe);
    return target;
  };
  return module.exports;
});
$__System.registerDynamic('94', ['17'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var anObject = $__require('17');
  module.exports = function (iterator, fn, value, entries) {
    try {
      return entries ? fn(anObject(value)[0], value[1]) : fn(value);
    } catch (e) {
      var ret = iterator['return'];
      if (ret !== undefined) anObject(ret.call(iterator));
      throw e;
    }
  };
  return module.exports;
});
$__System.registerDynamic('95', ['d8', '13'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var Iterators = $__require('d8'),
        ITERATOR = $__require('13')('iterator'),
        ArrayProto = Array.prototype;
    module.exports = function (it) {
        return it !== undefined && (Iterators.Array === it || ArrayProto[ITERATOR] === it);
    };
    return module.exports;
});
$__System.registerDynamic('3b', ['45', '13'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var cof = $__require('45'),
      TAG = $__require('13')('toStringTag'),
      ARG = cof(function () {
    return arguments;
  }()) == 'Arguments';
  var tryGet = function (it, key) {
    try {
      return it[key];
    } catch (e) {}
  };
  module.exports = function (it) {
    var O, T, B;
    return it === undefined ? 'Undefined' : it === null ? 'Null' : typeof (T = tryGet(O = Object(it), TAG)) == 'string' ? T : ARG ? cof(O) : (B = cof(O)) == 'Object' && typeof O.callee == 'function' ? 'Arguments' : B;
  };
  return module.exports;
});
$__System.registerDynamic('97', ['3b', '13', 'd8', '32'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var classof = $__require('3b'),
        ITERATOR = $__require('13')('iterator'),
        Iterators = $__require('d8');
    module.exports = $__require('32').getIteratorMethod = function (it) {
        if (it != undefined) return it[ITERATOR] || it['@@iterator'] || Iterators[classof(it)];
    };
    return module.exports;
});
$__System.registerDynamic('c1', ['93', '94', '95', '17', '6f', '97'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var ctx = $__require('93'),
      call = $__require('94'),
      isArrayIter = $__require('95'),
      anObject = $__require('17'),
      toLength = $__require('6f'),
      getIterFn = $__require('97'),
      BREAK = {},
      RETURN = {};
  var exports = module.exports = function (iterable, entries, fn, that, ITERATOR) {
    var iterFn = ITERATOR ? function () {
      return iterable;
    } : getIterFn(iterable),
        f = ctx(fn, that, entries ? 2 : 1),
        index = 0,
        length,
        step,
        iterator,
        result;
    if (typeof iterFn != 'function') throw TypeError(iterable + ' is not iterable!');
    if (isArrayIter(iterFn)) for (length = toLength(iterable.length); length > index; index++) {
      result = entries ? f(anObject(step = iterable[index])[0], step[1]) : f(iterable[index]);
      if (result === BREAK || result === RETURN) return result;
    } else for (iterator = iterFn.call(iterable); !(step = iterator.next()).done;) {
      result = call(iterator, f, step.value, entries);
      if (result === BREAK || result === RETURN) return result;
    }
  };
  exports.BREAK = BREAK;
  exports.RETURN = RETURN;
  return module.exports;
});
$__System.registerDynamic('b5', ['9', '1d', 'b', '13'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var global = $__require('9'),
      dP = $__require('1d'),
      DESCRIPTORS = $__require('b'),
      SPECIES = $__require('13')('species');
  module.exports = function (KEY) {
    var C = global[KEY];
    if (DESCRIPTORS && C && !C[SPECIES]) dP.f(C, SPECIES, {
      configurable: true,
      get: function () {
        return this;
      }
    });
  };
  return module.exports;
});
$__System.registerDynamic('11d', ['c', '9', '32', 'c4', '13', 'a0', '17', 'c0', 'c5', '20', 'c1', 'b5'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var $export = $__require('c'),
      global = $__require('9'),
      core = $__require('32'),
      microtask = $__require('c4')(),
      OBSERVABLE = $__require('13')('observable'),
      aFunction = $__require('a0'),
      anObject = $__require('17'),
      anInstance = $__require('c0'),
      redefineAll = $__require('c5'),
      hide = $__require('20'),
      forOf = $__require('c1'),
      RETURN = forOf.RETURN;
  var getMethod = function (fn) {
    return fn == null ? undefined : aFunction(fn);
  };
  var cleanupSubscription = function (subscription) {
    var cleanup = subscription._c;
    if (cleanup) {
      subscription._c = undefined;
      cleanup();
    }
  };
  var subscriptionClosed = function (subscription) {
    return subscription._o === undefined;
  };
  var closeSubscription = function (subscription) {
    if (!subscriptionClosed(subscription)) {
      subscription._o = undefined;
      cleanupSubscription(subscription);
    }
  };
  var Subscription = function (observer, subscriber) {
    anObject(observer);
    this._c = undefined;
    this._o = observer;
    observer = new SubscriptionObserver(this);
    try {
      var cleanup = subscriber(observer),
          subscription = cleanup;
      if (cleanup != null) {
        if (typeof cleanup.unsubscribe === 'function') cleanup = function () {
          subscription.unsubscribe();
        };else aFunction(cleanup);
        this._c = cleanup;
      }
    } catch (e) {
      observer.error(e);
      return;
    }
    if (subscriptionClosed(this)) cleanupSubscription(this);
  };
  Subscription.prototype = redefineAll({}, { unsubscribe: function unsubscribe() {
      closeSubscription(this);
    } });
  var SubscriptionObserver = function (subscription) {
    this._s = subscription;
  };
  SubscriptionObserver.prototype = redefineAll({}, {
    next: function next(value) {
      var subscription = this._s;
      if (!subscriptionClosed(subscription)) {
        var observer = subscription._o;
        try {
          var m = getMethod(observer.next);
          if (m) return m.call(observer, value);
        } catch (e) {
          try {
            closeSubscription(subscription);
          } finally {
            throw e;
          }
        }
      }
    },
    error: function error(value) {
      var subscription = this._s;
      if (subscriptionClosed(subscription)) throw value;
      var observer = subscription._o;
      subscription._o = undefined;
      try {
        var m = getMethod(observer.error);
        if (!m) throw value;
        value = m.call(observer, value);
      } catch (e) {
        try {
          cleanupSubscription(subscription);
        } finally {
          throw e;
        }
      }
      cleanupSubscription(subscription);
      return value;
    },
    complete: function complete(value) {
      var subscription = this._s;
      if (!subscriptionClosed(subscription)) {
        var observer = subscription._o;
        subscription._o = undefined;
        try {
          var m = getMethod(observer.complete);
          value = m ? m.call(observer, value) : undefined;
        } catch (e) {
          try {
            cleanupSubscription(subscription);
          } finally {
            throw e;
          }
        }
        cleanupSubscription(subscription);
        return value;
      }
    }
  });
  var $Observable = function Observable(subscriber) {
    anInstance(this, $Observable, 'Observable', '_f')._f = aFunction(subscriber);
  };
  redefineAll($Observable.prototype, {
    subscribe: function subscribe(observer) {
      return new Subscription(observer, this._f);
    },
    forEach: function forEach(fn) {
      var that = this;
      return new (core.Promise || global.Promise)(function (resolve, reject) {
        aFunction(fn);
        var subscription = that.subscribe({
          next: function (value) {
            try {
              return fn(value);
            } catch (e) {
              reject(e);
              subscription.unsubscribe();
            }
          },
          error: reject,
          complete: resolve
        });
      });
    }
  });
  redefineAll($Observable, {
    from: function from(x) {
      var C = typeof this === 'function' ? this : $Observable;
      var method = getMethod(anObject(x)[OBSERVABLE]);
      if (method) {
        var observable = anObject(method.call(x));
        return observable.constructor === C ? observable : new C(function (observer) {
          return observable.subscribe(observer);
        });
      }
      return new C(function (observer) {
        var done = false;
        microtask(function () {
          if (!done) {
            try {
              if (forOf(x, false, function (it) {
                observer.next(it);
                if (done) return RETURN;
              }) === RETURN) return;
            } catch (e) {
              if (done) throw e;
              observer.error(e);
              return;
            }
            observer.complete();
          }
        });
        return function () {
          done = true;
        };
      });
    },
    of: function of() {
      for (var i = 0, l = arguments.length, items = Array(l); i < l;) items[i] = arguments[i++];
      return new (typeof this === 'function' ? this : $Observable)(function (observer) {
        var done = false;
        microtask(function () {
          if (!done) {
            for (var i = 0; i < items.length; ++i) {
              observer.next(items[i]);
              if (done) return;
            }
            observer.complete();
          }
        });
        return function () {
          done = true;
        };
      });
    }
  });
  hide($Observable.prototype, OBSERVABLE, function () {
    return this;
  });
  $export($export.G, { Observable: $Observable });
  $__require('b5')('Observable');
  return module.exports;
});
$__System.registerDynamic('11e', ['9'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = $__require('9');
  return module.exports;
});
$__System.registerDynamic('11f', ['11e', 'db', 'a0'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var path = $__require('11e'),
      invoke = $__require('db'),
      aFunction = $__require('a0');
  module.exports = function () {
    var fn = aFunction(this),
        length = arguments.length,
        pargs = Array(length),
        i = 0,
        _ = path._,
        holder = false;
    while (length > i) if ((pargs[i] = arguments[i++]) === _) holder = true;
    return function () {
      var that = this,
          aLen = arguments.length,
          j = 0,
          k = 0,
          args;
      if (!holder && !aLen) return invoke(fn, pargs, that);
      args = pargs.slice();
      if (holder) for (; length > j; j++) if (args[j] === _) args[j] = arguments[k++];
      while (aLen > k) args.push(arguments[k++]);
      return invoke(fn, args, that);
    };
  };
  return module.exports;
});
$__System.registerDynamic('120', ['9', 'c', 'db', '11f'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var global = $__require('9'),
      $export = $__require('c'),
      invoke = $__require('db'),
      partial = $__require('11f'),
      navigator = global.navigator,
      MSIE = !!navigator && /MSIE .\./.test(navigator.userAgent);
  var wrap = function (set) {
    return MSIE ? function (fn, time) {
      return set(invoke(partial, [].slice.call(arguments, 2), typeof fn == 'function' ? fn : Function(fn)), time);
    } : set;
  };
  $export($export.G + $export.B + $export.F * MSIE, {
    setTimeout: wrap(global.setTimeout),
    setInterval: wrap(global.setInterval)
  });
  return module.exports;
});
$__System.registerDynamic("db", [], true, function ($__require, exports, module) {
                  var define,
                      global = this || self,
                      GLOBAL = global;
                  // fast apply, http://jsperf.lnkit.com/fast-apply/5
                  module.exports = function (fn, args, that) {
                                    var un = that === undefined;
                                    switch (args.length) {
                                                      case 0:
                                                                        return un ? fn() : fn.call(that);
                                                      case 1:
                                                                        return un ? fn(args[0]) : fn.call(that, args[0]);
                                                      case 2:
                                                                        return un ? fn(args[0], args[1]) : fn.call(that, args[0], args[1]);
                                                      case 3:
                                                                        return un ? fn(args[0], args[1], args[2]) : fn.call(that, args[0], args[1], args[2]);
                                                      case 4:
                                                                        return un ? fn(args[0], args[1], args[2], args[3]) : fn.call(that, args[0], args[1], args[2], args[3]);
                                    }return fn.apply(that, args);
                  };
                  return module.exports;
});
$__System.registerDynamic('c3', ['93', 'db', '9e', '121', '9', '45', 'c6'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  (function (process) {
    var ctx = $__require('93'),
        invoke = $__require('db'),
        html = $__require('9e'),
        cel = $__require('121'),
        global = $__require('9'),
        process = global.process,
        setTask = global.setImmediate,
        clearTask = global.clearImmediate,
        MessageChannel = global.MessageChannel,
        counter = 0,
        queue = {},
        ONREADYSTATECHANGE = 'onreadystatechange',
        defer,
        channel,
        port;
    var run = function () {
      var id = +this;
      if (queue.hasOwnProperty(id)) {
        var fn = queue[id];
        delete queue[id];
        fn();
      }
    };
    var listener = function (event) {
      run.call(event.data);
    };
    if (!setTask || !clearTask) {
      setTask = function setImmediate(fn) {
        var args = [],
            i = 1;
        while (arguments.length > i) args.push(arguments[i++]);
        queue[++counter] = function () {
          invoke(typeof fn == 'function' ? fn : Function(fn), args);
        };
        defer(counter);
        return counter;
      };
      clearTask = function clearImmediate(id) {
        delete queue[id];
      };
      if ($__require('45')(process) == 'process') {
        defer = function (id) {
          process.nextTick(ctx(run, id, 1));
        };
      } else if (MessageChannel) {
        channel = new MessageChannel();
        port = channel.port2;
        channel.port1.onmessage = listener;
        defer = ctx(port.postMessage, port, 1);
      } else if (global.addEventListener && typeof postMessage == 'function' && !global.importScripts) {
        defer = function (id) {
          global.postMessage(id + '', '*');
        };
        global.addEventListener('message', listener, false);
      } else if (ONREADYSTATECHANGE in cel('script')) {
        defer = function (id) {
          html.appendChild(cel('script'))[ONREADYSTATECHANGE] = function () {
            html.removeChild(this);
            run.call(id);
          };
        };
      } else {
        defer = function (id) {
          setTimeout(ctx(run, id, 1), 0);
        };
      }
    }
    module.exports = {
      set: setTask,
      clear: clearTask
    };
  })($__require('c6'));
  return module.exports;
});
$__System.registerDynamic('122', ['c', 'c3'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $export = $__require('c'),
      $task = $__require('c3');
  $export($export.G + $export.B, {
    setImmediate: $task.set,
    clearImmediate: $task.clear
  });
  return module.exports;
});
$__System.registerDynamic('af', ['13', '20'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var UNSCOPABLES = $__require('13')('unscopables'),
      ArrayProto = Array.prototype;
  if (ArrayProto[UNSCOPABLES] == undefined) $__require('20')(ArrayProto, UNSCOPABLES, {});
  module.exports = function (key) {
    ArrayProto[UNSCOPABLES][key] = true;
  };
  return module.exports;
});
$__System.registerDynamic("115", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = function (done, value) {
    return { value: value, done: !!done };
  };
  return module.exports;
});
$__System.registerDynamic("1f", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = false;
  return module.exports;
});
$__System.registerDynamic("45", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var toString = {}.toString;

  module.exports = function (it) {
    return toString.call(it).slice(8, -1);
  };
  return module.exports;
});
$__System.registerDynamic('9b', ['45'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var cof = $__require('45');
  module.exports = Object('z').propertyIsEnumerable(0) ? Object : function (it) {
    return cof(it) == 'String' ? it.split('') : Object(it);
  };
  return module.exports;
});
$__System.registerDynamic('4', ['9b', '7b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var IObject = $__require('9b'),
      defined = $__require('7b');
  module.exports = function (it) {
    return IObject(defined(it));
  };
  return module.exports;
});
$__System.registerDynamic('6f', ['49'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var toInteger = $__require('49'),
      min = Math.min;
  module.exports = function (it) {
    return it > 0 ? min(toInteger(it), 0x1fffffffffffff) : 0;
  };
  return module.exports;
});
$__System.registerDynamic("49", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  // 7.1.4 ToInteger
  var ceil = Math.ceil,
      floor = Math.floor;
  module.exports = function (it) {
    return isNaN(it = +it) ? 0 : (it > 0 ? floor : ceil)(it);
  };
  return module.exports;
});
$__System.registerDynamic('6d', ['49'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var toInteger = $__require('49'),
      max = Math.max,
      min = Math.min;
  module.exports = function (index, length) {
    index = toInteger(index);
    return index < 0 ? max(index + length, 0) : min(index, length);
  };
  return module.exports;
});
$__System.registerDynamic('ab', ['4', '6f', '6d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var toIObject = $__require('4'),
      toLength = $__require('6f'),
      toIndex = $__require('6d');
  module.exports = function (IS_INCLUDES) {
    return function ($this, el, fromIndex) {
      var O = toIObject($this),
          length = toLength(O.length),
          index = toIndex(fromIndex, length),
          value;
      if (IS_INCLUDES && el != el) while (length > index) {
        value = O[index++];
        if (value != value) return true;
      } else for (; length > index; index++) if (IS_INCLUDES || index in O) {
        if (O[index] === el) return IS_INCLUDES || index || 0;
      }
      return !IS_INCLUDES && -1;
    };
  };
  return module.exports;
});
$__System.registerDynamic('f5', ['a', '4', 'ab', '123'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var has = $__require('a'),
      toIObject = $__require('4'),
      arrayIndexOf = $__require('ab')(false),
      IE_PROTO = $__require('123')('IE_PROTO');
  module.exports = function (object, names) {
    var O = toIObject(object),
        i = 0,
        result = [],
        key;
    for (key in O) if (key != IE_PROTO) has(O, key) && result.push(key);
    while (names.length > i) if (has(O, key = names[i++])) {
      ~arrayIndexOf(result, key) || result.push(key);
    }
    return result;
  };
  return module.exports;
});
$__System.registerDynamic('3', ['f5', 'f6'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $keys = $__require('f5'),
      enumBugKeys = $__require('f6');
  module.exports = Object.keys || function keys(O) {
    return $keys(O, enumBugKeys);
  };
  return module.exports;
});
$__System.registerDynamic('24', ['1d', '17', '3', 'b'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var dP = $__require('1d'),
        anObject = $__require('17'),
        getKeys = $__require('3');
    module.exports = $__require('b') ? Object.defineProperties : function defineProperties(O, Properties) {
        anObject(O);
        var keys = getKeys(Properties),
            length = keys.length,
            i = 0,
            P;
        while (length > i) dP.f(O, P = keys[i++], Properties[P]);
        return O;
    };
    return module.exports;
});
$__System.registerDynamic('f6', [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  // IE 8- don't enum bug keys
  module.exports = 'constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf'.split(',');
  return module.exports;
});
$__System.registerDynamic('9e', ['9'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = $__require('9').document && document.documentElement;
  return module.exports;
});
$__System.registerDynamic('1a', ['17', '24', 'f6', '123', '121', '9e'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var anObject = $__require('17'),
      dPs = $__require('24'),
      enumBugKeys = $__require('f6'),
      IE_PROTO = $__require('123')('IE_PROTO'),
      Empty = function () {},
      PROTOTYPE = 'prototype';
  var createDict = function () {
    var iframe = $__require('121')('iframe'),
        i = enumBugKeys.length,
        lt = '<',
        gt = '>',
        iframeDocument;
    iframe.style.display = 'none';
    $__require('9e').appendChild(iframe);
    iframe.src = 'javascript:';
    iframeDocument = iframe.contentWindow.document;
    iframeDocument.open();
    iframeDocument.write(lt + 'script' + gt + 'document.F=Object' + lt + '/script' + gt);
    iframeDocument.close();
    createDict = iframeDocument.F;
    while (i--) delete createDict[PROTOTYPE][enumBugKeys[i]];
    return createDict();
  };
  module.exports = Object.create || function create(O, Properties) {
    var result;
    if (O !== null) {
      Empty[PROTOTYPE] = anObject(O);
      result = new Empty();
      Empty[PROTOTYPE] = null;
      result[IE_PROTO] = O;
    } else result = createDict();
    return Properties === undefined ? result : dPs(result, Properties);
  };
  return module.exports;
});
$__System.registerDynamic('e0', ['1a', '19', '11', '20', '13'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var create = $__require('1a'),
      descriptor = $__require('19'),
      setToStringTag = $__require('11'),
      IteratorPrototype = {};
  $__require('20')(IteratorPrototype, $__require('13')('iterator'), function () {
    return this;
  });
  module.exports = function (Constructor, NAME, next) {
    Constructor.prototype = create(IteratorPrototype, { next: descriptor(1, next) });
    setToStringTag(Constructor, NAME + ' Iterator');
  };
  return module.exports;
});
$__System.registerDynamic('11', ['1d', 'a', '13'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var def = $__require('1d').f,
      has = $__require('a'),
      TAG = $__require('13')('toStringTag');
  module.exports = function (it, tag, stat) {
    if (it && !has(it = stat ? it : it.prototype, TAG)) def(it, TAG, {
      configurable: true,
      value: tag
    });
  };
  return module.exports;
});
$__System.registerDynamic("7b", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  // 7.2.1 RequireObjectCoercible(argument)
  module.exports = function (it) {
    if (it == undefined) throw TypeError("Can't call method on  " + it);
    return it;
  };
  return module.exports;
});
$__System.registerDynamic('28', ['7b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var defined = $__require('7b');
  module.exports = function (it) {
    return Object(defined(it));
  };
  return module.exports;
});
$__System.registerDynamic('123', ['10', '12'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var shared = $__require('10')('keys'),
      uid = $__require('12');
  module.exports = function (key) {
    return shared[key] || (shared[key] = uid(key));
  };
  return module.exports;
});
$__System.registerDynamic('29', ['a', '28', '123'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var has = $__require('a'),
      toObject = $__require('28'),
      IE_PROTO = $__require('123')('IE_PROTO'),
      ObjectProto = Object.prototype;
  module.exports = Object.getPrototypeOf || function (O) {
    O = toObject(O);
    if (has(O, IE_PROTO)) return O[IE_PROTO];
    if (typeof O.constructor == 'function' && O instanceof O.constructor) {
      return O.constructor.prototype;
    }
    return O instanceof Object ? ObjectProto : null;
  };
  return module.exports;
});
$__System.registerDynamic('73', ['1f', 'c', 'd', '20', 'a', 'd8', 'e0', '11', '29', '13'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var LIBRARY = $__require('1f'),
      $export = $__require('c'),
      redefine = $__require('d'),
      hide = $__require('20'),
      has = $__require('a'),
      Iterators = $__require('d8'),
      $iterCreate = $__require('e0'),
      setToStringTag = $__require('11'),
      getPrototypeOf = $__require('29'),
      ITERATOR = $__require('13')('iterator'),
      BUGGY = !([].keys && 'next' in [].keys()),
      FF_ITERATOR = '@@iterator',
      KEYS = 'keys',
      VALUES = 'values';
  var returnThis = function () {
    return this;
  };
  module.exports = function (Base, NAME, Constructor, next, DEFAULT, IS_SET, FORCED) {
    $iterCreate(Constructor, NAME, next);
    var getMethod = function (kind) {
      if (!BUGGY && kind in proto) return proto[kind];
      switch (kind) {
        case KEYS:
          return function keys() {
            return new Constructor(this, kind);
          };
        case VALUES:
          return function values() {
            return new Constructor(this, kind);
          };
      }
      return function entries() {
        return new Constructor(this, kind);
      };
    };
    var TAG = NAME + ' Iterator',
        DEF_VALUES = DEFAULT == VALUES,
        VALUES_BUG = false,
        proto = Base.prototype,
        $native = proto[ITERATOR] || proto[FF_ITERATOR] || DEFAULT && proto[DEFAULT],
        $default = $native || getMethod(DEFAULT),
        $entries = DEFAULT ? !DEF_VALUES ? $default : getMethod('entries') : undefined,
        $anyNative = NAME == 'Array' ? proto.entries || $native : $native,
        methods,
        key,
        IteratorPrototype;
    if ($anyNative) {
      IteratorPrototype = getPrototypeOf($anyNative.call(new Base()));
      if (IteratorPrototype !== Object.prototype) {
        setToStringTag(IteratorPrototype, TAG, true);
        if (!LIBRARY && !has(IteratorPrototype, ITERATOR)) hide(IteratorPrototype, ITERATOR, returnThis);
      }
    }
    if (DEF_VALUES && $native && $native.name !== VALUES) {
      VALUES_BUG = true;
      $default = function values() {
        return $native.call(this);
      };
    }
    if ((!LIBRARY || FORCED) && (BUGGY || VALUES_BUG || !proto[ITERATOR])) {
      hide(proto, ITERATOR, $default);
    }
    Iterators[NAME] = $default;
    Iterators[TAG] = returnThis;
    if (DEFAULT) {
      methods = {
        values: DEF_VALUES ? $default : getMethod(VALUES),
        keys: IS_SET ? $default : getMethod(KEYS),
        entries: $entries
      };
      if (FORCED) for (key in methods) {
        if (!(key in proto)) redefine(proto, key, methods[key]);
      } else $export($export.P + $export.F * (BUGGY || VALUES_BUG), NAME, methods);
    }
    return methods;
  };
  return module.exports;
});
$__System.registerDynamic('d7', ['af', '115', 'd8', '4', '73'], true, function ($__require, exports, module) {
  /* */
  'use strict';

  var define,
      global = this || self,
      GLOBAL = global;
  var addToUnscopables = $__require('af'),
      step = $__require('115'),
      Iterators = $__require('d8'),
      toIObject = $__require('4');
  module.exports = $__require('73')(Array, 'Array', function (iterated, kind) {
    this._t = toIObject(iterated);
    this._i = 0;
    this._k = kind;
  }, function () {
    var O = this._t,
        kind = this._k,
        index = this._i++;
    if (!O || index >= O.length) {
      this._t = undefined;
      return step(1);
    }
    if (kind == 'keys') return step(0, index);
    if (kind == 'values') return step(0, O[index]);
    return step(0, [index, O[index]]);
  }, 'values');
  Iterators.Arguments = Iterators.Array;
  addToUnscopables('keys');
  addToUnscopables('values');
  addToUnscopables('entries');
  return module.exports;
});
$__System.registerDynamic("d8", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = {};
  return module.exports;
});
$__System.registerDynamic('10', ['9'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var global = $__require('9'),
        SHARED = '__core-js_shared__',
        store = global[SHARED] || (global[SHARED] = {});
    module.exports = function (key) {
        return store[key] || (store[key] = {});
    };
    return module.exports;
});
$__System.registerDynamic('13', ['10', '12', '9'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var store = $__require('10')('wks'),
        uid = $__require('12'),
        Symbol = $__require('9').Symbol,
        USE_SYMBOL = typeof Symbol == 'function';
    var $exports = module.exports = function (name) {
        return store[name] || (store[name] = USE_SYMBOL && Symbol[name] || (USE_SYMBOL ? Symbol : uid)('Symbol.' + name));
    };
    $exports.store = store;
    return module.exports;
});
$__System.registerDynamic('124', ['d7', 'd', '9', '20', 'd8', '13'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var $iterators = $__require('d7'),
      redefine = $__require('d'),
      global = $__require('9'),
      hide = $__require('20'),
      Iterators = $__require('d8'),
      wks = $__require('13'),
      ITERATOR = wks('iterator'),
      TO_STRING_TAG = wks('toStringTag'),
      ArrayValues = Iterators.Array;
  for (var collections = ['NodeList', 'DOMTokenList', 'MediaList', 'StyleSheetList', 'CSSRuleList'], i = 0; i < 5; i++) {
    var NAME = collections[i],
        Collection = global[NAME],
        proto = Collection && Collection.prototype,
        key;
    if (proto) {
      if (!proto[ITERATOR]) hide(proto, ITERATOR, ArrayValues);
      if (!proto[TO_STRING_TAG]) hide(proto, TO_STRING_TAG, NAME);
      Iterators[NAME] = ArrayValues;
      for (key in $iterators) if (!proto[key]) redefine(proto, key, $iterators[key], true);
    }
  }
  return module.exports;
});
$__System.registerDynamic('125', ['8', '21', '22', '23', '25', '27', '2a', '2b', '2c', '2e', '2f', '30', '31', '33', '34', '36', '38', '3a', '3c', '3e', '3f', '40', '42', '44', '48', '4c', '4d', '4e', '4f', '51', '52', '53', '54', '56', '57', '58', '5a', '5b', '5c', '5e', '5f', '60', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6e', '70', '71', '74', '75', '78', '79', '7c', '7d', '7f', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '90', '91', '92', '99', '9a', '9d', '9f', 'a1', 'a3', 'a4', 'a5', 'a6', 'a7', 'a9', 'aa', 'ac', 'ad', 'b0', 'b2', 'b3', 'b4', 'd7', 'b6', 'b8', 'b9', 'ba', 'bc', 'bd', 'be', 'bf', '116', '10e', '11a', 'c7', 'ca', 'cd', 'ce', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd9', 'da', 'dc', 'dd', 'de', 'df', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ef', 'f0', 'f1', 'f2', 'f3', 'f4', 'f7', 'f8', 'fa', 'fb', 'fd', 'fe', 'ff', '100', '103', '104', '105', '106', '107', '108', '109', '10a', '10c', '10d', '110', '111', '112', '113', '114', '11b', '11c', '11d', '120', '122', '124', '32'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('8');
  $__require('21');
  $__require('22');
  $__require('23');
  $__require('25');
  $__require('27');
  $__require('2a');
  $__require('2b');
  $__require('2c');
  $__require('2e');
  $__require('2f');
  $__require('30');
  $__require('31');
  $__require('33');
  $__require('34');
  $__require('36');
  $__require('38');
  $__require('3a');
  $__require('3c');
  $__require('3e');
  $__require('3f');
  $__require('40');
  $__require('42');
  $__require('44');
  $__require('48');
  $__require('4c');
  $__require('4d');
  $__require('4e');
  $__require('4f');
  $__require('51');
  $__require('52');
  $__require('53');
  $__require('54');
  $__require('56');
  $__require('57');
  $__require('58');
  $__require('5a');
  $__require('5b');
  $__require('5c');
  $__require('5e');
  $__require('5f');
  $__require('60');
  $__require('62');
  $__require('63');
  $__require('64');
  $__require('65');
  $__require('66');
  $__require('67');
  $__require('68');
  $__require('69');
  $__require('6a');
  $__require('6b');
  $__require('6c');
  $__require('6e');
  $__require('70');
  $__require('71');
  $__require('74');
  $__require('75');
  $__require('78');
  $__require('79');
  $__require('7c');
  $__require('7d');
  $__require('7f');
  $__require('80');
  $__require('81');
  $__require('82');
  $__require('83');
  $__require('84');
  $__require('85');
  $__require('86');
  $__require('87');
  $__require('88');
  $__require('89');
  $__require('8a');
  $__require('8b');
  $__require('8c');
  $__require('8d');
  $__require('8e');
  $__require('90');
  $__require('91');
  $__require('92');
  $__require('99');
  $__require('9a');
  $__require('9d');
  $__require('9f');
  $__require('a1');
  $__require('a3');
  $__require('a4');
  $__require('a5');
  $__require('a6');
  $__require('a7');
  $__require('a9');
  $__require('aa');
  $__require('ac');
  $__require('ad');
  $__require('b0');
  $__require('b2');
  $__require('b3');
  $__require('b4');
  $__require('d7');
  $__require('b6');
  $__require('b8');
  $__require('b9');
  $__require('ba');
  $__require('bc');
  $__require('bd');
  $__require('be');
  $__require('bf');
  $__require('116');
  $__require('10e');
  $__require('11a');
  $__require('c7');
  $__require('ca');
  $__require('cd');
  $__require('ce');
  $__require('d0');
  $__require('d1');
  $__require('d2');
  $__require('d3');
  $__require('d4');
  $__require('d5');
  $__require('d6');
  $__require('d9');
  $__require('da');
  $__require('dc');
  $__require('dd');
  $__require('de');
  $__require('df');
  $__require('e1');
  $__require('e2');
  $__require('e3');
  $__require('e4');
  $__require('e5');
  $__require('e6');
  $__require('e8');
  $__require('e9');
  $__require('ea');
  $__require('eb');
  $__require('ec');
  $__require('ed');
  $__require('ef');
  $__require('f0');
  $__require('f1');
  $__require('f2');
  $__require('f3');
  $__require('f4');
  $__require('f7');
  $__require('f8');
  $__require('fa');
  $__require('fb');
  $__require('fd');
  $__require('fe');
  $__require('ff');
  $__require('100');
  $__require('103');
  $__require('104');
  $__require('105');
  $__require('106');
  $__require('107');
  $__require('108');
  $__require('109');
  $__require('10a');
  $__require('10c');
  $__require('10d');
  $__require('110');
  $__require('111');
  $__require('112');
  $__require('113');
  $__require('114');
  $__require('11b');
  $__require('11c');
  $__require('11d');
  $__require('120');
  $__require('122');
  $__require('124');
  module.exports = $__require('32');
  return module.exports;
});
$__System.registerDynamic("126", ["c6"], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  (function (process) {
    !function (global) {
      "use strict";

      var hasOwn = Object.prototype.hasOwnProperty;
      var undefined;
      var $Symbol = typeof Symbol === "function" ? Symbol : {};
      var iteratorSymbol = $Symbol.iterator || "@@iterator";
      var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";
      var inModule = typeof module === "object";
      var runtime = global.regeneratorRuntime;
      if (runtime) {
        if (inModule) {
          module.exports = runtime;
        }
        return;
      }
      runtime = global.regeneratorRuntime = inModule ? module.exports : {};
      function wrap(innerFn, outerFn, self, tryLocsList) {
        var generator = Object.create((outerFn || Generator).prototype);
        var context = new Context(tryLocsList || []);
        generator._invoke = makeInvokeMethod(innerFn, self, context);
        return generator;
      }
      runtime.wrap = wrap;
      function tryCatch(fn, obj, arg) {
        try {
          return {
            type: "normal",
            arg: fn.call(obj, arg)
          };
        } catch (err) {
          return {
            type: "throw",
            arg: err
          };
        }
      }
      var GenStateSuspendedStart = "suspendedStart";
      var GenStateSuspendedYield = "suspendedYield";
      var GenStateExecuting = "executing";
      var GenStateCompleted = "completed";
      var ContinueSentinel = {};
      function Generator() {}
      function GeneratorFunction() {}
      function GeneratorFunctionPrototype() {}
      var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype;
      GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
      GeneratorFunctionPrototype.constructor = GeneratorFunction;
      GeneratorFunctionPrototype[toStringTagSymbol] = GeneratorFunction.displayName = "GeneratorFunction";
      function defineIteratorMethods(prototype) {
        ["next", "throw", "return"].forEach(function (method) {
          prototype[method] = function (arg) {
            return this._invoke(method, arg);
          };
        });
      }
      runtime.isGeneratorFunction = function (genFun) {
        var ctor = typeof genFun === "function" && genFun.constructor;
        return ctor ? ctor === GeneratorFunction || (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
      };
      runtime.mark = function (genFun) {
        if (Object.setPrototypeOf) {
          Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
        } else {
          genFun.__proto__ = GeneratorFunctionPrototype;
          if (!(toStringTagSymbol in genFun)) {
            genFun[toStringTagSymbol] = "GeneratorFunction";
          }
        }
        genFun.prototype = Object.create(Gp);
        return genFun;
      };
      runtime.awrap = function (arg) {
        return new AwaitArgument(arg);
      };
      function AwaitArgument(arg) {
        this.arg = arg;
      }
      function AsyncIterator(generator) {
        function invoke(method, arg, resolve, reject) {
          var record = tryCatch(generator[method], generator, arg);
          if (record.type === "throw") {
            reject(record.arg);
          } else {
            var result = record.arg;
            var value = result.value;
            if (value instanceof AwaitArgument) {
              return Promise.resolve(value.arg).then(function (value) {
                invoke("next", value, resolve, reject);
              }, function (err) {
                invoke("throw", err, resolve, reject);
              });
            }
            return Promise.resolve(value).then(function (unwrapped) {
              result.value = unwrapped;
              resolve(result);
            }, reject);
          }
        }
        if (typeof process === "object" && process.domain) {
          invoke = process.domain.bind(invoke);
        }
        var previousPromise;
        function enqueue(method, arg) {
          function callInvokeWithMethodAndArg() {
            return new Promise(function (resolve, reject) {
              invoke(method, arg, resolve, reject);
            });
          }
          return previousPromise = previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
        }
        this._invoke = enqueue;
      }
      defineIteratorMethods(AsyncIterator.prototype);
      runtime.async = function (innerFn, outerFn, self, tryLocsList) {
        var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList));
        return runtime.isGeneratorFunction(outerFn) ? iter : iter.next().then(function (result) {
          return result.done ? result.value : iter.next();
        });
      };
      function makeInvokeMethod(innerFn, self, context) {
        var state = GenStateSuspendedStart;
        return function invoke(method, arg) {
          if (state === GenStateExecuting) {
            throw new Error("Generator is already running");
          }
          if (state === GenStateCompleted) {
            if (method === "throw") {
              throw arg;
            }
            return doneResult();
          }
          while (true) {
            var delegate = context.delegate;
            if (delegate) {
              if (method === "return" || method === "throw" && delegate.iterator[method] === undefined) {
                context.delegate = null;
                var returnMethod = delegate.iterator["return"];
                if (returnMethod) {
                  var record = tryCatch(returnMethod, delegate.iterator, arg);
                  if (record.type === "throw") {
                    method = "throw";
                    arg = record.arg;
                    continue;
                  }
                }
                if (method === "return") {
                  continue;
                }
              }
              var record = tryCatch(delegate.iterator[method], delegate.iterator, arg);
              if (record.type === "throw") {
                context.delegate = null;
                method = "throw";
                arg = record.arg;
                continue;
              }
              method = "next";
              arg = undefined;
              var info = record.arg;
              if (info.done) {
                context[delegate.resultName] = info.value;
                context.next = delegate.nextLoc;
              } else {
                state = GenStateSuspendedYield;
                return info;
              }
              context.delegate = null;
            }
            if (method === "next") {
              context.sent = context._sent = arg;
            } else if (method === "throw") {
              if (state === GenStateSuspendedStart) {
                state = GenStateCompleted;
                throw arg;
              }
              if (context.dispatchException(arg)) {
                method = "next";
                arg = undefined;
              }
            } else if (method === "return") {
              context.abrupt("return", arg);
            }
            state = GenStateExecuting;
            var record = tryCatch(innerFn, self, context);
            if (record.type === "normal") {
              state = context.done ? GenStateCompleted : GenStateSuspendedYield;
              var info = {
                value: record.arg,
                done: context.done
              };
              if (record.arg === ContinueSentinel) {
                if (context.delegate && method === "next") {
                  arg = undefined;
                }
              } else {
                return info;
              }
            } else if (record.type === "throw") {
              state = GenStateCompleted;
              method = "throw";
              arg = record.arg;
            }
          }
        };
      }
      defineIteratorMethods(Gp);
      Gp[iteratorSymbol] = function () {
        return this;
      };
      Gp[toStringTagSymbol] = "Generator";
      Gp.toString = function () {
        return "[object Generator]";
      };
      function pushTryEntry(locs) {
        var entry = { tryLoc: locs[0] };
        if (1 in locs) {
          entry.catchLoc = locs[1];
        }
        if (2 in locs) {
          entry.finallyLoc = locs[2];
          entry.afterLoc = locs[3];
        }
        this.tryEntries.push(entry);
      }
      function resetTryEntry(entry) {
        var record = entry.completion || {};
        record.type = "normal";
        delete record.arg;
        entry.completion = record;
      }
      function Context(tryLocsList) {
        this.tryEntries = [{ tryLoc: "root" }];
        tryLocsList.forEach(pushTryEntry, this);
        this.reset(true);
      }
      runtime.keys = function (object) {
        var keys = [];
        for (var key in object) {
          keys.push(key);
        }
        keys.reverse();
        return function next() {
          while (keys.length) {
            var key = keys.pop();
            if (key in object) {
              next.value = key;
              next.done = false;
              return next;
            }
          }
          next.done = true;
          return next;
        };
      };
      function values(iterable) {
        if (iterable) {
          var iteratorMethod = iterable[iteratorSymbol];
          if (iteratorMethod) {
            return iteratorMethod.call(iterable);
          }
          if (typeof iterable.next === "function") {
            return iterable;
          }
          if (!isNaN(iterable.length)) {
            var i = -1,
                next = function next() {
              while (++i < iterable.length) {
                if (hasOwn.call(iterable, i)) {
                  next.value = iterable[i];
                  next.done = false;
                  return next;
                }
              }
              next.value = undefined;
              next.done = true;
              return next;
            };
            return next.next = next;
          }
        }
        return { next: doneResult };
      }
      runtime.values = values;
      function doneResult() {
        return {
          value: undefined,
          done: true
        };
      }
      Context.prototype = {
        constructor: Context,
        reset: function (skipTempReset) {
          this.prev = 0;
          this.next = 0;
          this.sent = this._sent = undefined;
          this.done = false;
          this.delegate = null;
          this.tryEntries.forEach(resetTryEntry);
          if (!skipTempReset) {
            for (var name in this) {
              if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
                this[name] = undefined;
              }
            }
          }
        },
        stop: function () {
          this.done = true;
          var rootEntry = this.tryEntries[0];
          var rootRecord = rootEntry.completion;
          if (rootRecord.type === "throw") {
            throw rootRecord.arg;
          }
          return this.rval;
        },
        dispatchException: function (exception) {
          if (this.done) {
            throw exception;
          }
          var context = this;
          function handle(loc, caught) {
            record.type = "throw";
            record.arg = exception;
            context.next = loc;
            return !!caught;
          }
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            var record = entry.completion;
            if (entry.tryLoc === "root") {
              return handle("end");
            }
            if (entry.tryLoc <= this.prev) {
              var hasCatch = hasOwn.call(entry, "catchLoc");
              var hasFinally = hasOwn.call(entry, "finallyLoc");
              if (hasCatch && hasFinally) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                } else if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }
              } else if (hasCatch) {
                if (this.prev < entry.catchLoc) {
                  return handle(entry.catchLoc, true);
                }
              } else if (hasFinally) {
                if (this.prev < entry.finallyLoc) {
                  return handle(entry.finallyLoc);
                }
              } else {
                throw new Error("try statement without catch or finally");
              }
            }
          }
        },
        abrupt: function (type, arg) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
              var finallyEntry = entry;
              break;
            }
          }
          if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
            finallyEntry = null;
          }
          var record = finallyEntry ? finallyEntry.completion : {};
          record.type = type;
          record.arg = arg;
          if (finallyEntry) {
            this.next = finallyEntry.finallyLoc;
          } else {
            this.complete(record);
          }
          return ContinueSentinel;
        },
        complete: function (record, afterLoc) {
          if (record.type === "throw") {
            throw record.arg;
          }
          if (record.type === "break" || record.type === "continue") {
            this.next = record.arg;
          } else if (record.type === "return") {
            this.rval = record.arg;
            this.next = "end";
          } else if (record.type === "normal" && afterLoc) {
            this.next = afterLoc;
          }
        },
        finish: function (finallyLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.finallyLoc === finallyLoc) {
              this.complete(entry.completion, entry.afterLoc);
              resetTryEntry(entry);
              return ContinueSentinel;
            }
          }
        },
        "catch": function (tryLoc) {
          for (var i = this.tryEntries.length - 1; i >= 0; --i) {
            var entry = this.tryEntries[i];
            if (entry.tryLoc === tryLoc) {
              var record = entry.completion;
              if (record.type === "throw") {
                var thrown = record.arg;
                resetTryEntry(entry);
              }
              return thrown;
            }
          }
          throw new Error("illegal catch attempt");
        },
        delegateYield: function (iterable, resultName, nextLoc) {
          this.delegate = {
            iterator: values(iterable),
            resultName: resultName,
            nextLoc: nextLoc
          };
          return ContinueSentinel;
        }
      };
    }(typeof global === "object" ? global : typeof window === "object" ? window : typeof self === "object" ? self : this);
  })($__require("c6"));
  return module.exports;
});
$__System.registerDynamic('17', ['2d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d');
  module.exports = function (it) {
    if (!isObject(it)) throw TypeError(it + ' is not an object!');
    return it;
  };
  return module.exports;
});
$__System.registerDynamic('9', [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  // https://github.com/zloirock/core-js/issues/86#issuecomment-115759028
  var global = module.exports = typeof window != 'undefined' && window.Math == Math ? window : typeof self != 'undefined' && self.Math == Math ? self : Function('return this')();
  if (typeof __g == 'number') __g = global; // eslint-disable-line no-undef

  return module.exports;
});
$__System.registerDynamic('121', ['2d', '9'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var isObject = $__require('2d'),
        document = $__require('9').document,
        is = isObject(document) && isObject(document.createElement);
    module.exports = function (it) {
        return is ? document.createElement(it) : {};
    };
    return module.exports;
});
$__System.registerDynamic('119', ['b', 'f', '121'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = !$__require('b') && !$__require('f')(function () {
    return Object.defineProperty($__require('121')('div'), 'a', { get: function () {
        return 7;
      } }).a != 7;
  });
  return module.exports;
});
$__System.registerDynamic('2d', [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = function (it) {
    return typeof it === 'object' ? it !== null : typeof it === 'function';
  };
  return module.exports;
});
$__System.registerDynamic('18', ['2d'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var isObject = $__require('2d');
  module.exports = function (it, S) {
    if (!isObject(it)) return it;
    var fn, val;
    if (S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
    if (typeof (fn = it.valueOf) == 'function' && !isObject(val = fn.call(it))) return val;
    if (!S && typeof (fn = it.toString) == 'function' && !isObject(val = fn.call(it))) return val;
    throw TypeError("Can't convert object to primitive value");
  };
  return module.exports;
});
$__System.registerDynamic('1d', ['17', '119', '18', 'b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var anObject = $__require('17'),
      IE8_DOM_DEFINE = $__require('119'),
      toPrimitive = $__require('18'),
      dP = Object.defineProperty;
  exports.f = $__require('b') ? Object.defineProperty : function defineProperty(O, P, Attributes) {
    anObject(O);
    P = toPrimitive(P, true);
    anObject(Attributes);
    if (IE8_DOM_DEFINE) try {
      return dP(O, P, Attributes);
    } catch (e) {}
    if ('get' in Attributes || 'set' in Attributes) throw TypeError('Accessors not supported!');
    if ('value' in Attributes) O[P] = Attributes.value;
    return O;
  };
  return module.exports;
});
$__System.registerDynamic("19", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = function (bitmap, value) {
    return {
      enumerable: !(bitmap & 1),
      configurable: !(bitmap & 2),
      writable: !(bitmap & 4),
      value: value
    };
  };
  return module.exports;
});
$__System.registerDynamic("f", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = function (exec) {
    try {
      return !!exec();
    } catch (e) {
      return true;
    }
  };
  return module.exports;
});
$__System.registerDynamic('b', ['f'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = !$__require('f')(function () {
    return Object.defineProperty({}, 'a', { get: function () {
        return 7;
      } }).a != 7;
  });
  return module.exports;
});
$__System.registerDynamic('20', ['1d', '19', 'b'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var dP = $__require('1d'),
      createDesc = $__require('19');
  module.exports = $__require('b') ? function (object, key, value) {
    return dP.f(object, key, createDesc(1, value));
  } : function (object, key, value) {
    object[key] = value;
    return object;
  };
  return module.exports;
});
$__System.registerDynamic("a", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var hasOwnProperty = {}.hasOwnProperty;
  module.exports = function (it, key) {
    return hasOwnProperty.call(it, key);
  };
  return module.exports;
});
$__System.registerDynamic('12', [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var id = 0,
      px = Math.random();
  module.exports = function (key) {
    return 'Symbol('.concat(key === undefined ? '' : key, ')_', (++id + px).toString(36));
  };
  return module.exports;
});
$__System.registerDynamic('d', ['9', '20', 'a', '12', '32'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var global = $__require('9'),
      hide = $__require('20'),
      has = $__require('a'),
      SRC = $__require('12')('src'),
      TO_STRING = 'toString',
      $toString = Function[TO_STRING],
      TPL = ('' + $toString).split(TO_STRING);
  $__require('32').inspectSource = function (it) {
    return $toString.call(it);
  };
  (module.exports = function (O, key, val, safe) {
    var isFunction = typeof val == 'function';
    if (isFunction) has(val, 'name') || hide(val, 'name', key);
    if (O[key] === val) return;
    if (isFunction) has(val, SRC) || hide(val, SRC, O[key] ? '' + O[key] : TPL.join(String(key)));
    if (O === global) {
      O[key] = val;
    } else {
      if (!safe) {
        delete O[key];
        hide(O, key, val);
      } else {
        if (O[key]) O[key] = val;else hide(O, key, val);
      }
    }
  })(Function.prototype, TO_STRING, function toString() {
    return typeof this == 'function' && this[SRC] || $toString.call(this);
  });
  return module.exports;
});
$__System.registerDynamic('a0', [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = function (it) {
    if (typeof it != 'function') throw TypeError(it + ' is not a function!');
    return it;
  };
  return module.exports;
});
$__System.registerDynamic('93', ['a0'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var aFunction = $__require('a0');
  module.exports = function (fn, that, length) {
    aFunction(fn);
    if (that === undefined) return fn;
    switch (length) {
      case 1:
        return function (a) {
          return fn.call(that, a);
        };
      case 2:
        return function (a, b) {
          return fn.call(that, a, b);
        };
      case 3:
        return function (a, b, c) {
          return fn.call(that, a, b, c);
        };
    }
    return function () {
      return fn.apply(that, arguments);
    };
  };
  return module.exports;
});
$__System.registerDynamic('c', ['9', '32', '20', 'd', '93'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var global = $__require('9'),
      core = $__require('32'),
      hide = $__require('20'),
      redefine = $__require('d'),
      ctx = $__require('93'),
      PROTOTYPE = 'prototype';
  var $export = function (type, name, source) {
    var IS_FORCED = type & $export.F,
        IS_GLOBAL = type & $export.G,
        IS_STATIC = type & $export.S,
        IS_PROTO = type & $export.P,
        IS_BIND = type & $export.B,
        target = IS_GLOBAL ? global : IS_STATIC ? global[name] || (global[name] = {}) : (global[name] || {})[PROTOTYPE],
        exports = IS_GLOBAL ? core : core[name] || (core[name] = {}),
        expProto = exports[PROTOTYPE] || (exports[PROTOTYPE] = {}),
        key,
        own,
        out,
        exp;
    if (IS_GLOBAL) source = name;
    for (key in source) {
      own = !IS_FORCED && target && target[key] !== undefined;
      out = (own ? target : source)[key];
      exp = IS_BIND && own ? ctx(out, global) : IS_PROTO && typeof out == 'function' ? ctx(Function.call, out) : out;
      if (target) redefine(target, key, out, type & $export.U);
      if (exports[key] != out) hide(exports, key, exp);
      if (IS_PROTO && expProto[key] != out) expProto[key] = out;
    }
  };
  global.core = core;
  $export.F = 1;
  $export.G = 2;
  $export.S = 4;
  $export.P = 8;
  $export.B = 16;
  $export.W = 32;
  $export.U = 64;
  $export.R = 128;
  module.exports = $export;
  return module.exports;
});
$__System.registerDynamic("127", [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  module.exports = function (regExp, replace) {
    var replacer = replace === Object(replace) ? function (part) {
      return replace[part];
    } : replace;
    return function (it) {
      return String(it).replace(regExp, replacer);
    };
  };
  return module.exports;
});
$__System.registerDynamic('128', ['c', '127'], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    /* */
    var $export = $__require('c'),
        $re = $__require('127')(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    $export($export.S, 'RegExp', { escape: function escape(it) {
            return $re(it);
        } });
    return module.exports;
});
$__System.registerDynamic('32', [], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  var core = module.exports = { version: '2.4.0' };
  if (typeof __e == 'number') __e = core; // eslint-disable-line no-undef

  return module.exports;
});
$__System.registerDynamic('129', ['128', '32'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  /* */
  $__require('128');
  module.exports = $__require('32').RegExp.escape;
  return module.exports;
});
$__System.registerDynamic("12a", ["125", "126", "129"], true, function ($__require, exports, module) {
  /* */
  "use strict";

  var define,
      global = this || self,
      GLOBAL = global;
  $__require("125");

  $__require("126");

  $__require("129");

  if (global._babelPolyfill) {
    throw new Error("only one instance of babel-polyfill is allowed");
  }
  global._babelPolyfill = true;

  var DEFINE_PROPERTY = "defineProperty";
  function define(O, key, value) {
    O[key] || Object[DEFINE_PROPERTY](O, key, {
      writable: true,
      configurable: true,
      value: value
    });
  }

  define(String.prototype, "padLeft", "".padStart);
  define(String.prototype, "padRight", "".padEnd);

  "pop,reverse,shift,keys,values,entries,indexOf,every,some,forEach,map,filter,find,findIndex,includes,join,slice,concat,push,splice,unshift,sort,lastIndexOf,reduce,reduceRight,copyWithin,fill".split(",").forEach(function (key) {
    [][key] && define(Array, key, Function.call.bind([][key]));
  });
  return module.exports;
});
$__System.registerDynamic("12b", ["12a"], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  module.exports = $__require("12a");
  return module.exports;
});
$__System.registerDynamic('12c', ['12d'], true, function ($__require, exports, module) {
  /* */
  "format cjs";
  /**
   * Timeago is a jQuery plugin that makes it easy to support automatically
   * updating fuzzy timestamps (e.g. "4 minutes ago" or "about 1 day ago").
   *
   * @name timeago
   * @version 1.5.3
   * @requires jQuery v1.2.3+
   * @author Ryan McGeary
   * @license MIT License - http://www.opensource.org/licenses/mit-license.php
   *
   * For usage and examples, visit:
   * http://timeago.yarp.com/
   *
   * Copyright (c) 2008-2015, Ryan McGeary (ryan -[at]- mcgeary [*dot*] org)
   */

  var define,
      global = this || self,
      GLOBAL = global;
  (function (factory) {
    if (typeof define === 'function' && define.amd) {
      // AMD. Register as an anonymous module.
      define(['jquery'], factory);
    } else if (typeof module === 'object' && typeof module.exports === 'object') {
      factory($__require('12d'));
    } else {
      // Browser globals
      factory(jQuery);
    }
  })(function ($) {
    $.timeago = function (timestamp) {
      if (timestamp instanceof Date) {
        return inWords(timestamp);
      } else if (typeof timestamp === "string") {
        return inWords($.timeago.parse(timestamp));
      } else if (typeof timestamp === "number") {
        return inWords(new Date(timestamp));
      } else {
        return inWords($.timeago.datetime(timestamp));
      }
    };
    var $t = $.timeago;

    $.extend($.timeago, {
      settings: {
        refreshMillis: 60000,
        allowPast: true,
        allowFuture: false,
        localeTitle: false,
        cutoff: 0,
        autoDispose: true,
        strings: {
          prefixAgo: null,
          prefixFromNow: null,
          suffixAgo: "ago",
          suffixFromNow: "from now",
          inPast: 'any moment now',
          seconds: "less than a minute",
          minute: "about a minute",
          minutes: "%d minutes",
          hour: "about an hour",
          hours: "about %d hours",
          day: "a day",
          days: "%d days",
          month: "about a month",
          months: "%d months",
          year: "about a year",
          years: "%d years",
          wordSeparator: " ",
          numbers: []
        }
      },

      inWords: function (distanceMillis) {
        if (!this.settings.allowPast && !this.settings.allowFuture) {
          throw 'timeago allowPast and allowFuture settings can not both be set to false.';
        }

        var $l = this.settings.strings;
        var prefix = $l.prefixAgo;
        var suffix = $l.suffixAgo;
        if (this.settings.allowFuture) {
          if (distanceMillis < 0) {
            prefix = $l.prefixFromNow;
            suffix = $l.suffixFromNow;
          }
        }

        if (!this.settings.allowPast && distanceMillis >= 0) {
          return this.settings.strings.inPast;
        }

        var seconds = Math.abs(distanceMillis) / 1000;
        var minutes = seconds / 60;
        var hours = minutes / 60;
        var days = hours / 24;
        var years = days / 365;

        function substitute(stringOrFunction, number) {
          var string = $.isFunction(stringOrFunction) ? stringOrFunction(number, distanceMillis) : stringOrFunction;
          var value = $l.numbers && $l.numbers[number] || number;
          return string.replace(/%d/i, value);
        }

        var words = seconds < 45 && substitute($l.seconds, Math.round(seconds)) || seconds < 90 && substitute($l.minute, 1) || minutes < 45 && substitute($l.minutes, Math.round(minutes)) || minutes < 90 && substitute($l.hour, 1) || hours < 24 && substitute($l.hours, Math.round(hours)) || hours < 42 && substitute($l.day, 1) || days < 30 && substitute($l.days, Math.round(days)) || days < 45 && substitute($l.month, 1) || days < 365 && substitute($l.months, Math.round(days / 30)) || years < 1.5 && substitute($l.year, 1) || substitute($l.years, Math.round(years));

        var separator = $l.wordSeparator || "";
        if ($l.wordSeparator === undefined) {
          separator = " ";
        }
        return $.trim([prefix, words, suffix].join(separator));
      },

      parse: function (iso8601) {
        var s = $.trim(iso8601);
        s = s.replace(/\.\d+/, ""); // remove milliseconds
        s = s.replace(/-/, "/").replace(/-/, "/");
        s = s.replace(/T/, " ").replace(/Z/, " UTC");
        s = s.replace(/([\+\-]\d\d)\:?(\d\d)/, " $1$2"); // -04:00 -> -0400
        s = s.replace(/([\+\-]\d\d)$/, " $100"); // +09 -> +0900
        return new Date(s);
      },
      datetime: function (elem) {
        var iso8601 = $t.isTime(elem) ? $(elem).attr("datetime") : $(elem).attr("title");
        return $t.parse(iso8601);
      },
      isTime: function (elem) {
        // jQuery's `is()` doesn't play well with HTML5 in IE
        return $(elem).get(0).tagName.toLowerCase() === "time"; // $(elem).is("time");
      }
    });

    // functions that can be called via $(el).timeago('action')
    // init is default when no action is given
    // functions are called with context of a single element
    var functions = {
      init: function () {
        var refresh_el = $.proxy(refresh, this);
        refresh_el();
        var $s = $t.settings;
        if ($s.refreshMillis > 0) {
          this._timeagoInterval = setInterval(refresh_el, $s.refreshMillis);
        }
      },
      update: function (timestamp) {
        var date = timestamp instanceof Date ? timestamp : $t.parse(timestamp);
        $(this).data('timeago', { datetime: date });
        if ($t.settings.localeTitle) $(this).attr("title", date.toLocaleString());
        refresh.apply(this);
      },
      updateFromDOM: function () {
        $(this).data('timeago', { datetime: $t.parse($t.isTime(this) ? $(this).attr("datetime") : $(this).attr("title")) });
        refresh.apply(this);
      },
      dispose: function () {
        if (this._timeagoInterval) {
          window.clearInterval(this._timeagoInterval);
          this._timeagoInterval = null;
        }
      }
    };

    $.fn.timeago = function (action, options) {
      var fn = action ? functions[action] : functions.init;
      if (!fn) {
        throw new Error("Unknown function name '" + action + "' for timeago");
      }
      // each over objects here and call the requested function
      this.each(function () {
        fn.call(this, options);
      });
      return this;
    };

    function refresh() {
      var $s = $t.settings;

      //check if it's still visible
      if ($s.autoDispose && !$.contains(document.documentElement, this)) {
        //stop if it has been removed
        $(this).timeago("dispose");
        return this;
      }

      var data = prepareData(this);

      if (!isNaN(data.datetime)) {
        if ($s.cutoff == 0 || Math.abs(distance(data.datetime)) < $s.cutoff) {
          $(this).text(inWords(data.datetime));
        } else {
          if ($(this).attr('title').length > 0) {
            $(this).text($(this).attr('title'));
          }
        }
      }
      return this;
    }

    function prepareData(element) {
      element = $(element);
      if (!element.data("timeago")) {
        element.data("timeago", { datetime: $t.datetime(element) });
        var text = $.trim(element.text());
        if ($t.settings.localeTitle) {
          element.attr("title", element.data('timeago').datetime.toLocaleString());
        } else if (text.length > 0 && !($t.isTime(element) && element.attr("title"))) {
          element.attr("title", text);
        }
      }
      return element.data("timeago");
    }

    function inWords(date) {
      return $t.inWords(distance(date));
    }

    function distance(date) {
      return new Date().getTime() - date.getTime();
    }

    // fix for IE6 suckage
    document.createElement("abbr");
    document.createElement("time");
  });
  return module.exports;
});
$__System.registerDynamic("12e", ["12c"], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  module.exports = $__require("12c");
  return module.exports;
});
$__System.registerDynamic('12f', [], true, function ($__require, exports, module) {
  /* */
  "format cjs";

  var define,
      global = this || self,
      GLOBAL = global;
  var DateFormat = {};

  (function ($) {
    var daysInWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    var shortDaysInWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var shortMonthsInYear = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var longMonthsInYear = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    var shortMonthsToNumber = { 'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05', 'Jun': '06',
      'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12' };

    var YYYYMMDD_MATCHER = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.?\d{0,3}[Z\-+]?(\d{2}:?\d{2})?/;

    $.format = function () {
      function numberToLongDay(value) {
        // 0 to Sunday
        // 1 to Monday
        return daysInWeek[parseInt(value, 10)] || value;
      }

      function numberToShortDay(value) {
        // 0 to Sun
        // 1 to Mon
        return shortDaysInWeek[parseInt(value, 10)] || value;
      }

      function numberToShortMonth(value) {
        // 1 to Jan
        // 2 to Feb
        var monthArrayIndex = parseInt(value, 10) - 1;
        return shortMonthsInYear[monthArrayIndex] || value;
      }

      function numberToLongMonth(value) {
        // 1 to January
        // 2 to February
        var monthArrayIndex = parseInt(value, 10) - 1;
        return longMonthsInYear[monthArrayIndex] || value;
      }

      function shortMonthToNumber(value) {
        // Jan to 01
        // Feb to 02
        return shortMonthsToNumber[value] || value;
      }

      function parseTime(value) {
        // 10:54:50.546
        // => hour: 10, minute: 54, second: 50, millis: 546
        // 10:54:50
        // => hour: 10, minute: 54, second: 50, millis: ''
        var time = value,
            hour,
            minute,
            second,
            millis = '',
            delimited,
            timeArray;

        if (time.indexOf('.') !== -1) {
          delimited = time.split('.');
          // split time and milliseconds
          time = delimited[0];
          millis = delimited[delimited.length - 1];
        }

        timeArray = time.split(':');

        if (timeArray.length === 3) {
          hour = timeArray[0];
          minute = timeArray[1];
          // '20 GMT-0200 (BRST)'.replace(/\s.+/, '').replace(/[a-z]/gi, '');
          // => 20
          // '20Z'.replace(/\s.+/, '').replace(/[a-z]/gi, '');
          // => 20
          second = timeArray[2].replace(/\s.+/, '').replace(/[a-z]/gi, '');
          // '01:10:20 GMT-0200 (BRST)'.replace(/\s.+/, '').replace(/[a-z]/gi, '');
          // => 01:10:20
          // '01:10:20Z'.replace(/\s.+/, '').replace(/[a-z]/gi, '');
          // => 01:10:20
          time = time.replace(/\s.+/, '').replace(/[a-z]/gi, '');
          return {
            time: time,
            hour: hour,
            minute: minute,
            second: second,
            millis: millis
          };
        }

        return { time: '', hour: '', minute: '', second: '', millis: '' };
      }

      function padding(value, length) {
        var paddingCount = length - String(value).length;
        for (var i = 0; i < paddingCount; i++) {
          value = '0' + value;
        }
        return value;
      }

      return {

        parseDate: function (value) {
          var values, subValues;

          var parsedDate = {
            date: null,
            year: null,
            month: null,
            dayOfMonth: null,
            dayOfWeek: null,
            time: null
          };

          if (typeof value == 'number') {
            return this.parseDate(new Date(value));
          } else if (typeof value.getFullYear == 'function') {
            parsedDate.year = String(value.getFullYear());
            // d = new Date(1900, 1, 1) // 1 for Feb instead of Jan.
            // => Thu Feb 01 1900 00:00:00
            parsedDate.month = String(value.getMonth() + 1);
            parsedDate.dayOfMonth = String(value.getDate());
            parsedDate.time = parseTime(value.toTimeString() + "." + value.getMilliseconds());
          } else if (value.search(YYYYMMDD_MATCHER) != -1) {
            /* 2009-04-19T16:11:05+02:00 || 2009-04-19T16:11:05Z */
            values = value.split(/[T\+-]/);
            parsedDate.year = values[0];
            parsedDate.month = values[1];
            parsedDate.dayOfMonth = values[2];
            parsedDate.time = parseTime(values[3].split('.')[0]);
          } else {
            values = value.split(' ');
            if (values.length === 6 && isNaN(values[5])) {
              // values[5] == year
              /*
               * This change is necessary to make `Mon Apr 28 2014 05:30:00 GMT-0300` work
               * like `case 7`
               * otherwise it will be considered like `Wed Jan 13 10:43:41 CET 2010
               * Fixes: https://github.com/phstc/jquery-dateFormat/issues/64
               */
              values[values.length] = '()';
            }
            switch (values.length) {
              case 6:
                /* Wed Jan 13 10:43:41 CET 2010 */
                parsedDate.year = values[5];
                parsedDate.month = shortMonthToNumber(values[1]);
                parsedDate.dayOfMonth = values[2];
                parsedDate.time = parseTime(values[3]);
                break;
              case 2:
                /* 2009-12-18 10:54:50.546 */
                subValues = values[0].split('-');
                parsedDate.year = subValues[0];
                parsedDate.month = subValues[1];
                parsedDate.dayOfMonth = subValues[2];
                parsedDate.time = parseTime(values[1]);
                break;
              case 7:
              /* Tue Mar 01 2011 12:01:42 GMT-0800 (PST) */
              case 9:
              /* added by Larry, for Fri Apr 08 2011 00:00:00 GMT+0800 (China Standard Time) */
              case 10:
                /* added by Larry, for Fri Apr 08 2011 00:00:00 GMT+0200 (W. Europe Daylight Time) */
                parsedDate.year = values[3];
                parsedDate.month = shortMonthToNumber(values[1]);
                parsedDate.dayOfMonth = values[2];
                parsedDate.time = parseTime(values[4]);
                break;
              case 1:
                /* added by Jonny, for 2012-02-07CET00:00:00 (Doctrine Entity -> Json Serializer) */
                subValues = values[0].split('');
                parsedDate.year = subValues[0] + subValues[1] + subValues[2] + subValues[3];
                parsedDate.month = subValues[5] + subValues[6];
                parsedDate.dayOfMonth = subValues[8] + subValues[9];
                parsedDate.time = parseTime(subValues[13] + subValues[14] + subValues[15] + subValues[16] + subValues[17] + subValues[18] + subValues[19] + subValues[20]);
                break;
              default:
                return null;
            }
          }

          if (parsedDate.time) {
            parsedDate.date = new Date(parsedDate.year, parsedDate.month - 1, parsedDate.dayOfMonth, parsedDate.time.hour, parsedDate.time.minute, parsedDate.time.second, parsedDate.time.millis);
          } else {
            parsedDate.date = new Date(parsedDate.year, parsedDate.month - 1, parsedDate.dayOfMonth);
          }

          parsedDate.dayOfWeek = String(parsedDate.date.getDay());

          return parsedDate;
        },

        date: function (value, format) {
          try {
            var parsedDate = this.parseDate(value);

            if (parsedDate === null) {
              return value;
            }

            var year = parsedDate.year,
                month = parsedDate.month,
                dayOfMonth = parsedDate.dayOfMonth,
                dayOfWeek = parsedDate.dayOfWeek,
                time = parsedDate.time;
            var hour;

            var pattern = '',
                retValue = '',
                unparsedRest = '',
                inQuote = false;

            /* Issue 1 - variable scope issue in format.date (Thanks jakemonO) */
            for (var i = 0; i < format.length; i++) {
              var currentPattern = format.charAt(i);
              // Look-Ahead Right (LALR)
              var nextRight = format.charAt(i + 1);

              if (inQuote) {
                if (currentPattern == "'") {
                  retValue += pattern === '' ? "'" : pattern;
                  pattern = '';
                  inQuote = false;
                } else {
                  pattern += currentPattern;
                }
                continue;
              }
              pattern += currentPattern;
              unparsedRest = '';
              switch (pattern) {
                case 'ddd':
                  retValue += numberToLongDay(dayOfWeek);
                  pattern = '';
                  break;
                case 'dd':
                  if (nextRight === 'd') {
                    break;
                  }
                  retValue += padding(dayOfMonth, 2);
                  pattern = '';
                  break;
                case 'd':
                  if (nextRight === 'd') {
                    break;
                  }
                  retValue += parseInt(dayOfMonth, 10);
                  pattern = '';
                  break;
                case 'D':
                  if (dayOfMonth == 1 || dayOfMonth == 21 || dayOfMonth == 31) {
                    dayOfMonth = parseInt(dayOfMonth, 10) + 'st';
                  } else if (dayOfMonth == 2 || dayOfMonth == 22) {
                    dayOfMonth = parseInt(dayOfMonth, 10) + 'nd';
                  } else if (dayOfMonth == 3 || dayOfMonth == 23) {
                    dayOfMonth = parseInt(dayOfMonth, 10) + 'rd';
                  } else {
                    dayOfMonth = parseInt(dayOfMonth, 10) + 'th';
                  }
                  retValue += dayOfMonth;
                  pattern = '';
                  break;
                case 'MMMM':
                  retValue += numberToLongMonth(month);
                  pattern = '';
                  break;
                case 'MMM':
                  if (nextRight === 'M') {
                    break;
                  }
                  retValue += numberToShortMonth(month);
                  pattern = '';
                  break;
                case 'MM':
                  if (nextRight === 'M') {
                    break;
                  }
                  retValue += padding(month, 2);
                  pattern = '';
                  break;
                case 'M':
                  if (nextRight === 'M') {
                    break;
                  }
                  retValue += parseInt(month, 10);
                  pattern = '';
                  break;
                case 'y':
                case 'yyy':
                  if (nextRight === 'y') {
                    break;
                  }
                  retValue += pattern;
                  pattern = '';
                  break;
                case 'yy':
                  if (nextRight === 'y') {
                    break;
                  }
                  retValue += String(year).slice(-2);
                  pattern = '';
                  break;
                case 'yyyy':
                  retValue += year;
                  pattern = '';
                  break;
                case 'HH':
                  retValue += padding(time.hour, 2);
                  pattern = '';
                  break;
                case 'H':
                  if (nextRight === 'H') {
                    break;
                  }
                  retValue += parseInt(time.hour, 10);
                  pattern = '';
                  break;
                case 'hh':
                  /* time.hour is '00' as string == is used instead of === */
                  hour = parseInt(time.hour, 10) === 0 ? 12 : time.hour < 13 ? time.hour : time.hour - 12;
                  retValue += padding(hour, 2);
                  pattern = '';
                  break;
                case 'h':
                  if (nextRight === 'h') {
                    break;
                  }
                  hour = parseInt(time.hour, 10) === 0 ? 12 : time.hour < 13 ? time.hour : time.hour - 12;
                  retValue += parseInt(hour, 10);
                  // Fixing issue https://github.com/phstc/jquery-dateFormat/issues/21
                  // retValue = parseInt(retValue, 10);
                  pattern = '';
                  break;
                case 'mm':
                  retValue += padding(time.minute, 2);
                  pattern = '';
                  break;
                case 'm':
                  if (nextRight === 'm') {
                    break;
                  }
                  retValue += time.minute;
                  pattern = '';
                  break;
                case 'ss':
                  /* ensure only seconds are added to the return string */
                  retValue += padding(time.second.substring(0, 2), 2);
                  pattern = '';
                  break;
                case 's':
                  if (nextRight === 's') {
                    break;
                  }
                  retValue += time.second;
                  pattern = '';
                  break;
                case 'S':
                case 'SS':
                  if (nextRight === 'S') {
                    break;
                  }
                  retValue += pattern;
                  pattern = '';
                  break;
                case 'SSS':
                  var sss = '000' + time.millis.substring(0, 3);
                  retValue += sss.substring(sss.length - 3);
                  pattern = '';
                  break;
                case 'a':
                  retValue += time.hour >= 12 ? 'PM' : 'AM';
                  pattern = '';
                  break;
                case 'p':
                  retValue += time.hour >= 12 ? 'p.m.' : 'a.m.';
                  pattern = '';
                  break;
                case 'E':
                  retValue += numberToShortDay(dayOfWeek);
                  pattern = '';
                  break;
                case "'":
                  pattern = '';
                  inQuote = true;
                  break;
                default:
                  retValue += currentPattern;
                  pattern = '';
                  break;
              }
            }
            retValue += unparsedRest;
            return retValue;
          } catch (e) {
            if (console && console.log) {
              console.log(e);
            }
            return value;
          }
        },
        /*
         * JavaScript Pretty Date
         * Copyright (c) 2011 John Resig (ejohn.org)
         * Licensed under the MIT and GPL licenses.
         *
         * Takes an ISO time and returns a string representing how long ago the date
         * represents
         *
         * ('2008-01-28T20:24:17Z') // => '2 hours ago'
         * ('2008-01-27T22:24:17Z') // => 'Yesterday'
         * ('2008-01-26T22:24:17Z') // => '2 days ago'
         * ('2008-01-14T22:24:17Z') // => '2 weeks ago'
         * ('2007-12-15T22:24:17Z') // => 'more than 5 weeks ago'
         *
         */
        prettyDate: function (time) {
          var date;
          var diff;
          var day_diff;

          if (typeof time === 'string' || typeof time === 'number') {
            date = new Date(time);
          }

          if (typeof time === 'object') {
            date = new Date(time.toString());
          }

          diff = (new Date().getTime() - date.getTime()) / 1000;

          day_diff = Math.floor(diff / 86400);

          if (isNaN(day_diff) || day_diff < 0) {
            return;
          }

          if (diff < 60) {
            return 'just now';
          } else if (diff < 120) {
            return '1 minute ago';
          } else if (diff < 3600) {
            return Math.floor(diff / 60) + ' minutes ago';
          } else if (diff < 7200) {
            return '1 hour ago';
          } else if (diff < 86400) {
            return Math.floor(diff / 3600) + ' hours ago';
          } else if (day_diff === 1) {
            return 'Yesterday';
          } else if (day_diff < 7) {
            return day_diff + ' days ago';
          } else if (day_diff < 31) {
            return Math.ceil(day_diff / 7) + ' weeks ago';
          } else if (day_diff >= 31) {
            return 'more than 5 weeks ago';
          }
        },
        toBrowserTimeZone: function (value, format) {
          return this.date(new Date(value), format || 'MM/dd/yyyy HH:mm:ss');
        }
      };
    }();
  })(DateFormat);
  ; // require dateFormat.js
  // please check `dist/jquery.dateFormat.js` for a complete version
  (function ($) {
    $.format = DateFormat.format;
  })(jQuery);
  return module.exports;
});
$__System.registerDynamic("130", ["12f"], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  module.exports = $__require("12f");
  return module.exports;
});
(function() {
var define = $__System.amdDefine;
(function(global, factory) {
  "use strict";
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = global.document ? factory(global, true) : function(w) {
      if (!w.document) {
        throw new Error("jQuery requires a window with a document");
      }
      return factory(w);
    };
  } else {
    factory(global);
  }
})(typeof window !== "undefined" ? window : this, function(window, noGlobal) {
  "use strict";
  var arr = [];
  var document = window.document;
  var getProto = Object.getPrototypeOf;
  var slice = arr.slice;
  var concat = arr.concat;
  var push = arr.push;
  var indexOf = arr.indexOf;
  var class2type = {};
  var toString = class2type.toString;
  var hasOwn = class2type.hasOwnProperty;
  var fnToString = hasOwn.toString;
  var ObjectFunctionString = fnToString.call(Object);
  var support = {};
  function DOMEval(code, doc) {
    doc = doc || document;
    var script = doc.createElement("script");
    script.text = code;
    doc.head.appendChild(script).parentNode.removeChild(script);
  }
  var version = "3.1.1",
      jQuery = function(selector, context) {
        return new jQuery.fn.init(selector, context);
      },
      rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,
      rmsPrefix = /^-ms-/,
      rdashAlpha = /-([a-z])/g,
      fcamelCase = function(all, letter) {
        return letter.toUpperCase();
      };
  jQuery.fn = jQuery.prototype = {
    jquery: version,
    constructor: jQuery,
    length: 0,
    toArray: function() {
      return slice.call(this);
    },
    get: function(num) {
      if (num == null) {
        return slice.call(this);
      }
      return num < 0 ? this[num + this.length] : this[num];
    },
    pushStack: function(elems) {
      var ret = jQuery.merge(this.constructor(), elems);
      ret.prevObject = this;
      return ret;
    },
    each: function(callback) {
      return jQuery.each(this, callback);
    },
    map: function(callback) {
      return this.pushStack(jQuery.map(this, function(elem, i) {
        return callback.call(elem, i, elem);
      }));
    },
    slice: function() {
      return this.pushStack(slice.apply(this, arguments));
    },
    first: function() {
      return this.eq(0);
    },
    last: function() {
      return this.eq(-1);
    },
    eq: function(i) {
      var len = this.length,
          j = +i + (i < 0 ? len : 0);
      return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
    },
    end: function() {
      return this.prevObject || this.constructor();
    },
    push: push,
    sort: arr.sort,
    splice: arr.splice
  };
  jQuery.extend = jQuery.fn.extend = function() {
    var options,
        name,
        src,
        copy,
        copyIsArray,
        clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;
    if (typeof target === "boolean") {
      deep = target;
      target = arguments[i] || {};
      i++;
    }
    if (typeof target !== "object" && !jQuery.isFunction(target)) {
      target = {};
    }
    if (i === length) {
      target = this;
      i--;
    }
    for (; i < length; i++) {
      if ((options = arguments[i]) != null) {
        for (name in options) {
          src = target[name];
          copy = options[name];
          if (target === copy) {
            continue;
          }
          if (deep && copy && (jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)))) {
            if (copyIsArray) {
              copyIsArray = false;
              clone = src && jQuery.isArray(src) ? src : [];
            } else {
              clone = src && jQuery.isPlainObject(src) ? src : {};
            }
            target[name] = jQuery.extend(deep, clone, copy);
          } else if (copy !== undefined) {
            target[name] = copy;
          }
        }
      }
    }
    return target;
  };
  jQuery.extend({
    expando: "jQuery" + (version + Math.random()).replace(/\D/g, ""),
    isReady: true,
    error: function(msg) {
      throw new Error(msg);
    },
    noop: function() {},
    isFunction: function(obj) {
      return jQuery.type(obj) === "function";
    },
    isArray: Array.isArray,
    isWindow: function(obj) {
      return obj != null && obj === obj.window;
    },
    isNumeric: function(obj) {
      var type = jQuery.type(obj);
      return (type === "number" || type === "string") && !isNaN(obj - parseFloat(obj));
    },
    isPlainObject: function(obj) {
      var proto,
          Ctor;
      if (!obj || toString.call(obj) !== "[object Object]") {
        return false;
      }
      proto = getProto(obj);
      if (!proto) {
        return true;
      }
      Ctor = hasOwn.call(proto, "constructor") && proto.constructor;
      return typeof Ctor === "function" && fnToString.call(Ctor) === ObjectFunctionString;
    },
    isEmptyObject: function(obj) {
      var name;
      for (name in obj) {
        return false;
      }
      return true;
    },
    type: function(obj) {
      if (obj == null) {
        return obj + "";
      }
      return typeof obj === "object" || typeof obj === "function" ? class2type[toString.call(obj)] || "object" : typeof obj;
    },
    globalEval: function(code) {
      DOMEval(code);
    },
    camelCase: function(string) {
      return string.replace(rmsPrefix, "ms-").replace(rdashAlpha, fcamelCase);
    },
    nodeName: function(elem, name) {
      return elem.nodeName && elem.nodeName.toLowerCase() === name.toLowerCase();
    },
    each: function(obj, callback) {
      var length,
          i = 0;
      if (isArrayLike(obj)) {
        length = obj.length;
        for (; i < length; i++) {
          if (callback.call(obj[i], i, obj[i]) === false) {
            break;
          }
        }
      } else {
        for (i in obj) {
          if (callback.call(obj[i], i, obj[i]) === false) {
            break;
          }
        }
      }
      return obj;
    },
    trim: function(text) {
      return text == null ? "" : (text + "").replace(rtrim, "");
    },
    makeArray: function(arr, results) {
      var ret = results || [];
      if (arr != null) {
        if (isArrayLike(Object(arr))) {
          jQuery.merge(ret, typeof arr === "string" ? [arr] : arr);
        } else {
          push.call(ret, arr);
        }
      }
      return ret;
    },
    inArray: function(elem, arr, i) {
      return arr == null ? -1 : indexOf.call(arr, elem, i);
    },
    merge: function(first, second) {
      var len = +second.length,
          j = 0,
          i = first.length;
      for (; j < len; j++) {
        first[i++] = second[j];
      }
      first.length = i;
      return first;
    },
    grep: function(elems, callback, invert) {
      var callbackInverse,
          matches = [],
          i = 0,
          length = elems.length,
          callbackExpect = !invert;
      for (; i < length; i++) {
        callbackInverse = !callback(elems[i], i);
        if (callbackInverse !== callbackExpect) {
          matches.push(elems[i]);
        }
      }
      return matches;
    },
    map: function(elems, callback, arg) {
      var length,
          value,
          i = 0,
          ret = [];
      if (isArrayLike(elems)) {
        length = elems.length;
        for (; i < length; i++) {
          value = callback(elems[i], i, arg);
          if (value != null) {
            ret.push(value);
          }
        }
      } else {
        for (i in elems) {
          value = callback(elems[i], i, arg);
          if (value != null) {
            ret.push(value);
          }
        }
      }
      return concat.apply([], ret);
    },
    guid: 1,
    proxy: function(fn, context) {
      var tmp,
          args,
          proxy;
      if (typeof context === "string") {
        tmp = fn[context];
        context = fn;
        fn = tmp;
      }
      if (!jQuery.isFunction(fn)) {
        return undefined;
      }
      args = slice.call(arguments, 2);
      proxy = function() {
        return fn.apply(context || this, args.concat(slice.call(arguments)));
      };
      proxy.guid = fn.guid = fn.guid || jQuery.guid++;
      return proxy;
    },
    now: Date.now,
    support: support
  });
  if (typeof Symbol === "function") {
    jQuery.fn[Symbol.iterator] = arr[Symbol.iterator];
  }
  jQuery.each("Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "), function(i, name) {
    class2type["[object " + name + "]"] = name.toLowerCase();
  });
  function isArrayLike(obj) {
    var length = !!obj && "length" in obj && obj.length,
        type = jQuery.type(obj);
    if (type === "function" || jQuery.isWindow(obj)) {
      return false;
    }
    return type === "array" || length === 0 || typeof length === "number" && length > 0 && (length - 1) in obj;
  }
  var Sizzle = (function(window) {
    var i,
        support,
        Expr,
        getText,
        isXML,
        tokenize,
        compile,
        select,
        outermostContext,
        sortInput,
        hasDuplicate,
        setDocument,
        document,
        docElem,
        documentIsHTML,
        rbuggyQSA,
        rbuggyMatches,
        matches,
        contains,
        expando = "sizzle" + 1 * new Date(),
        preferredDoc = window.document,
        dirruns = 0,
        done = 0,
        classCache = createCache(),
        tokenCache = createCache(),
        compilerCache = createCache(),
        sortOrder = function(a, b) {
          if (a === b) {
            hasDuplicate = true;
          }
          return 0;
        },
        hasOwn = ({}).hasOwnProperty,
        arr = [],
        pop = arr.pop,
        push_native = arr.push,
        push = arr.push,
        slice = arr.slice,
        indexOf = function(list, elem) {
          var i = 0,
              len = list.length;
          for (; i < len; i++) {
            if (list[i] === elem) {
              return i;
            }
          }
          return -1;
        },
        booleans = "checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",
        whitespace = "[\\x20\\t\\r\\n\\f]",
        identifier = "(?:\\\\.|[\\w-]|[^\0-\\xa0])+",
        attributes = "\\[" + whitespace + "*(" + identifier + ")(?:" + whitespace + "*([*^$|!~]?=)" + whitespace + "*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|(" + identifier + "))|)" + whitespace + "*\\]",
        pseudos = ":(" + identifier + ")(?:\\((" + "('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|" + "((?:\\\\.|[^\\\\()[\\]]|" + attributes + ")*)|" + ".*" + ")\\)|)",
        rwhitespace = new RegExp(whitespace + "+", "g"),
        rtrim = new RegExp("^" + whitespace + "+|((?:^|[^\\\\])(?:\\\\.)*)" + whitespace + "+$", "g"),
        rcomma = new RegExp("^" + whitespace + "*," + whitespace + "*"),
        rcombinators = new RegExp("^" + whitespace + "*([>+~]|" + whitespace + ")" + whitespace + "*"),
        rattributeQuotes = new RegExp("=" + whitespace + "*([^\\]'\"]*?)" + whitespace + "*\\]", "g"),
        rpseudo = new RegExp(pseudos),
        ridentifier = new RegExp("^" + identifier + "$"),
        matchExpr = {
          "ID": new RegExp("^#(" + identifier + ")"),
          "CLASS": new RegExp("^\\.(" + identifier + ")"),
          "TAG": new RegExp("^(" + identifier + "|[*])"),
          "ATTR": new RegExp("^" + attributes),
          "PSEUDO": new RegExp("^" + pseudos),
          "CHILD": new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\(" + whitespace + "*(even|odd|(([+-]|)(\\d*)n|)" + whitespace + "*(?:([+-]|)" + whitespace + "*(\\d+)|))" + whitespace + "*\\)|)", "i"),
          "bool": new RegExp("^(?:" + booleans + ")$", "i"),
          "needsContext": new RegExp("^" + whitespace + "*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\(" + whitespace + "*((?:-\\d)?\\d*)" + whitespace + "*\\)|)(?=[^-]|$)", "i")
        },
        rinputs = /^(?:input|select|textarea|button)$/i,
        rheader = /^h\d$/i,
        rnative = /^[^{]+\{\s*\[native \w/,
        rquickExpr = /^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,
        rsibling = /[+~]/,
        runescape = new RegExp("\\\\([\\da-f]{1,6}" + whitespace + "?|(" + whitespace + ")|.)", "ig"),
        funescape = function(_, escaped, escapedWhitespace) {
          var high = "0x" + escaped - 0x10000;
          return high !== high || escapedWhitespace ? escaped : high < 0 ? String.fromCharCode(high + 0x10000) : String.fromCharCode(high >> 10 | 0xD800, high & 0x3FF | 0xDC00);
        },
        rcssescape = /([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,
        fcssescape = function(ch, asCodePoint) {
          if (asCodePoint) {
            if (ch === "\0") {
              return "\uFFFD";
            }
            return ch.slice(0, -1) + "\\" + ch.charCodeAt(ch.length - 1).toString(16) + " ";
          }
          return "\\" + ch;
        },
        unloadHandler = function() {
          setDocument();
        },
        disabledAncestor = addCombinator(function(elem) {
          return elem.disabled === true && ("form" in elem || "label" in elem);
        }, {
          dir: "parentNode",
          next: "legend"
        });
    try {
      push.apply((arr = slice.call(preferredDoc.childNodes)), preferredDoc.childNodes);
      arr[preferredDoc.childNodes.length].nodeType;
    } catch (e) {
      push = {apply: arr.length ? function(target, els) {
          push_native.apply(target, slice.call(els));
        } : function(target, els) {
          var j = target.length,
              i = 0;
          while ((target[j++] = els[i++])) {}
          target.length = j - 1;
        }};
    }
    function Sizzle(selector, context, results, seed) {
      var m,
          i,
          elem,
          nid,
          match,
          groups,
          newSelector,
          newContext = context && context.ownerDocument,
          nodeType = context ? context.nodeType : 9;
      results = results || [];
      if (typeof selector !== "string" || !selector || nodeType !== 1 && nodeType !== 9 && nodeType !== 11) {
        return results;
      }
      if (!seed) {
        if ((context ? context.ownerDocument || context : preferredDoc) !== document) {
          setDocument(context);
        }
        context = context || document;
        if (documentIsHTML) {
          if (nodeType !== 11 && (match = rquickExpr.exec(selector))) {
            if ((m = match[1])) {
              if (nodeType === 9) {
                if ((elem = context.getElementById(m))) {
                  if (elem.id === m) {
                    results.push(elem);
                    return results;
                  }
                } else {
                  return results;
                }
              } else {
                if (newContext && (elem = newContext.getElementById(m)) && contains(context, elem) && elem.id === m) {
                  results.push(elem);
                  return results;
                }
              }
            } else if (match[2]) {
              push.apply(results, context.getElementsByTagName(selector));
              return results;
            } else if ((m = match[3]) && support.getElementsByClassName && context.getElementsByClassName) {
              push.apply(results, context.getElementsByClassName(m));
              return results;
            }
          }
          if (support.qsa && !compilerCache[selector + " "] && (!rbuggyQSA || !rbuggyQSA.test(selector))) {
            if (nodeType !== 1) {
              newContext = context;
              newSelector = selector;
            } else if (context.nodeName.toLowerCase() !== "object") {
              if ((nid = context.getAttribute("id"))) {
                nid = nid.replace(rcssescape, fcssescape);
              } else {
                context.setAttribute("id", (nid = expando));
              }
              groups = tokenize(selector);
              i = groups.length;
              while (i--) {
                groups[i] = "#" + nid + " " + toSelector(groups[i]);
              }
              newSelector = groups.join(",");
              newContext = rsibling.test(selector) && testContext(context.parentNode) || context;
            }
            if (newSelector) {
              try {
                push.apply(results, newContext.querySelectorAll(newSelector));
                return results;
              } catch (qsaError) {} finally {
                if (nid === expando) {
                  context.removeAttribute("id");
                }
              }
            }
          }
        }
      }
      return select(selector.replace(rtrim, "$1"), context, results, seed);
    }
    function createCache() {
      var keys = [];
      function cache(key, value) {
        if (keys.push(key + " ") > Expr.cacheLength) {
          delete cache[keys.shift()];
        }
        return (cache[key + " "] = value);
      }
      return cache;
    }
    function markFunction(fn) {
      fn[expando] = true;
      return fn;
    }
    function assert(fn) {
      var el = document.createElement("fieldset");
      try {
        return !!fn(el);
      } catch (e) {
        return false;
      } finally {
        if (el.parentNode) {
          el.parentNode.removeChild(el);
        }
        el = null;
      }
    }
    function addHandle(attrs, handler) {
      var arr = attrs.split("|"),
          i = arr.length;
      while (i--) {
        Expr.attrHandle[arr[i]] = handler;
      }
    }
    function siblingCheck(a, b) {
      var cur = b && a,
          diff = cur && a.nodeType === 1 && b.nodeType === 1 && a.sourceIndex - b.sourceIndex;
      if (diff) {
        return diff;
      }
      if (cur) {
        while ((cur = cur.nextSibling)) {
          if (cur === b) {
            return -1;
          }
        }
      }
      return a ? 1 : -1;
    }
    function createInputPseudo(type) {
      return function(elem) {
        var name = elem.nodeName.toLowerCase();
        return name === "input" && elem.type === type;
      };
    }
    function createButtonPseudo(type) {
      return function(elem) {
        var name = elem.nodeName.toLowerCase();
        return (name === "input" || name === "button") && elem.type === type;
      };
    }
    function createDisabledPseudo(disabled) {
      return function(elem) {
        if ("form" in elem) {
          if (elem.parentNode && elem.disabled === false) {
            if ("label" in elem) {
              if ("label" in elem.parentNode) {
                return elem.parentNode.disabled === disabled;
              } else {
                return elem.disabled === disabled;
              }
            }
            return elem.isDisabled === disabled || elem.isDisabled !== !disabled && disabledAncestor(elem) === disabled;
          }
          return elem.disabled === disabled;
        } else if ("label" in elem) {
          return elem.disabled === disabled;
        }
        return false;
      };
    }
    function createPositionalPseudo(fn) {
      return markFunction(function(argument) {
        argument = +argument;
        return markFunction(function(seed, matches) {
          var j,
              matchIndexes = fn([], seed.length, argument),
              i = matchIndexes.length;
          while (i--) {
            if (seed[(j = matchIndexes[i])]) {
              seed[j] = !(matches[j] = seed[j]);
            }
          }
        });
      });
    }
    function testContext(context) {
      return context && typeof context.getElementsByTagName !== "undefined" && context;
    }
    support = Sizzle.support = {};
    isXML = Sizzle.isXML = function(elem) {
      var documentElement = elem && (elem.ownerDocument || elem).documentElement;
      return documentElement ? documentElement.nodeName !== "HTML" : false;
    };
    setDocument = Sizzle.setDocument = function(node) {
      var hasCompare,
          subWindow,
          doc = node ? node.ownerDocument || node : preferredDoc;
      if (doc === document || doc.nodeType !== 9 || !doc.documentElement) {
        return document;
      }
      document = doc;
      docElem = document.documentElement;
      documentIsHTML = !isXML(document);
      if (preferredDoc !== document && (subWindow = document.defaultView) && subWindow.top !== subWindow) {
        if (subWindow.addEventListener) {
          subWindow.addEventListener("unload", unloadHandler, false);
        } else if (subWindow.attachEvent) {
          subWindow.attachEvent("onunload", unloadHandler);
        }
      }
      support.attributes = assert(function(el) {
        el.className = "i";
        return !el.getAttribute("className");
      });
      support.getElementsByTagName = assert(function(el) {
        el.appendChild(document.createComment(""));
        return !el.getElementsByTagName("*").length;
      });
      support.getElementsByClassName = rnative.test(document.getElementsByClassName);
      support.getById = assert(function(el) {
        docElem.appendChild(el).id = expando;
        return !document.getElementsByName || !document.getElementsByName(expando).length;
      });
      if (support.getById) {
        Expr.filter["ID"] = function(id) {
          var attrId = id.replace(runescape, funescape);
          return function(elem) {
            return elem.getAttribute("id") === attrId;
          };
        };
        Expr.find["ID"] = function(id, context) {
          if (typeof context.getElementById !== "undefined" && documentIsHTML) {
            var elem = context.getElementById(id);
            return elem ? [elem] : [];
          }
        };
      } else {
        Expr.filter["ID"] = function(id) {
          var attrId = id.replace(runescape, funescape);
          return function(elem) {
            var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
            return node && node.value === attrId;
          };
        };
        Expr.find["ID"] = function(id, context) {
          if (typeof context.getElementById !== "undefined" && documentIsHTML) {
            var node,
                i,
                elems,
                elem = context.getElementById(id);
            if (elem) {
              node = elem.getAttributeNode("id");
              if (node && node.value === id) {
                return [elem];
              }
              elems = context.getElementsByName(id);
              i = 0;
              while ((elem = elems[i++])) {
                node = elem.getAttributeNode("id");
                if (node && node.value === id) {
                  return [elem];
                }
              }
            }
            return [];
          }
        };
      }
      Expr.find["TAG"] = support.getElementsByTagName ? function(tag, context) {
        if (typeof context.getElementsByTagName !== "undefined") {
          return context.getElementsByTagName(tag);
        } else if (support.qsa) {
          return context.querySelectorAll(tag);
        }
      } : function(tag, context) {
        var elem,
            tmp = [],
            i = 0,
            results = context.getElementsByTagName(tag);
        if (tag === "*") {
          while ((elem = results[i++])) {
            if (elem.nodeType === 1) {
              tmp.push(elem);
            }
          }
          return tmp;
        }
        return results;
      };
      Expr.find["CLASS"] = support.getElementsByClassName && function(className, context) {
        if (typeof context.getElementsByClassName !== "undefined" && documentIsHTML) {
          return context.getElementsByClassName(className);
        }
      };
      rbuggyMatches = [];
      rbuggyQSA = [];
      if ((support.qsa = rnative.test(document.querySelectorAll))) {
        assert(function(el) {
          docElem.appendChild(el).innerHTML = "<a id='" + expando + "'></a>" + "<select id='" + expando + "-\r\\' msallowcapture=''>" + "<option selected=''></option></select>";
          if (el.querySelectorAll("[msallowcapture^='']").length) {
            rbuggyQSA.push("[*^$]=" + whitespace + "*(?:''|\"\")");
          }
          if (!el.querySelectorAll("[selected]").length) {
            rbuggyQSA.push("\\[" + whitespace + "*(?:value|" + booleans + ")");
          }
          if (!el.querySelectorAll("[id~=" + expando + "-]").length) {
            rbuggyQSA.push("~=");
          }
          if (!el.querySelectorAll(":checked").length) {
            rbuggyQSA.push(":checked");
          }
          if (!el.querySelectorAll("a#" + expando + "+*").length) {
            rbuggyQSA.push(".#.+[+~]");
          }
        });
        assert(function(el) {
          el.innerHTML = "<a href='' disabled='disabled'></a>" + "<select disabled='disabled'><option/></select>";
          var input = document.createElement("input");
          input.setAttribute("type", "hidden");
          el.appendChild(input).setAttribute("name", "D");
          if (el.querySelectorAll("[name=d]").length) {
            rbuggyQSA.push("name" + whitespace + "*[*^$|!~]?=");
          }
          if (el.querySelectorAll(":enabled").length !== 2) {
            rbuggyQSA.push(":enabled", ":disabled");
          }
          docElem.appendChild(el).disabled = true;
          if (el.querySelectorAll(":disabled").length !== 2) {
            rbuggyQSA.push(":enabled", ":disabled");
          }
          el.querySelectorAll("*,:x");
          rbuggyQSA.push(",.*:");
        });
      }
      if ((support.matchesSelector = rnative.test((matches = docElem.matches || docElem.webkitMatchesSelector || docElem.mozMatchesSelector || docElem.oMatchesSelector || docElem.msMatchesSelector)))) {
        assert(function(el) {
          support.disconnectedMatch = matches.call(el, "*");
          matches.call(el, "[s!='']:x");
          rbuggyMatches.push("!=", pseudos);
        });
      }
      rbuggyQSA = rbuggyQSA.length && new RegExp(rbuggyQSA.join("|"));
      rbuggyMatches = rbuggyMatches.length && new RegExp(rbuggyMatches.join("|"));
      hasCompare = rnative.test(docElem.compareDocumentPosition);
      contains = hasCompare || rnative.test(docElem.contains) ? function(a, b) {
        var adown = a.nodeType === 9 ? a.documentElement : a,
            bup = b && b.parentNode;
        return a === bup || !!(bup && bup.nodeType === 1 && (adown.contains ? adown.contains(bup) : a.compareDocumentPosition && a.compareDocumentPosition(bup) & 16));
      } : function(a, b) {
        if (b) {
          while ((b = b.parentNode)) {
            if (b === a) {
              return true;
            }
          }
        }
        return false;
      };
      sortOrder = hasCompare ? function(a, b) {
        if (a === b) {
          hasDuplicate = true;
          return 0;
        }
        var compare = !a.compareDocumentPosition - !b.compareDocumentPosition;
        if (compare) {
          return compare;
        }
        compare = (a.ownerDocument || a) === (b.ownerDocument || b) ? a.compareDocumentPosition(b) : 1;
        if (compare & 1 || (!support.sortDetached && b.compareDocumentPosition(a) === compare)) {
          if (a === document || a.ownerDocument === preferredDoc && contains(preferredDoc, a)) {
            return -1;
          }
          if (b === document || b.ownerDocument === preferredDoc && contains(preferredDoc, b)) {
            return 1;
          }
          return sortInput ? (indexOf(sortInput, a) - indexOf(sortInput, b)) : 0;
        }
        return compare & 4 ? -1 : 1;
      } : function(a, b) {
        if (a === b) {
          hasDuplicate = true;
          return 0;
        }
        var cur,
            i = 0,
            aup = a.parentNode,
            bup = b.parentNode,
            ap = [a],
            bp = [b];
        if (!aup || !bup) {
          return a === document ? -1 : b === document ? 1 : aup ? -1 : bup ? 1 : sortInput ? (indexOf(sortInput, a) - indexOf(sortInput, b)) : 0;
        } else if (aup === bup) {
          return siblingCheck(a, b);
        }
        cur = a;
        while ((cur = cur.parentNode)) {
          ap.unshift(cur);
        }
        cur = b;
        while ((cur = cur.parentNode)) {
          bp.unshift(cur);
        }
        while (ap[i] === bp[i]) {
          i++;
        }
        return i ? siblingCheck(ap[i], bp[i]) : ap[i] === preferredDoc ? -1 : bp[i] === preferredDoc ? 1 : 0;
      };
      return document;
    };
    Sizzle.matches = function(expr, elements) {
      return Sizzle(expr, null, null, elements);
    };
    Sizzle.matchesSelector = function(elem, expr) {
      if ((elem.ownerDocument || elem) !== document) {
        setDocument(elem);
      }
      expr = expr.replace(rattributeQuotes, "='$1']");
      if (support.matchesSelector && documentIsHTML && !compilerCache[expr + " "] && (!rbuggyMatches || !rbuggyMatches.test(expr)) && (!rbuggyQSA || !rbuggyQSA.test(expr))) {
        try {
          var ret = matches.call(elem, expr);
          if (ret || support.disconnectedMatch || elem.document && elem.document.nodeType !== 11) {
            return ret;
          }
        } catch (e) {}
      }
      return Sizzle(expr, document, null, [elem]).length > 0;
    };
    Sizzle.contains = function(context, elem) {
      if ((context.ownerDocument || context) !== document) {
        setDocument(context);
      }
      return contains(context, elem);
    };
    Sizzle.attr = function(elem, name) {
      if ((elem.ownerDocument || elem) !== document) {
        setDocument(elem);
      }
      var fn = Expr.attrHandle[name.toLowerCase()],
          val = fn && hasOwn.call(Expr.attrHandle, name.toLowerCase()) ? fn(elem, name, !documentIsHTML) : undefined;
      return val !== undefined ? val : support.attributes || !documentIsHTML ? elem.getAttribute(name) : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
    };
    Sizzle.escape = function(sel) {
      return (sel + "").replace(rcssescape, fcssescape);
    };
    Sizzle.error = function(msg) {
      throw new Error("Syntax error, unrecognized expression: " + msg);
    };
    Sizzle.uniqueSort = function(results) {
      var elem,
          duplicates = [],
          j = 0,
          i = 0;
      hasDuplicate = !support.detectDuplicates;
      sortInput = !support.sortStable && results.slice(0);
      results.sort(sortOrder);
      if (hasDuplicate) {
        while ((elem = results[i++])) {
          if (elem === results[i]) {
            j = duplicates.push(i);
          }
        }
        while (j--) {
          results.splice(duplicates[j], 1);
        }
      }
      sortInput = null;
      return results;
    };
    getText = Sizzle.getText = function(elem) {
      var node,
          ret = "",
          i = 0,
          nodeType = elem.nodeType;
      if (!nodeType) {
        while ((node = elem[i++])) {
          ret += getText(node);
        }
      } else if (nodeType === 1 || nodeType === 9 || nodeType === 11) {
        if (typeof elem.textContent === "string") {
          return elem.textContent;
        } else {
          for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
            ret += getText(elem);
          }
        }
      } else if (nodeType === 3 || nodeType === 4) {
        return elem.nodeValue;
      }
      return ret;
    };
    Expr = Sizzle.selectors = {
      cacheLength: 50,
      createPseudo: markFunction,
      match: matchExpr,
      attrHandle: {},
      find: {},
      relative: {
        ">": {
          dir: "parentNode",
          first: true
        },
        " ": {dir: "parentNode"},
        "+": {
          dir: "previousSibling",
          first: true
        },
        "~": {dir: "previousSibling"}
      },
      preFilter: {
        "ATTR": function(match) {
          match[1] = match[1].replace(runescape, funescape);
          match[3] = (match[3] || match[4] || match[5] || "").replace(runescape, funescape);
          if (match[2] === "~=") {
            match[3] = " " + match[3] + " ";
          }
          return match.slice(0, 4);
        },
        "CHILD": function(match) {
          match[1] = match[1].toLowerCase();
          if (match[1].slice(0, 3) === "nth") {
            if (!match[3]) {
              Sizzle.error(match[0]);
            }
            match[4] = +(match[4] ? match[5] + (match[6] || 1) : 2 * (match[3] === "even" || match[3] === "odd"));
            match[5] = +((match[7] + match[8]) || match[3] === "odd");
          } else if (match[3]) {
            Sizzle.error(match[0]);
          }
          return match;
        },
        "PSEUDO": function(match) {
          var excess,
              unquoted = !match[6] && match[2];
          if (matchExpr["CHILD"].test(match[0])) {
            return null;
          }
          if (match[3]) {
            match[2] = match[4] || match[5] || "";
          } else if (unquoted && rpseudo.test(unquoted) && (excess = tokenize(unquoted, true)) && (excess = unquoted.indexOf(")", unquoted.length - excess) - unquoted.length)) {
            match[0] = match[0].slice(0, excess);
            match[2] = unquoted.slice(0, excess);
          }
          return match.slice(0, 3);
        }
      },
      filter: {
        "TAG": function(nodeNameSelector) {
          var nodeName = nodeNameSelector.replace(runescape, funescape).toLowerCase();
          return nodeNameSelector === "*" ? function() {
            return true;
          } : function(elem) {
            return elem.nodeName && elem.nodeName.toLowerCase() === nodeName;
          };
        },
        "CLASS": function(className) {
          var pattern = classCache[className + " "];
          return pattern || (pattern = new RegExp("(^|" + whitespace + ")" + className + "(" + whitespace + "|$)")) && classCache(className, function(elem) {
            return pattern.test(typeof elem.className === "string" && elem.className || typeof elem.getAttribute !== "undefined" && elem.getAttribute("class") || "");
          });
        },
        "ATTR": function(name, operator, check) {
          return function(elem) {
            var result = Sizzle.attr(elem, name);
            if (result == null) {
              return operator === "!=";
            }
            if (!operator) {
              return true;
            }
            result += "";
            return operator === "=" ? result === check : operator === "!=" ? result !== check : operator === "^=" ? check && result.indexOf(check) === 0 : operator === "*=" ? check && result.indexOf(check) > -1 : operator === "$=" ? check && result.slice(-check.length) === check : operator === "~=" ? (" " + result.replace(rwhitespace, " ") + " ").indexOf(check) > -1 : operator === "|=" ? result === check || result.slice(0, check.length + 1) === check + "-" : false;
          };
        },
        "CHILD": function(type, what, argument, first, last) {
          var simple = type.slice(0, 3) !== "nth",
              forward = type.slice(-4) !== "last",
              ofType = what === "of-type";
          return first === 1 && last === 0 ? function(elem) {
            return !!elem.parentNode;
          } : function(elem, context, xml) {
            var cache,
                uniqueCache,
                outerCache,
                node,
                nodeIndex,
                start,
                dir = simple !== forward ? "nextSibling" : "previousSibling",
                parent = elem.parentNode,
                name = ofType && elem.nodeName.toLowerCase(),
                useCache = !xml && !ofType,
                diff = false;
            if (parent) {
              if (simple) {
                while (dir) {
                  node = elem;
                  while ((node = node[dir])) {
                    if (ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) {
                      return false;
                    }
                  }
                  start = dir = type === "only" && !start && "nextSibling";
                }
                return true;
              }
              start = [forward ? parent.firstChild : parent.lastChild];
              if (forward && useCache) {
                node = parent;
                outerCache = node[expando] || (node[expando] = {});
                uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});
                cache = uniqueCache[type] || [];
                nodeIndex = cache[0] === dirruns && cache[1];
                diff = nodeIndex && cache[2];
                node = nodeIndex && parent.childNodes[nodeIndex];
                while ((node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop())) {
                  if (node.nodeType === 1 && ++diff && node === elem) {
                    uniqueCache[type] = [dirruns, nodeIndex, diff];
                    break;
                  }
                }
              } else {
                if (useCache) {
                  node = elem;
                  outerCache = node[expando] || (node[expando] = {});
                  uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});
                  cache = uniqueCache[type] || [];
                  nodeIndex = cache[0] === dirruns && cache[1];
                  diff = nodeIndex;
                }
                if (diff === false) {
                  while ((node = ++nodeIndex && node && node[dir] || (diff = nodeIndex = 0) || start.pop())) {
                    if ((ofType ? node.nodeName.toLowerCase() === name : node.nodeType === 1) && ++diff) {
                      if (useCache) {
                        outerCache = node[expando] || (node[expando] = {});
                        uniqueCache = outerCache[node.uniqueID] || (outerCache[node.uniqueID] = {});
                        uniqueCache[type] = [dirruns, diff];
                      }
                      if (node === elem) {
                        break;
                      }
                    }
                  }
                }
              }
              diff -= last;
              return diff === first || (diff % first === 0 && diff / first >= 0);
            }
          };
        },
        "PSEUDO": function(pseudo, argument) {
          var args,
              fn = Expr.pseudos[pseudo] || Expr.setFilters[pseudo.toLowerCase()] || Sizzle.error("unsupported pseudo: " + pseudo);
          if (fn[expando]) {
            return fn(argument);
          }
          if (fn.length > 1) {
            args = [pseudo, pseudo, "", argument];
            return Expr.setFilters.hasOwnProperty(pseudo.toLowerCase()) ? markFunction(function(seed, matches) {
              var idx,
                  matched = fn(seed, argument),
                  i = matched.length;
              while (i--) {
                idx = indexOf(seed, matched[i]);
                seed[idx] = !(matches[idx] = matched[i]);
              }
            }) : function(elem) {
              return fn(elem, 0, args);
            };
          }
          return fn;
        }
      },
      pseudos: {
        "not": markFunction(function(selector) {
          var input = [],
              results = [],
              matcher = compile(selector.replace(rtrim, "$1"));
          return matcher[expando] ? markFunction(function(seed, matches, context, xml) {
            var elem,
                unmatched = matcher(seed, null, xml, []),
                i = seed.length;
            while (i--) {
              if ((elem = unmatched[i])) {
                seed[i] = !(matches[i] = elem);
              }
            }
          }) : function(elem, context, xml) {
            input[0] = elem;
            matcher(input, null, xml, results);
            input[0] = null;
            return !results.pop();
          };
        }),
        "has": markFunction(function(selector) {
          return function(elem) {
            return Sizzle(selector, elem).length > 0;
          };
        }),
        "contains": markFunction(function(text) {
          text = text.replace(runescape, funescape);
          return function(elem) {
            return (elem.textContent || elem.innerText || getText(elem)).indexOf(text) > -1;
          };
        }),
        "lang": markFunction(function(lang) {
          if (!ridentifier.test(lang || "")) {
            Sizzle.error("unsupported lang: " + lang);
          }
          lang = lang.replace(runescape, funescape).toLowerCase();
          return function(elem) {
            var elemLang;
            do {
              if ((elemLang = documentIsHTML ? elem.lang : elem.getAttribute("xml:lang") || elem.getAttribute("lang"))) {
                elemLang = elemLang.toLowerCase();
                return elemLang === lang || elemLang.indexOf(lang + "-") === 0;
              }
            } while ((elem = elem.parentNode) && elem.nodeType === 1);
            return false;
          };
        }),
        "target": function(elem) {
          var hash = window.location && window.location.hash;
          return hash && hash.slice(1) === elem.id;
        },
        "root": function(elem) {
          return elem === docElem;
        },
        "focus": function(elem) {
          return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
        },
        "enabled": createDisabledPseudo(false),
        "disabled": createDisabledPseudo(true),
        "checked": function(elem) {
          var nodeName = elem.nodeName.toLowerCase();
          return (nodeName === "input" && !!elem.checked) || (nodeName === "option" && !!elem.selected);
        },
        "selected": function(elem) {
          if (elem.parentNode) {
            elem.parentNode.selectedIndex;
          }
          return elem.selected === true;
        },
        "empty": function(elem) {
          for (elem = elem.firstChild; elem; elem = elem.nextSibling) {
            if (elem.nodeType < 6) {
              return false;
            }
          }
          return true;
        },
        "parent": function(elem) {
          return !Expr.pseudos["empty"](elem);
        },
        "header": function(elem) {
          return rheader.test(elem.nodeName);
        },
        "input": function(elem) {
          return rinputs.test(elem.nodeName);
        },
        "button": function(elem) {
          var name = elem.nodeName.toLowerCase();
          return name === "input" && elem.type === "button" || name === "button";
        },
        "text": function(elem) {
          var attr;
          return elem.nodeName.toLowerCase() === "input" && elem.type === "text" && ((attr = elem.getAttribute("type")) == null || attr.toLowerCase() === "text");
        },
        "first": createPositionalPseudo(function() {
          return [0];
        }),
        "last": createPositionalPseudo(function(matchIndexes, length) {
          return [length - 1];
        }),
        "eq": createPositionalPseudo(function(matchIndexes, length, argument) {
          return [argument < 0 ? argument + length : argument];
        }),
        "even": createPositionalPseudo(function(matchIndexes, length) {
          var i = 0;
          for (; i < length; i += 2) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        }),
        "odd": createPositionalPseudo(function(matchIndexes, length) {
          var i = 1;
          for (; i < length; i += 2) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        }),
        "lt": createPositionalPseudo(function(matchIndexes, length, argument) {
          var i = argument < 0 ? argument + length : argument;
          for (; --i >= 0; ) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        }),
        "gt": createPositionalPseudo(function(matchIndexes, length, argument) {
          var i = argument < 0 ? argument + length : argument;
          for (; ++i < length; ) {
            matchIndexes.push(i);
          }
          return matchIndexes;
        })
      }
    };
    Expr.pseudos["nth"] = Expr.pseudos["eq"];
    for (i in {
      radio: true,
      checkbox: true,
      file: true,
      password: true,
      image: true
    }) {
      Expr.pseudos[i] = createInputPseudo(i);
    }
    for (i in {
      submit: true,
      reset: true
    }) {
      Expr.pseudos[i] = createButtonPseudo(i);
    }
    function setFilters() {}
    setFilters.prototype = Expr.filters = Expr.pseudos;
    Expr.setFilters = new setFilters();
    tokenize = Sizzle.tokenize = function(selector, parseOnly) {
      var matched,
          match,
          tokens,
          type,
          soFar,
          groups,
          preFilters,
          cached = tokenCache[selector + " "];
      if (cached) {
        return parseOnly ? 0 : cached.slice(0);
      }
      soFar = selector;
      groups = [];
      preFilters = Expr.preFilter;
      while (soFar) {
        if (!matched || (match = rcomma.exec(soFar))) {
          if (match) {
            soFar = soFar.slice(match[0].length) || soFar;
          }
          groups.push((tokens = []));
        }
        matched = false;
        if ((match = rcombinators.exec(soFar))) {
          matched = match.shift();
          tokens.push({
            value: matched,
            type: match[0].replace(rtrim, " ")
          });
          soFar = soFar.slice(matched.length);
        }
        for (type in Expr.filter) {
          if ((match = matchExpr[type].exec(soFar)) && (!preFilters[type] || (match = preFilters[type](match)))) {
            matched = match.shift();
            tokens.push({
              value: matched,
              type: type,
              matches: match
            });
            soFar = soFar.slice(matched.length);
          }
        }
        if (!matched) {
          break;
        }
      }
      return parseOnly ? soFar.length : soFar ? Sizzle.error(selector) : tokenCache(selector, groups).slice(0);
    };
    function toSelector(tokens) {
      var i = 0,
          len = tokens.length,
          selector = "";
      for (; i < len; i++) {
        selector += tokens[i].value;
      }
      return selector;
    }
    function addCombinator(matcher, combinator, base) {
      var dir = combinator.dir,
          skip = combinator.next,
          key = skip || dir,
          checkNonElements = base && key === "parentNode",
          doneName = done++;
      return combinator.first ? function(elem, context, xml) {
        while ((elem = elem[dir])) {
          if (elem.nodeType === 1 || checkNonElements) {
            return matcher(elem, context, xml);
          }
        }
        return false;
      } : function(elem, context, xml) {
        var oldCache,
            uniqueCache,
            outerCache,
            newCache = [dirruns, doneName];
        if (xml) {
          while ((elem = elem[dir])) {
            if (elem.nodeType === 1 || checkNonElements) {
              if (matcher(elem, context, xml)) {
                return true;
              }
            }
          }
        } else {
          while ((elem = elem[dir])) {
            if (elem.nodeType === 1 || checkNonElements) {
              outerCache = elem[expando] || (elem[expando] = {});
              uniqueCache = outerCache[elem.uniqueID] || (outerCache[elem.uniqueID] = {});
              if (skip && skip === elem.nodeName.toLowerCase()) {
                elem = elem[dir] || elem;
              } else if ((oldCache = uniqueCache[key]) && oldCache[0] === dirruns && oldCache[1] === doneName) {
                return (newCache[2] = oldCache[2]);
              } else {
                uniqueCache[key] = newCache;
                if ((newCache[2] = matcher(elem, context, xml))) {
                  return true;
                }
              }
            }
          }
        }
        return false;
      };
    }
    function elementMatcher(matchers) {
      return matchers.length > 1 ? function(elem, context, xml) {
        var i = matchers.length;
        while (i--) {
          if (!matchers[i](elem, context, xml)) {
            return false;
          }
        }
        return true;
      } : matchers[0];
    }
    function multipleContexts(selector, contexts, results) {
      var i = 0,
          len = contexts.length;
      for (; i < len; i++) {
        Sizzle(selector, contexts[i], results);
      }
      return results;
    }
    function condense(unmatched, map, filter, context, xml) {
      var elem,
          newUnmatched = [],
          i = 0,
          len = unmatched.length,
          mapped = map != null;
      for (; i < len; i++) {
        if ((elem = unmatched[i])) {
          if (!filter || filter(elem, context, xml)) {
            newUnmatched.push(elem);
            if (mapped) {
              map.push(i);
            }
          }
        }
      }
      return newUnmatched;
    }
    function setMatcher(preFilter, selector, matcher, postFilter, postFinder, postSelector) {
      if (postFilter && !postFilter[expando]) {
        postFilter = setMatcher(postFilter);
      }
      if (postFinder && !postFinder[expando]) {
        postFinder = setMatcher(postFinder, postSelector);
      }
      return markFunction(function(seed, results, context, xml) {
        var temp,
            i,
            elem,
            preMap = [],
            postMap = [],
            preexisting = results.length,
            elems = seed || multipleContexts(selector || "*", context.nodeType ? [context] : context, []),
            matcherIn = preFilter && (seed || !selector) ? condense(elems, preMap, preFilter, context, xml) : elems,
            matcherOut = matcher ? postFinder || (seed ? preFilter : preexisting || postFilter) ? [] : results : matcherIn;
        if (matcher) {
          matcher(matcherIn, matcherOut, context, xml);
        }
        if (postFilter) {
          temp = condense(matcherOut, postMap);
          postFilter(temp, [], context, xml);
          i = temp.length;
          while (i--) {
            if ((elem = temp[i])) {
              matcherOut[postMap[i]] = !(matcherIn[postMap[i]] = elem);
            }
          }
        }
        if (seed) {
          if (postFinder || preFilter) {
            if (postFinder) {
              temp = [];
              i = matcherOut.length;
              while (i--) {
                if ((elem = matcherOut[i])) {
                  temp.push((matcherIn[i] = elem));
                }
              }
              postFinder(null, (matcherOut = []), temp, xml);
            }
            i = matcherOut.length;
            while (i--) {
              if ((elem = matcherOut[i]) && (temp = postFinder ? indexOf(seed, elem) : preMap[i]) > -1) {
                seed[temp] = !(results[temp] = elem);
              }
            }
          }
        } else {
          matcherOut = condense(matcherOut === results ? matcherOut.splice(preexisting, matcherOut.length) : matcherOut);
          if (postFinder) {
            postFinder(null, results, matcherOut, xml);
          } else {
            push.apply(results, matcherOut);
          }
        }
      });
    }
    function matcherFromTokens(tokens) {
      var checkContext,
          matcher,
          j,
          len = tokens.length,
          leadingRelative = Expr.relative[tokens[0].type],
          implicitRelative = leadingRelative || Expr.relative[" "],
          i = leadingRelative ? 1 : 0,
          matchContext = addCombinator(function(elem) {
            return elem === checkContext;
          }, implicitRelative, true),
          matchAnyContext = addCombinator(function(elem) {
            return indexOf(checkContext, elem) > -1;
          }, implicitRelative, true),
          matchers = [function(elem, context, xml) {
            var ret = (!leadingRelative && (xml || context !== outermostContext)) || ((checkContext = context).nodeType ? matchContext(elem, context, xml) : matchAnyContext(elem, context, xml));
            checkContext = null;
            return ret;
          }];
      for (; i < len; i++) {
        if ((matcher = Expr.relative[tokens[i].type])) {
          matchers = [addCombinator(elementMatcher(matchers), matcher)];
        } else {
          matcher = Expr.filter[tokens[i].type].apply(null, tokens[i].matches);
          if (matcher[expando]) {
            j = ++i;
            for (; j < len; j++) {
              if (Expr.relative[tokens[j].type]) {
                break;
              }
            }
            return setMatcher(i > 1 && elementMatcher(matchers), i > 1 && toSelector(tokens.slice(0, i - 1).concat({value: tokens[i - 2].type === " " ? "*" : ""})).replace(rtrim, "$1"), matcher, i < j && matcherFromTokens(tokens.slice(i, j)), j < len && matcherFromTokens((tokens = tokens.slice(j))), j < len && toSelector(tokens));
          }
          matchers.push(matcher);
        }
      }
      return elementMatcher(matchers);
    }
    function matcherFromGroupMatchers(elementMatchers, setMatchers) {
      var bySet = setMatchers.length > 0,
          byElement = elementMatchers.length > 0,
          superMatcher = function(seed, context, xml, results, outermost) {
            var elem,
                j,
                matcher,
                matchedCount = 0,
                i = "0",
                unmatched = seed && [],
                setMatched = [],
                contextBackup = outermostContext,
                elems = seed || byElement && Expr.find["TAG"]("*", outermost),
                dirrunsUnique = (dirruns += contextBackup == null ? 1 : Math.random() || 0.1),
                len = elems.length;
            if (outermost) {
              outermostContext = context === document || context || outermost;
            }
            for (; i !== len && (elem = elems[i]) != null; i++) {
              if (byElement && elem) {
                j = 0;
                if (!context && elem.ownerDocument !== document) {
                  setDocument(elem);
                  xml = !documentIsHTML;
                }
                while ((matcher = elementMatchers[j++])) {
                  if (matcher(elem, context || document, xml)) {
                    results.push(elem);
                    break;
                  }
                }
                if (outermost) {
                  dirruns = dirrunsUnique;
                }
              }
              if (bySet) {
                if ((elem = !matcher && elem)) {
                  matchedCount--;
                }
                if (seed) {
                  unmatched.push(elem);
                }
              }
            }
            matchedCount += i;
            if (bySet && i !== matchedCount) {
              j = 0;
              while ((matcher = setMatchers[j++])) {
                matcher(unmatched, setMatched, context, xml);
              }
              if (seed) {
                if (matchedCount > 0) {
                  while (i--) {
                    if (!(unmatched[i] || setMatched[i])) {
                      setMatched[i] = pop.call(results);
                    }
                  }
                }
                setMatched = condense(setMatched);
              }
              push.apply(results, setMatched);
              if (outermost && !seed && setMatched.length > 0 && (matchedCount + setMatchers.length) > 1) {
                Sizzle.uniqueSort(results);
              }
            }
            if (outermost) {
              dirruns = dirrunsUnique;
              outermostContext = contextBackup;
            }
            return unmatched;
          };
      return bySet ? markFunction(superMatcher) : superMatcher;
    }
    compile = Sizzle.compile = function(selector, match) {
      var i,
          setMatchers = [],
          elementMatchers = [],
          cached = compilerCache[selector + " "];
      if (!cached) {
        if (!match) {
          match = tokenize(selector);
        }
        i = match.length;
        while (i--) {
          cached = matcherFromTokens(match[i]);
          if (cached[expando]) {
            setMatchers.push(cached);
          } else {
            elementMatchers.push(cached);
          }
        }
        cached = compilerCache(selector, matcherFromGroupMatchers(elementMatchers, setMatchers));
        cached.selector = selector;
      }
      return cached;
    };
    select = Sizzle.select = function(selector, context, results, seed) {
      var i,
          tokens,
          token,
          type,
          find,
          compiled = typeof selector === "function" && selector,
          match = !seed && tokenize((selector = compiled.selector || selector));
      results = results || [];
      if (match.length === 1) {
        tokens = match[0] = match[0].slice(0);
        if (tokens.length > 2 && (token = tokens[0]).type === "ID" && context.nodeType === 9 && documentIsHTML && Expr.relative[tokens[1].type]) {
          context = (Expr.find["ID"](token.matches[0].replace(runescape, funescape), context) || [])[0];
          if (!context) {
            return results;
          } else if (compiled) {
            context = context.parentNode;
          }
          selector = selector.slice(tokens.shift().value.length);
        }
        i = matchExpr["needsContext"].test(selector) ? 0 : tokens.length;
        while (i--) {
          token = tokens[i];
          if (Expr.relative[(type = token.type)]) {
            break;
          }
          if ((find = Expr.find[type])) {
            if ((seed = find(token.matches[0].replace(runescape, funescape), rsibling.test(tokens[0].type) && testContext(context.parentNode) || context))) {
              tokens.splice(i, 1);
              selector = seed.length && toSelector(tokens);
              if (!selector) {
                push.apply(results, seed);
                return results;
              }
              break;
            }
          }
        }
      }
      (compiled || compile(selector, match))(seed, context, !documentIsHTML, results, !context || rsibling.test(selector) && testContext(context.parentNode) || context);
      return results;
    };
    support.sortStable = expando.split("").sort(sortOrder).join("") === expando;
    support.detectDuplicates = !!hasDuplicate;
    setDocument();
    support.sortDetached = assert(function(el) {
      return el.compareDocumentPosition(document.createElement("fieldset")) & 1;
    });
    if (!assert(function(el) {
      el.innerHTML = "<a href='#'></a>";
      return el.firstChild.getAttribute("href") === "#";
    })) {
      addHandle("type|href|height|width", function(elem, name, isXML) {
        if (!isXML) {
          return elem.getAttribute(name, name.toLowerCase() === "type" ? 1 : 2);
        }
      });
    }
    if (!support.attributes || !assert(function(el) {
      el.innerHTML = "<input/>";
      el.firstChild.setAttribute("value", "");
      return el.firstChild.getAttribute("value") === "";
    })) {
      addHandle("value", function(elem, name, isXML) {
        if (!isXML && elem.nodeName.toLowerCase() === "input") {
          return elem.defaultValue;
        }
      });
    }
    if (!assert(function(el) {
      return el.getAttribute("disabled") == null;
    })) {
      addHandle(booleans, function(elem, name, isXML) {
        var val;
        if (!isXML) {
          return elem[name] === true ? name.toLowerCase() : (val = elem.getAttributeNode(name)) && val.specified ? val.value : null;
        }
      });
    }
    return Sizzle;
  })(window);
  jQuery.find = Sizzle;
  jQuery.expr = Sizzle.selectors;
  jQuery.expr[":"] = jQuery.expr.pseudos;
  jQuery.uniqueSort = jQuery.unique = Sizzle.uniqueSort;
  jQuery.text = Sizzle.getText;
  jQuery.isXMLDoc = Sizzle.isXML;
  jQuery.contains = Sizzle.contains;
  jQuery.escapeSelector = Sizzle.escape;
  var dir = function(elem, dir, until) {
    var matched = [],
        truncate = until !== undefined;
    while ((elem = elem[dir]) && elem.nodeType !== 9) {
      if (elem.nodeType === 1) {
        if (truncate && jQuery(elem).is(until)) {
          break;
        }
        matched.push(elem);
      }
    }
    return matched;
  };
  var siblings = function(n, elem) {
    var matched = [];
    for (; n; n = n.nextSibling) {
      if (n.nodeType === 1 && n !== elem) {
        matched.push(n);
      }
    }
    return matched;
  };
  var rneedsContext = jQuery.expr.match.needsContext;
  var rsingleTag = (/^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i);
  var risSimple = /^.[^:#\[\.,]*$/;
  function winnow(elements, qualifier, not) {
    if (jQuery.isFunction(qualifier)) {
      return jQuery.grep(elements, function(elem, i) {
        return !!qualifier.call(elem, i, elem) !== not;
      });
    }
    if (qualifier.nodeType) {
      return jQuery.grep(elements, function(elem) {
        return (elem === qualifier) !== not;
      });
    }
    if (typeof qualifier !== "string") {
      return jQuery.grep(elements, function(elem) {
        return (indexOf.call(qualifier, elem) > -1) !== not;
      });
    }
    if (risSimple.test(qualifier)) {
      return jQuery.filter(qualifier, elements, not);
    }
    qualifier = jQuery.filter(qualifier, elements);
    return jQuery.grep(elements, function(elem) {
      return (indexOf.call(qualifier, elem) > -1) !== not && elem.nodeType === 1;
    });
  }
  jQuery.filter = function(expr, elems, not) {
    var elem = elems[0];
    if (not) {
      expr = ":not(" + expr + ")";
    }
    if (elems.length === 1 && elem.nodeType === 1) {
      return jQuery.find.matchesSelector(elem, expr) ? [elem] : [];
    }
    return jQuery.find.matches(expr, jQuery.grep(elems, function(elem) {
      return elem.nodeType === 1;
    }));
  };
  jQuery.fn.extend({
    find: function(selector) {
      var i,
          ret,
          len = this.length,
          self = this;
      if (typeof selector !== "string") {
        return this.pushStack(jQuery(selector).filter(function() {
          for (i = 0; i < len; i++) {
            if (jQuery.contains(self[i], this)) {
              return true;
            }
          }
        }));
      }
      ret = this.pushStack([]);
      for (i = 0; i < len; i++) {
        jQuery.find(selector, self[i], ret);
      }
      return len > 1 ? jQuery.uniqueSort(ret) : ret;
    },
    filter: function(selector) {
      return this.pushStack(winnow(this, selector || [], false));
    },
    not: function(selector) {
      return this.pushStack(winnow(this, selector || [], true));
    },
    is: function(selector) {
      return !!winnow(this, typeof selector === "string" && rneedsContext.test(selector) ? jQuery(selector) : selector || [], false).length;
    }
  });
  var rootjQuery,
      rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/,
      init = jQuery.fn.init = function(selector, context, root) {
        var match,
            elem;
        if (!selector) {
          return this;
        }
        root = root || rootjQuery;
        if (typeof selector === "string") {
          if (selector[0] === "<" && selector[selector.length - 1] === ">" && selector.length >= 3) {
            match = [null, selector, null];
          } else {
            match = rquickExpr.exec(selector);
          }
          if (match && (match[1] || !context)) {
            if (match[1]) {
              context = context instanceof jQuery ? context[0] : context;
              jQuery.merge(this, jQuery.parseHTML(match[1], context && context.nodeType ? context.ownerDocument || context : document, true));
              if (rsingleTag.test(match[1]) && jQuery.isPlainObject(context)) {
                for (match in context) {
                  if (jQuery.isFunction(this[match])) {
                    this[match](context[match]);
                  } else {
                    this.attr(match, context[match]);
                  }
                }
              }
              return this;
            } else {
              elem = document.getElementById(match[2]);
              if (elem) {
                this[0] = elem;
                this.length = 1;
              }
              return this;
            }
          } else if (!context || context.jquery) {
            return (context || root).find(selector);
          } else {
            return this.constructor(context).find(selector);
          }
        } else if (selector.nodeType) {
          this[0] = selector;
          this.length = 1;
          return this;
        } else if (jQuery.isFunction(selector)) {
          return root.ready !== undefined ? root.ready(selector) : selector(jQuery);
        }
        return jQuery.makeArray(selector, this);
      };
  init.prototype = jQuery.fn;
  rootjQuery = jQuery(document);
  var rparentsprev = /^(?:parents|prev(?:Until|All))/,
      guaranteedUnique = {
        children: true,
        contents: true,
        next: true,
        prev: true
      };
  jQuery.fn.extend({
    has: function(target) {
      var targets = jQuery(target, this),
          l = targets.length;
      return this.filter(function() {
        var i = 0;
        for (; i < l; i++) {
          if (jQuery.contains(this, targets[i])) {
            return true;
          }
        }
      });
    },
    closest: function(selectors, context) {
      var cur,
          i = 0,
          l = this.length,
          matched = [],
          targets = typeof selectors !== "string" && jQuery(selectors);
      if (!rneedsContext.test(selectors)) {
        for (; i < l; i++) {
          for (cur = this[i]; cur && cur !== context; cur = cur.parentNode) {
            if (cur.nodeType < 11 && (targets ? targets.index(cur) > -1 : cur.nodeType === 1 && jQuery.find.matchesSelector(cur, selectors))) {
              matched.push(cur);
              break;
            }
          }
        }
      }
      return this.pushStack(matched.length > 1 ? jQuery.uniqueSort(matched) : matched);
    },
    index: function(elem) {
      if (!elem) {
        return (this[0] && this[0].parentNode) ? this.first().prevAll().length : -1;
      }
      if (typeof elem === "string") {
        return indexOf.call(jQuery(elem), this[0]);
      }
      return indexOf.call(this, elem.jquery ? elem[0] : elem);
    },
    add: function(selector, context) {
      return this.pushStack(jQuery.uniqueSort(jQuery.merge(this.get(), jQuery(selector, context))));
    },
    addBack: function(selector) {
      return this.add(selector == null ? this.prevObject : this.prevObject.filter(selector));
    }
  });
  function sibling(cur, dir) {
    while ((cur = cur[dir]) && cur.nodeType !== 1) {}
    return cur;
  }
  jQuery.each({
    parent: function(elem) {
      var parent = elem.parentNode;
      return parent && parent.nodeType !== 11 ? parent : null;
    },
    parents: function(elem) {
      return dir(elem, "parentNode");
    },
    parentsUntil: function(elem, i, until) {
      return dir(elem, "parentNode", until);
    },
    next: function(elem) {
      return sibling(elem, "nextSibling");
    },
    prev: function(elem) {
      return sibling(elem, "previousSibling");
    },
    nextAll: function(elem) {
      return dir(elem, "nextSibling");
    },
    prevAll: function(elem) {
      return dir(elem, "previousSibling");
    },
    nextUntil: function(elem, i, until) {
      return dir(elem, "nextSibling", until);
    },
    prevUntil: function(elem, i, until) {
      return dir(elem, "previousSibling", until);
    },
    siblings: function(elem) {
      return siblings((elem.parentNode || {}).firstChild, elem);
    },
    children: function(elem) {
      return siblings(elem.firstChild);
    },
    contents: function(elem) {
      return elem.contentDocument || jQuery.merge([], elem.childNodes);
    }
  }, function(name, fn) {
    jQuery.fn[name] = function(until, selector) {
      var matched = jQuery.map(this, fn, until);
      if (name.slice(-5) !== "Until") {
        selector = until;
      }
      if (selector && typeof selector === "string") {
        matched = jQuery.filter(selector, matched);
      }
      if (this.length > 1) {
        if (!guaranteedUnique[name]) {
          jQuery.uniqueSort(matched);
        }
        if (rparentsprev.test(name)) {
          matched.reverse();
        }
      }
      return this.pushStack(matched);
    };
  });
  var rnothtmlwhite = (/[^\x20\t\r\n\f]+/g);
  function createOptions(options) {
    var object = {};
    jQuery.each(options.match(rnothtmlwhite) || [], function(_, flag) {
      object[flag] = true;
    });
    return object;
  }
  jQuery.Callbacks = function(options) {
    options = typeof options === "string" ? createOptions(options) : jQuery.extend({}, options);
    var firing,
        memory,
        fired,
        locked,
        list = [],
        queue = [],
        firingIndex = -1,
        fire = function() {
          locked = options.once;
          fired = firing = true;
          for (; queue.length; firingIndex = -1) {
            memory = queue.shift();
            while (++firingIndex < list.length) {
              if (list[firingIndex].apply(memory[0], memory[1]) === false && options.stopOnFalse) {
                firingIndex = list.length;
                memory = false;
              }
            }
          }
          if (!options.memory) {
            memory = false;
          }
          firing = false;
          if (locked) {
            if (memory) {
              list = [];
            } else {
              list = "";
            }
          }
        },
        self = {
          add: function() {
            if (list) {
              if (memory && !firing) {
                firingIndex = list.length - 1;
                queue.push(memory);
              }
              (function add(args) {
                jQuery.each(args, function(_, arg) {
                  if (jQuery.isFunction(arg)) {
                    if (!options.unique || !self.has(arg)) {
                      list.push(arg);
                    }
                  } else if (arg && arg.length && jQuery.type(arg) !== "string") {
                    add(arg);
                  }
                });
              })(arguments);
              if (memory && !firing) {
                fire();
              }
            }
            return this;
          },
          remove: function() {
            jQuery.each(arguments, function(_, arg) {
              var index;
              while ((index = jQuery.inArray(arg, list, index)) > -1) {
                list.splice(index, 1);
                if (index <= firingIndex) {
                  firingIndex--;
                }
              }
            });
            return this;
          },
          has: function(fn) {
            return fn ? jQuery.inArray(fn, list) > -1 : list.length > 0;
          },
          empty: function() {
            if (list) {
              list = [];
            }
            return this;
          },
          disable: function() {
            locked = queue = [];
            list = memory = "";
            return this;
          },
          disabled: function() {
            return !list;
          },
          lock: function() {
            locked = queue = [];
            if (!memory && !firing) {
              list = memory = "";
            }
            return this;
          },
          locked: function() {
            return !!locked;
          },
          fireWith: function(context, args) {
            if (!locked) {
              args = args || [];
              args = [context, args.slice ? args.slice() : args];
              queue.push(args);
              if (!firing) {
                fire();
              }
            }
            return this;
          },
          fire: function() {
            self.fireWith(this, arguments);
            return this;
          },
          fired: function() {
            return !!fired;
          }
        };
    return self;
  };
  function Identity(v) {
    return v;
  }
  function Thrower(ex) {
    throw ex;
  }
  function adoptValue(value, resolve, reject) {
    var method;
    try {
      if (value && jQuery.isFunction((method = value.promise))) {
        method.call(value).done(resolve).fail(reject);
      } else if (value && jQuery.isFunction((method = value.then))) {
        method.call(value, resolve, reject);
      } else {
        resolve.call(undefined, value);
      }
    } catch (value) {
      reject.call(undefined, value);
    }
  }
  jQuery.extend({
    Deferred: function(func) {
      var tuples = [["notify", "progress", jQuery.Callbacks("memory"), jQuery.Callbacks("memory"), 2], ["resolve", "done", jQuery.Callbacks("once memory"), jQuery.Callbacks("once memory"), 0, "resolved"], ["reject", "fail", jQuery.Callbacks("once memory"), jQuery.Callbacks("once memory"), 1, "rejected"]],
          state = "pending",
          promise = {
            state: function() {
              return state;
            },
            always: function() {
              deferred.done(arguments).fail(arguments);
              return this;
            },
            "catch": function(fn) {
              return promise.then(null, fn);
            },
            pipe: function() {
              var fns = arguments;
              return jQuery.Deferred(function(newDefer) {
                jQuery.each(tuples, function(i, tuple) {
                  var fn = jQuery.isFunction(fns[tuple[4]]) && fns[tuple[4]];
                  deferred[tuple[1]](function() {
                    var returned = fn && fn.apply(this, arguments);
                    if (returned && jQuery.isFunction(returned.promise)) {
                      returned.promise().progress(newDefer.notify).done(newDefer.resolve).fail(newDefer.reject);
                    } else {
                      newDefer[tuple[0] + "With"](this, fn ? [returned] : arguments);
                    }
                  });
                });
                fns = null;
              }).promise();
            },
            then: function(onFulfilled, onRejected, onProgress) {
              var maxDepth = 0;
              function resolve(depth, deferred, handler, special) {
                return function() {
                  var that = this,
                      args = arguments,
                      mightThrow = function() {
                        var returned,
                            then;
                        if (depth < maxDepth) {
                          return;
                        }
                        returned = handler.apply(that, args);
                        if (returned === deferred.promise()) {
                          throw new TypeError("Thenable self-resolution");
                        }
                        then = returned && (typeof returned === "object" || typeof returned === "function") && returned.then;
                        if (jQuery.isFunction(then)) {
                          if (special) {
                            then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special));
                          } else {
                            maxDepth++;
                            then.call(returned, resolve(maxDepth, deferred, Identity, special), resolve(maxDepth, deferred, Thrower, special), resolve(maxDepth, deferred, Identity, deferred.notifyWith));
                          }
                        } else {
                          if (handler !== Identity) {
                            that = undefined;
                            args = [returned];
                          }
                          (special || deferred.resolveWith)(that, args);
                        }
                      },
                      process = special ? mightThrow : function() {
                        try {
                          mightThrow();
                        } catch (e) {
                          if (jQuery.Deferred.exceptionHook) {
                            jQuery.Deferred.exceptionHook(e, process.stackTrace);
                          }
                          if (depth + 1 >= maxDepth) {
                            if (handler !== Thrower) {
                              that = undefined;
                              args = [e];
                            }
                            deferred.rejectWith(that, args);
                          }
                        }
                      };
                  if (depth) {
                    process();
                  } else {
                    if (jQuery.Deferred.getStackHook) {
                      process.stackTrace = jQuery.Deferred.getStackHook();
                    }
                    window.setTimeout(process);
                  }
                };
              }
              return jQuery.Deferred(function(newDefer) {
                tuples[0][3].add(resolve(0, newDefer, jQuery.isFunction(onProgress) ? onProgress : Identity, newDefer.notifyWith));
                tuples[1][3].add(resolve(0, newDefer, jQuery.isFunction(onFulfilled) ? onFulfilled : Identity));
                tuples[2][3].add(resolve(0, newDefer, jQuery.isFunction(onRejected) ? onRejected : Thrower));
              }).promise();
            },
            promise: function(obj) {
              return obj != null ? jQuery.extend(obj, promise) : promise;
            }
          },
          deferred = {};
      jQuery.each(tuples, function(i, tuple) {
        var list = tuple[2],
            stateString = tuple[5];
        promise[tuple[1]] = list.add;
        if (stateString) {
          list.add(function() {
            state = stateString;
          }, tuples[3 - i][2].disable, tuples[0][2].lock);
        }
        list.add(tuple[3].fire);
        deferred[tuple[0]] = function() {
          deferred[tuple[0] + "With"](this === deferred ? undefined : this, arguments);
          return this;
        };
        deferred[tuple[0] + "With"] = list.fireWith;
      });
      promise.promise(deferred);
      if (func) {
        func.call(deferred, deferred);
      }
      return deferred;
    },
    when: function(singleValue) {
      var remaining = arguments.length,
          i = remaining,
          resolveContexts = Array(i),
          resolveValues = slice.call(arguments),
          master = jQuery.Deferred(),
          updateFunc = function(i) {
            return function(value) {
              resolveContexts[i] = this;
              resolveValues[i] = arguments.length > 1 ? slice.call(arguments) : value;
              if (!(--remaining)) {
                master.resolveWith(resolveContexts, resolveValues);
              }
            };
          };
      if (remaining <= 1) {
        adoptValue(singleValue, master.done(updateFunc(i)).resolve, master.reject);
        if (master.state() === "pending" || jQuery.isFunction(resolveValues[i] && resolveValues[i].then)) {
          return master.then();
        }
      }
      while (i--) {
        adoptValue(resolveValues[i], updateFunc(i), master.reject);
      }
      return master.promise();
    }
  });
  var rerrorNames = /^(Eval|Internal|Range|Reference|Syntax|Type|URI)Error$/;
  jQuery.Deferred.exceptionHook = function(error, stack) {
    if (window.console && window.console.warn && error && rerrorNames.test(error.name)) {
      window.console.warn("jQuery.Deferred exception: " + error.message, error.stack, stack);
    }
  };
  jQuery.readyException = function(error) {
    window.setTimeout(function() {
      throw error;
    });
  };
  var readyList = jQuery.Deferred();
  jQuery.fn.ready = function(fn) {
    readyList.then(fn).catch(function(error) {
      jQuery.readyException(error);
    });
    return this;
  };
  jQuery.extend({
    isReady: false,
    readyWait: 1,
    holdReady: function(hold) {
      if (hold) {
        jQuery.readyWait++;
      } else {
        jQuery.ready(true);
      }
    },
    ready: function(wait) {
      if (wait === true ? --jQuery.readyWait : jQuery.isReady) {
        return;
      }
      jQuery.isReady = true;
      if (wait !== true && --jQuery.readyWait > 0) {
        return;
      }
      readyList.resolveWith(document, [jQuery]);
    }
  });
  jQuery.ready.then = readyList.then;
  function completed() {
    document.removeEventListener("DOMContentLoaded", completed);
    window.removeEventListener("load", completed);
    jQuery.ready();
  }
  if (document.readyState === "complete" || (document.readyState !== "loading" && !document.documentElement.doScroll)) {
    window.setTimeout(jQuery.ready);
  } else {
    document.addEventListener("DOMContentLoaded", completed);
    window.addEventListener("load", completed);
  }
  var access = function(elems, fn, key, value, chainable, emptyGet, raw) {
    var i = 0,
        len = elems.length,
        bulk = key == null;
    if (jQuery.type(key) === "object") {
      chainable = true;
      for (i in key) {
        access(elems, fn, i, key[i], true, emptyGet, raw);
      }
    } else if (value !== undefined) {
      chainable = true;
      if (!jQuery.isFunction(value)) {
        raw = true;
      }
      if (bulk) {
        if (raw) {
          fn.call(elems, value);
          fn = null;
        } else {
          bulk = fn;
          fn = function(elem, key, value) {
            return bulk.call(jQuery(elem), value);
          };
        }
      }
      if (fn) {
        for (; i < len; i++) {
          fn(elems[i], key, raw ? value : value.call(elems[i], i, fn(elems[i], key)));
        }
      }
    }
    if (chainable) {
      return elems;
    }
    if (bulk) {
      return fn.call(elems);
    }
    return len ? fn(elems[0], key) : emptyGet;
  };
  var acceptData = function(owner) {
    return owner.nodeType === 1 || owner.nodeType === 9 || !(+owner.nodeType);
  };
  function Data() {
    this.expando = jQuery.expando + Data.uid++;
  }
  Data.uid = 1;
  Data.prototype = {
    cache: function(owner) {
      var value = owner[this.expando];
      if (!value) {
        value = {};
        if (acceptData(owner)) {
          if (owner.nodeType) {
            owner[this.expando] = value;
          } else {
            Object.defineProperty(owner, this.expando, {
              value: value,
              configurable: true
            });
          }
        }
      }
      return value;
    },
    set: function(owner, data, value) {
      var prop,
          cache = this.cache(owner);
      if (typeof data === "string") {
        cache[jQuery.camelCase(data)] = value;
      } else {
        for (prop in data) {
          cache[jQuery.camelCase(prop)] = data[prop];
        }
      }
      return cache;
    },
    get: function(owner, key) {
      return key === undefined ? this.cache(owner) : owner[this.expando] && owner[this.expando][jQuery.camelCase(key)];
    },
    access: function(owner, key, value) {
      if (key === undefined || ((key && typeof key === "string") && value === undefined)) {
        return this.get(owner, key);
      }
      this.set(owner, key, value);
      return value !== undefined ? value : key;
    },
    remove: function(owner, key) {
      var i,
          cache = owner[this.expando];
      if (cache === undefined) {
        return;
      }
      if (key !== undefined) {
        if (jQuery.isArray(key)) {
          key = key.map(jQuery.camelCase);
        } else {
          key = jQuery.camelCase(key);
          key = key in cache ? [key] : (key.match(rnothtmlwhite) || []);
        }
        i = key.length;
        while (i--) {
          delete cache[key[i]];
        }
      }
      if (key === undefined || jQuery.isEmptyObject(cache)) {
        if (owner.nodeType) {
          owner[this.expando] = undefined;
        } else {
          delete owner[this.expando];
        }
      }
    },
    hasData: function(owner) {
      var cache = owner[this.expando];
      return cache !== undefined && !jQuery.isEmptyObject(cache);
    }
  };
  var dataPriv = new Data();
  var dataUser = new Data();
  var rbrace = /^(?:\{[\w\W]*\}|\[[\w\W]*\])$/,
      rmultiDash = /[A-Z]/g;
  function getData(data) {
    if (data === "true") {
      return true;
    }
    if (data === "false") {
      return false;
    }
    if (data === "null") {
      return null;
    }
    if (data === +data + "") {
      return +data;
    }
    if (rbrace.test(data)) {
      return JSON.parse(data);
    }
    return data;
  }
  function dataAttr(elem, key, data) {
    var name;
    if (data === undefined && elem.nodeType === 1) {
      name = "data-" + key.replace(rmultiDash, "-$&").toLowerCase();
      data = elem.getAttribute(name);
      if (typeof data === "string") {
        try {
          data = getData(data);
        } catch (e) {}
        dataUser.set(elem, key, data);
      } else {
        data = undefined;
      }
    }
    return data;
  }
  jQuery.extend({
    hasData: function(elem) {
      return dataUser.hasData(elem) || dataPriv.hasData(elem);
    },
    data: function(elem, name, data) {
      return dataUser.access(elem, name, data);
    },
    removeData: function(elem, name) {
      dataUser.remove(elem, name);
    },
    _data: function(elem, name, data) {
      return dataPriv.access(elem, name, data);
    },
    _removeData: function(elem, name) {
      dataPriv.remove(elem, name);
    }
  });
  jQuery.fn.extend({
    data: function(key, value) {
      var i,
          name,
          data,
          elem = this[0],
          attrs = elem && elem.attributes;
      if (key === undefined) {
        if (this.length) {
          data = dataUser.get(elem);
          if (elem.nodeType === 1 && !dataPriv.get(elem, "hasDataAttrs")) {
            i = attrs.length;
            while (i--) {
              if (attrs[i]) {
                name = attrs[i].name;
                if (name.indexOf("data-") === 0) {
                  name = jQuery.camelCase(name.slice(5));
                  dataAttr(elem, name, data[name]);
                }
              }
            }
            dataPriv.set(elem, "hasDataAttrs", true);
          }
        }
        return data;
      }
      if (typeof key === "object") {
        return this.each(function() {
          dataUser.set(this, key);
        });
      }
      return access(this, function(value) {
        var data;
        if (elem && value === undefined) {
          data = dataUser.get(elem, key);
          if (data !== undefined) {
            return data;
          }
          data = dataAttr(elem, key);
          if (data !== undefined) {
            return data;
          }
          return;
        }
        this.each(function() {
          dataUser.set(this, key, value);
        });
      }, null, value, arguments.length > 1, null, true);
    },
    removeData: function(key) {
      return this.each(function() {
        dataUser.remove(this, key);
      });
    }
  });
  jQuery.extend({
    queue: function(elem, type, data) {
      var queue;
      if (elem) {
        type = (type || "fx") + "queue";
        queue = dataPriv.get(elem, type);
        if (data) {
          if (!queue || jQuery.isArray(data)) {
            queue = dataPriv.access(elem, type, jQuery.makeArray(data));
          } else {
            queue.push(data);
          }
        }
        return queue || [];
      }
    },
    dequeue: function(elem, type) {
      type = type || "fx";
      var queue = jQuery.queue(elem, type),
          startLength = queue.length,
          fn = queue.shift(),
          hooks = jQuery._queueHooks(elem, type),
          next = function() {
            jQuery.dequeue(elem, type);
          };
      if (fn === "inprogress") {
        fn = queue.shift();
        startLength--;
      }
      if (fn) {
        if (type === "fx") {
          queue.unshift("inprogress");
        }
        delete hooks.stop;
        fn.call(elem, next, hooks);
      }
      if (!startLength && hooks) {
        hooks.empty.fire();
      }
    },
    _queueHooks: function(elem, type) {
      var key = type + "queueHooks";
      return dataPriv.get(elem, key) || dataPriv.access(elem, key, {empty: jQuery.Callbacks("once memory").add(function() {
          dataPriv.remove(elem, [type + "queue", key]);
        })});
    }
  });
  jQuery.fn.extend({
    queue: function(type, data) {
      var setter = 2;
      if (typeof type !== "string") {
        data = type;
        type = "fx";
        setter--;
      }
      if (arguments.length < setter) {
        return jQuery.queue(this[0], type);
      }
      return data === undefined ? this : this.each(function() {
        var queue = jQuery.queue(this, type, data);
        jQuery._queueHooks(this, type);
        if (type === "fx" && queue[0] !== "inprogress") {
          jQuery.dequeue(this, type);
        }
      });
    },
    dequeue: function(type) {
      return this.each(function() {
        jQuery.dequeue(this, type);
      });
    },
    clearQueue: function(type) {
      return this.queue(type || "fx", []);
    },
    promise: function(type, obj) {
      var tmp,
          count = 1,
          defer = jQuery.Deferred(),
          elements = this,
          i = this.length,
          resolve = function() {
            if (!(--count)) {
              defer.resolveWith(elements, [elements]);
            }
          };
      if (typeof type !== "string") {
        obj = type;
        type = undefined;
      }
      type = type || "fx";
      while (i--) {
        tmp = dataPriv.get(elements[i], type + "queueHooks");
        if (tmp && tmp.empty) {
          count++;
          tmp.empty.add(resolve);
        }
      }
      resolve();
      return defer.promise(obj);
    }
  });
  var pnum = (/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/).source;
  var rcssNum = new RegExp("^(?:([+-])=|)(" + pnum + ")([a-z%]*)$", "i");
  var cssExpand = ["Top", "Right", "Bottom", "Left"];
  var isHiddenWithinTree = function(elem, el) {
    elem = el || elem;
    return elem.style.display === "none" || elem.style.display === "" && jQuery.contains(elem.ownerDocument, elem) && jQuery.css(elem, "display") === "none";
  };
  var swap = function(elem, options, callback, args) {
    var ret,
        name,
        old = {};
    for (name in options) {
      old[name] = elem.style[name];
      elem.style[name] = options[name];
    }
    ret = callback.apply(elem, args || []);
    for (name in options) {
      elem.style[name] = old[name];
    }
    return ret;
  };
  function adjustCSS(elem, prop, valueParts, tween) {
    var adjusted,
        scale = 1,
        maxIterations = 20,
        currentValue = tween ? function() {
          return tween.cur();
        } : function() {
          return jQuery.css(elem, prop, "");
        },
        initial = currentValue(),
        unit = valueParts && valueParts[3] || (jQuery.cssNumber[prop] ? "" : "px"),
        initialInUnit = (jQuery.cssNumber[prop] || unit !== "px" && +initial) && rcssNum.exec(jQuery.css(elem, prop));
    if (initialInUnit && initialInUnit[3] !== unit) {
      unit = unit || initialInUnit[3];
      valueParts = valueParts || [];
      initialInUnit = +initial || 1;
      do {
        scale = scale || ".5";
        initialInUnit = initialInUnit / scale;
        jQuery.style(elem, prop, initialInUnit + unit);
      } while (scale !== (scale = currentValue() / initial) && scale !== 1 && --maxIterations);
    }
    if (valueParts) {
      initialInUnit = +initialInUnit || +initial || 0;
      adjusted = valueParts[1] ? initialInUnit + (valueParts[1] + 1) * valueParts[2] : +valueParts[2];
      if (tween) {
        tween.unit = unit;
        tween.start = initialInUnit;
        tween.end = adjusted;
      }
    }
    return adjusted;
  }
  var defaultDisplayMap = {};
  function getDefaultDisplay(elem) {
    var temp,
        doc = elem.ownerDocument,
        nodeName = elem.nodeName,
        display = defaultDisplayMap[nodeName];
    if (display) {
      return display;
    }
    temp = doc.body.appendChild(doc.createElement(nodeName));
    display = jQuery.css(temp, "display");
    temp.parentNode.removeChild(temp);
    if (display === "none") {
      display = "block";
    }
    defaultDisplayMap[nodeName] = display;
    return display;
  }
  function showHide(elements, show) {
    var display,
        elem,
        values = [],
        index = 0,
        length = elements.length;
    for (; index < length; index++) {
      elem = elements[index];
      if (!elem.style) {
        continue;
      }
      display = elem.style.display;
      if (show) {
        if (display === "none") {
          values[index] = dataPriv.get(elem, "display") || null;
          if (!values[index]) {
            elem.style.display = "";
          }
        }
        if (elem.style.display === "" && isHiddenWithinTree(elem)) {
          values[index] = getDefaultDisplay(elem);
        }
      } else {
        if (display !== "none") {
          values[index] = "none";
          dataPriv.set(elem, "display", display);
        }
      }
    }
    for (index = 0; index < length; index++) {
      if (values[index] != null) {
        elements[index].style.display = values[index];
      }
    }
    return elements;
  }
  jQuery.fn.extend({
    show: function() {
      return showHide(this, true);
    },
    hide: function() {
      return showHide(this);
    },
    toggle: function(state) {
      if (typeof state === "boolean") {
        return state ? this.show() : this.hide();
      }
      return this.each(function() {
        if (isHiddenWithinTree(this)) {
          jQuery(this).show();
        } else {
          jQuery(this).hide();
        }
      });
    }
  });
  var rcheckableType = (/^(?:checkbox|radio)$/i);
  var rtagName = (/<([a-z][^\/\0>\x20\t\r\n\f]+)/i);
  var rscriptType = (/^$|\/(?:java|ecma)script/i);
  var wrapMap = {
    option: [1, "<select multiple='multiple'>", "</select>"],
    thead: [1, "<table>", "</table>"],
    col: [2, "<table><colgroup>", "</colgroup></table>"],
    tr: [2, "<table><tbody>", "</tbody></table>"],
    td: [3, "<table><tbody><tr>", "</tr></tbody></table>"],
    _default: [0, "", ""]
  };
  wrapMap.optgroup = wrapMap.option;
  wrapMap.tbody = wrapMap.tfoot = wrapMap.colgroup = wrapMap.caption = wrapMap.thead;
  wrapMap.th = wrapMap.td;
  function getAll(context, tag) {
    var ret;
    if (typeof context.getElementsByTagName !== "undefined") {
      ret = context.getElementsByTagName(tag || "*");
    } else if (typeof context.querySelectorAll !== "undefined") {
      ret = context.querySelectorAll(tag || "*");
    } else {
      ret = [];
    }
    if (tag === undefined || tag && jQuery.nodeName(context, tag)) {
      return jQuery.merge([context], ret);
    }
    return ret;
  }
  function setGlobalEval(elems, refElements) {
    var i = 0,
        l = elems.length;
    for (; i < l; i++) {
      dataPriv.set(elems[i], "globalEval", !refElements || dataPriv.get(refElements[i], "globalEval"));
    }
  }
  var rhtml = /<|&#?\w+;/;
  function buildFragment(elems, context, scripts, selection, ignored) {
    var elem,
        tmp,
        tag,
        wrap,
        contains,
        j,
        fragment = context.createDocumentFragment(),
        nodes = [],
        i = 0,
        l = elems.length;
    for (; i < l; i++) {
      elem = elems[i];
      if (elem || elem === 0) {
        if (jQuery.type(elem) === "object") {
          jQuery.merge(nodes, elem.nodeType ? [elem] : elem);
        } else if (!rhtml.test(elem)) {
          nodes.push(context.createTextNode(elem));
        } else {
          tmp = tmp || fragment.appendChild(context.createElement("div"));
          tag = (rtagName.exec(elem) || ["", ""])[1].toLowerCase();
          wrap = wrapMap[tag] || wrapMap._default;
          tmp.innerHTML = wrap[1] + jQuery.htmlPrefilter(elem) + wrap[2];
          j = wrap[0];
          while (j--) {
            tmp = tmp.lastChild;
          }
          jQuery.merge(nodes, tmp.childNodes);
          tmp = fragment.firstChild;
          tmp.textContent = "";
        }
      }
    }
    fragment.textContent = "";
    i = 0;
    while ((elem = nodes[i++])) {
      if (selection && jQuery.inArray(elem, selection) > -1) {
        if (ignored) {
          ignored.push(elem);
        }
        continue;
      }
      contains = jQuery.contains(elem.ownerDocument, elem);
      tmp = getAll(fragment.appendChild(elem), "script");
      if (contains) {
        setGlobalEval(tmp);
      }
      if (scripts) {
        j = 0;
        while ((elem = tmp[j++])) {
          if (rscriptType.test(elem.type || "")) {
            scripts.push(elem);
          }
        }
      }
    }
    return fragment;
  }
  (function() {
    var fragment = document.createDocumentFragment(),
        div = fragment.appendChild(document.createElement("div")),
        input = document.createElement("input");
    input.setAttribute("type", "radio");
    input.setAttribute("checked", "checked");
    input.setAttribute("name", "t");
    div.appendChild(input);
    support.checkClone = div.cloneNode(true).cloneNode(true).lastChild.checked;
    div.innerHTML = "<textarea>x</textarea>";
    support.noCloneChecked = !!div.cloneNode(true).lastChild.defaultValue;
  })();
  var documentElement = document.documentElement;
  var rkeyEvent = /^key/,
      rmouseEvent = /^(?:mouse|pointer|contextmenu|drag|drop)|click/,
      rtypenamespace = /^([^.]*)(?:\.(.+)|)/;
  function returnTrue() {
    return true;
  }
  function returnFalse() {
    return false;
  }
  function safeActiveElement() {
    try {
      return document.activeElement;
    } catch (err) {}
  }
  function on(elem, types, selector, data, fn, one) {
    var origFn,
        type;
    if (typeof types === "object") {
      if (typeof selector !== "string") {
        data = data || selector;
        selector = undefined;
      }
      for (type in types) {
        on(elem, type, selector, data, types[type], one);
      }
      return elem;
    }
    if (data == null && fn == null) {
      fn = selector;
      data = selector = undefined;
    } else if (fn == null) {
      if (typeof selector === "string") {
        fn = data;
        data = undefined;
      } else {
        fn = data;
        data = selector;
        selector = undefined;
      }
    }
    if (fn === false) {
      fn = returnFalse;
    } else if (!fn) {
      return elem;
    }
    if (one === 1) {
      origFn = fn;
      fn = function(event) {
        jQuery().off(event);
        return origFn.apply(this, arguments);
      };
      fn.guid = origFn.guid || (origFn.guid = jQuery.guid++);
    }
    return elem.each(function() {
      jQuery.event.add(this, types, fn, data, selector);
    });
  }
  jQuery.event = {
    global: {},
    add: function(elem, types, handler, data, selector) {
      var handleObjIn,
          eventHandle,
          tmp,
          events,
          t,
          handleObj,
          special,
          handlers,
          type,
          namespaces,
          origType,
          elemData = dataPriv.get(elem);
      if (!elemData) {
        return;
      }
      if (handler.handler) {
        handleObjIn = handler;
        handler = handleObjIn.handler;
        selector = handleObjIn.selector;
      }
      if (selector) {
        jQuery.find.matchesSelector(documentElement, selector);
      }
      if (!handler.guid) {
        handler.guid = jQuery.guid++;
      }
      if (!(events = elemData.events)) {
        events = elemData.events = {};
      }
      if (!(eventHandle = elemData.handle)) {
        eventHandle = elemData.handle = function(e) {
          return typeof jQuery !== "undefined" && jQuery.event.triggered !== e.type ? jQuery.event.dispatch.apply(elem, arguments) : undefined;
        };
      }
      types = (types || "").match(rnothtmlwhite) || [""];
      t = types.length;
      while (t--) {
        tmp = rtypenamespace.exec(types[t]) || [];
        type = origType = tmp[1];
        namespaces = (tmp[2] || "").split(".").sort();
        if (!type) {
          continue;
        }
        special = jQuery.event.special[type] || {};
        type = (selector ? special.delegateType : special.bindType) || type;
        special = jQuery.event.special[type] || {};
        handleObj = jQuery.extend({
          type: type,
          origType: origType,
          data: data,
          handler: handler,
          guid: handler.guid,
          selector: selector,
          needsContext: selector && jQuery.expr.match.needsContext.test(selector),
          namespace: namespaces.join(".")
        }, handleObjIn);
        if (!(handlers = events[type])) {
          handlers = events[type] = [];
          handlers.delegateCount = 0;
          if (!special.setup || special.setup.call(elem, data, namespaces, eventHandle) === false) {
            if (elem.addEventListener) {
              elem.addEventListener(type, eventHandle);
            }
          }
        }
        if (special.add) {
          special.add.call(elem, handleObj);
          if (!handleObj.handler.guid) {
            handleObj.handler.guid = handler.guid;
          }
        }
        if (selector) {
          handlers.splice(handlers.delegateCount++, 0, handleObj);
        } else {
          handlers.push(handleObj);
        }
        jQuery.event.global[type] = true;
      }
    },
    remove: function(elem, types, handler, selector, mappedTypes) {
      var j,
          origCount,
          tmp,
          events,
          t,
          handleObj,
          special,
          handlers,
          type,
          namespaces,
          origType,
          elemData = dataPriv.hasData(elem) && dataPriv.get(elem);
      if (!elemData || !(events = elemData.events)) {
        return;
      }
      types = (types || "").match(rnothtmlwhite) || [""];
      t = types.length;
      while (t--) {
        tmp = rtypenamespace.exec(types[t]) || [];
        type = origType = tmp[1];
        namespaces = (tmp[2] || "").split(".").sort();
        if (!type) {
          for (type in events) {
            jQuery.event.remove(elem, type + types[t], handler, selector, true);
          }
          continue;
        }
        special = jQuery.event.special[type] || {};
        type = (selector ? special.delegateType : special.bindType) || type;
        handlers = events[type] || [];
        tmp = tmp[2] && new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)");
        origCount = j = handlers.length;
        while (j--) {
          handleObj = handlers[j];
          if ((mappedTypes || origType === handleObj.origType) && (!handler || handler.guid === handleObj.guid) && (!tmp || tmp.test(handleObj.namespace)) && (!selector || selector === handleObj.selector || selector === "**" && handleObj.selector)) {
            handlers.splice(j, 1);
            if (handleObj.selector) {
              handlers.delegateCount--;
            }
            if (special.remove) {
              special.remove.call(elem, handleObj);
            }
          }
        }
        if (origCount && !handlers.length) {
          if (!special.teardown || special.teardown.call(elem, namespaces, elemData.handle) === false) {
            jQuery.removeEvent(elem, type, elemData.handle);
          }
          delete events[type];
        }
      }
      if (jQuery.isEmptyObject(events)) {
        dataPriv.remove(elem, "handle events");
      }
    },
    dispatch: function(nativeEvent) {
      var event = jQuery.event.fix(nativeEvent);
      var i,
          j,
          ret,
          matched,
          handleObj,
          handlerQueue,
          args = new Array(arguments.length),
          handlers = (dataPriv.get(this, "events") || {})[event.type] || [],
          special = jQuery.event.special[event.type] || {};
      args[0] = event;
      for (i = 1; i < arguments.length; i++) {
        args[i] = arguments[i];
      }
      event.delegateTarget = this;
      if (special.preDispatch && special.preDispatch.call(this, event) === false) {
        return;
      }
      handlerQueue = jQuery.event.handlers.call(this, event, handlers);
      i = 0;
      while ((matched = handlerQueue[i++]) && !event.isPropagationStopped()) {
        event.currentTarget = matched.elem;
        j = 0;
        while ((handleObj = matched.handlers[j++]) && !event.isImmediatePropagationStopped()) {
          if (!event.rnamespace || event.rnamespace.test(handleObj.namespace)) {
            event.handleObj = handleObj;
            event.data = handleObj.data;
            ret = ((jQuery.event.special[handleObj.origType] || {}).handle || handleObj.handler).apply(matched.elem, args);
            if (ret !== undefined) {
              if ((event.result = ret) === false) {
                event.preventDefault();
                event.stopPropagation();
              }
            }
          }
        }
      }
      if (special.postDispatch) {
        special.postDispatch.call(this, event);
      }
      return event.result;
    },
    handlers: function(event, handlers) {
      var i,
          handleObj,
          sel,
          matchedHandlers,
          matchedSelectors,
          handlerQueue = [],
          delegateCount = handlers.delegateCount,
          cur = event.target;
      if (delegateCount && cur.nodeType && !(event.type === "click" && event.button >= 1)) {
        for (; cur !== this; cur = cur.parentNode || this) {
          if (cur.nodeType === 1 && !(event.type === "click" && cur.disabled === true)) {
            matchedHandlers = [];
            matchedSelectors = {};
            for (i = 0; i < delegateCount; i++) {
              handleObj = handlers[i];
              sel = handleObj.selector + " ";
              if (matchedSelectors[sel] === undefined) {
                matchedSelectors[sel] = handleObj.needsContext ? jQuery(sel, this).index(cur) > -1 : jQuery.find(sel, this, null, [cur]).length;
              }
              if (matchedSelectors[sel]) {
                matchedHandlers.push(handleObj);
              }
            }
            if (matchedHandlers.length) {
              handlerQueue.push({
                elem: cur,
                handlers: matchedHandlers
              });
            }
          }
        }
      }
      cur = this;
      if (delegateCount < handlers.length) {
        handlerQueue.push({
          elem: cur,
          handlers: handlers.slice(delegateCount)
        });
      }
      return handlerQueue;
    },
    addProp: function(name, hook) {
      Object.defineProperty(jQuery.Event.prototype, name, {
        enumerable: true,
        configurable: true,
        get: jQuery.isFunction(hook) ? function() {
          if (this.originalEvent) {
            return hook(this.originalEvent);
          }
        } : function() {
          if (this.originalEvent) {
            return this.originalEvent[name];
          }
        },
        set: function(value) {
          Object.defineProperty(this, name, {
            enumerable: true,
            configurable: true,
            writable: true,
            value: value
          });
        }
      });
    },
    fix: function(originalEvent) {
      return originalEvent[jQuery.expando] ? originalEvent : new jQuery.Event(originalEvent);
    },
    special: {
      load: {noBubble: true},
      focus: {
        trigger: function() {
          if (this !== safeActiveElement() && this.focus) {
            this.focus();
            return false;
          }
        },
        delegateType: "focusin"
      },
      blur: {
        trigger: function() {
          if (this === safeActiveElement() && this.blur) {
            this.blur();
            return false;
          }
        },
        delegateType: "focusout"
      },
      click: {
        trigger: function() {
          if (this.type === "checkbox" && this.click && jQuery.nodeName(this, "input")) {
            this.click();
            return false;
          }
        },
        _default: function(event) {
          return jQuery.nodeName(event.target, "a");
        }
      },
      beforeunload: {postDispatch: function(event) {
          if (event.result !== undefined && event.originalEvent) {
            event.originalEvent.returnValue = event.result;
          }
        }}
    }
  };
  jQuery.removeEvent = function(elem, type, handle) {
    if (elem.removeEventListener) {
      elem.removeEventListener(type, handle);
    }
  };
  jQuery.Event = function(src, props) {
    if (!(this instanceof jQuery.Event)) {
      return new jQuery.Event(src, props);
    }
    if (src && src.type) {
      this.originalEvent = src;
      this.type = src.type;
      this.isDefaultPrevented = src.defaultPrevented || src.defaultPrevented === undefined && src.returnValue === false ? returnTrue : returnFalse;
      this.target = (src.target && src.target.nodeType === 3) ? src.target.parentNode : src.target;
      this.currentTarget = src.currentTarget;
      this.relatedTarget = src.relatedTarget;
    } else {
      this.type = src;
    }
    if (props) {
      jQuery.extend(this, props);
    }
    this.timeStamp = src && src.timeStamp || jQuery.now();
    this[jQuery.expando] = true;
  };
  jQuery.Event.prototype = {
    constructor: jQuery.Event,
    isDefaultPrevented: returnFalse,
    isPropagationStopped: returnFalse,
    isImmediatePropagationStopped: returnFalse,
    isSimulated: false,
    preventDefault: function() {
      var e = this.originalEvent;
      this.isDefaultPrevented = returnTrue;
      if (e && !this.isSimulated) {
        e.preventDefault();
      }
    },
    stopPropagation: function() {
      var e = this.originalEvent;
      this.isPropagationStopped = returnTrue;
      if (e && !this.isSimulated) {
        e.stopPropagation();
      }
    },
    stopImmediatePropagation: function() {
      var e = this.originalEvent;
      this.isImmediatePropagationStopped = returnTrue;
      if (e && !this.isSimulated) {
        e.stopImmediatePropagation();
      }
      this.stopPropagation();
    }
  };
  jQuery.each({
    altKey: true,
    bubbles: true,
    cancelable: true,
    changedTouches: true,
    ctrlKey: true,
    detail: true,
    eventPhase: true,
    metaKey: true,
    pageX: true,
    pageY: true,
    shiftKey: true,
    view: true,
    "char": true,
    charCode: true,
    key: true,
    keyCode: true,
    button: true,
    buttons: true,
    clientX: true,
    clientY: true,
    offsetX: true,
    offsetY: true,
    pointerId: true,
    pointerType: true,
    screenX: true,
    screenY: true,
    targetTouches: true,
    toElement: true,
    touches: true,
    which: function(event) {
      var button = event.button;
      if (event.which == null && rkeyEvent.test(event.type)) {
        return event.charCode != null ? event.charCode : event.keyCode;
      }
      if (!event.which && button !== undefined && rmouseEvent.test(event.type)) {
        if (button & 1) {
          return 1;
        }
        if (button & 2) {
          return 3;
        }
        if (button & 4) {
          return 2;
        }
        return 0;
      }
      return event.which;
    }
  }, jQuery.event.addProp);
  jQuery.each({
    mouseenter: "mouseover",
    mouseleave: "mouseout",
    pointerenter: "pointerover",
    pointerleave: "pointerout"
  }, function(orig, fix) {
    jQuery.event.special[orig] = {
      delegateType: fix,
      bindType: fix,
      handle: function(event) {
        var ret,
            target = this,
            related = event.relatedTarget,
            handleObj = event.handleObj;
        if (!related || (related !== target && !jQuery.contains(target, related))) {
          event.type = handleObj.origType;
          ret = handleObj.handler.apply(this, arguments);
          event.type = fix;
        }
        return ret;
      }
    };
  });
  jQuery.fn.extend({
    on: function(types, selector, data, fn) {
      return on(this, types, selector, data, fn);
    },
    one: function(types, selector, data, fn) {
      return on(this, types, selector, data, fn, 1);
    },
    off: function(types, selector, fn) {
      var handleObj,
          type;
      if (types && types.preventDefault && types.handleObj) {
        handleObj = types.handleObj;
        jQuery(types.delegateTarget).off(handleObj.namespace ? handleObj.origType + "." + handleObj.namespace : handleObj.origType, handleObj.selector, handleObj.handler);
        return this;
      }
      if (typeof types === "object") {
        for (type in types) {
          this.off(type, selector, types[type]);
        }
        return this;
      }
      if (selector === false || typeof selector === "function") {
        fn = selector;
        selector = undefined;
      }
      if (fn === false) {
        fn = returnFalse;
      }
      return this.each(function() {
        jQuery.event.remove(this, types, fn, selector);
      });
    }
  });
  var rxhtmlTag = /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([a-z][^\/\0>\x20\t\r\n\f]*)[^>]*)\/>/gi,
      rnoInnerhtml = /<script|<style|<link/i,
      rchecked = /checked\s*(?:[^=]|=\s*.checked.)/i,
      rscriptTypeMasked = /^true\/(.*)/,
      rcleanScript = /^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g;
  function manipulationTarget(elem, content) {
    if (jQuery.nodeName(elem, "table") && jQuery.nodeName(content.nodeType !== 11 ? content : content.firstChild, "tr")) {
      return elem.getElementsByTagName("tbody")[0] || elem;
    }
    return elem;
  }
  function disableScript(elem) {
    elem.type = (elem.getAttribute("type") !== null) + "/" + elem.type;
    return elem;
  }
  function restoreScript(elem) {
    var match = rscriptTypeMasked.exec(elem.type);
    if (match) {
      elem.type = match[1];
    } else {
      elem.removeAttribute("type");
    }
    return elem;
  }
  function cloneCopyEvent(src, dest) {
    var i,
        l,
        type,
        pdataOld,
        pdataCur,
        udataOld,
        udataCur,
        events;
    if (dest.nodeType !== 1) {
      return;
    }
    if (dataPriv.hasData(src)) {
      pdataOld = dataPriv.access(src);
      pdataCur = dataPriv.set(dest, pdataOld);
      events = pdataOld.events;
      if (events) {
        delete pdataCur.handle;
        pdataCur.events = {};
        for (type in events) {
          for (i = 0, l = events[type].length; i < l; i++) {
            jQuery.event.add(dest, type, events[type][i]);
          }
        }
      }
    }
    if (dataUser.hasData(src)) {
      udataOld = dataUser.access(src);
      udataCur = jQuery.extend({}, udataOld);
      dataUser.set(dest, udataCur);
    }
  }
  function fixInput(src, dest) {
    var nodeName = dest.nodeName.toLowerCase();
    if (nodeName === "input" && rcheckableType.test(src.type)) {
      dest.checked = src.checked;
    } else if (nodeName === "input" || nodeName === "textarea") {
      dest.defaultValue = src.defaultValue;
    }
  }
  function domManip(collection, args, callback, ignored) {
    args = concat.apply([], args);
    var fragment,
        first,
        scripts,
        hasScripts,
        node,
        doc,
        i = 0,
        l = collection.length,
        iNoClone = l - 1,
        value = args[0],
        isFunction = jQuery.isFunction(value);
    if (isFunction || (l > 1 && typeof value === "string" && !support.checkClone && rchecked.test(value))) {
      return collection.each(function(index) {
        var self = collection.eq(index);
        if (isFunction) {
          args[0] = value.call(this, index, self.html());
        }
        domManip(self, args, callback, ignored);
      });
    }
    if (l) {
      fragment = buildFragment(args, collection[0].ownerDocument, false, collection, ignored);
      first = fragment.firstChild;
      if (fragment.childNodes.length === 1) {
        fragment = first;
      }
      if (first || ignored) {
        scripts = jQuery.map(getAll(fragment, "script"), disableScript);
        hasScripts = scripts.length;
        for (; i < l; i++) {
          node = fragment;
          if (i !== iNoClone) {
            node = jQuery.clone(node, true, true);
            if (hasScripts) {
              jQuery.merge(scripts, getAll(node, "script"));
            }
          }
          callback.call(collection[i], node, i);
        }
        if (hasScripts) {
          doc = scripts[scripts.length - 1].ownerDocument;
          jQuery.map(scripts, restoreScript);
          for (i = 0; i < hasScripts; i++) {
            node = scripts[i];
            if (rscriptType.test(node.type || "") && !dataPriv.access(node, "globalEval") && jQuery.contains(doc, node)) {
              if (node.src) {
                if (jQuery._evalUrl) {
                  jQuery._evalUrl(node.src);
                }
              } else {
                DOMEval(node.textContent.replace(rcleanScript, ""), doc);
              }
            }
          }
        }
      }
    }
    return collection;
  }
  function remove(elem, selector, keepData) {
    var node,
        nodes = selector ? jQuery.filter(selector, elem) : elem,
        i = 0;
    for (; (node = nodes[i]) != null; i++) {
      if (!keepData && node.nodeType === 1) {
        jQuery.cleanData(getAll(node));
      }
      if (node.parentNode) {
        if (keepData && jQuery.contains(node.ownerDocument, node)) {
          setGlobalEval(getAll(node, "script"));
        }
        node.parentNode.removeChild(node);
      }
    }
    return elem;
  }
  jQuery.extend({
    htmlPrefilter: function(html) {
      return html.replace(rxhtmlTag, "<$1></$2>");
    },
    clone: function(elem, dataAndEvents, deepDataAndEvents) {
      var i,
          l,
          srcElements,
          destElements,
          clone = elem.cloneNode(true),
          inPage = jQuery.contains(elem.ownerDocument, elem);
      if (!support.noCloneChecked && (elem.nodeType === 1 || elem.nodeType === 11) && !jQuery.isXMLDoc(elem)) {
        destElements = getAll(clone);
        srcElements = getAll(elem);
        for (i = 0, l = srcElements.length; i < l; i++) {
          fixInput(srcElements[i], destElements[i]);
        }
      }
      if (dataAndEvents) {
        if (deepDataAndEvents) {
          srcElements = srcElements || getAll(elem);
          destElements = destElements || getAll(clone);
          for (i = 0, l = srcElements.length; i < l; i++) {
            cloneCopyEvent(srcElements[i], destElements[i]);
          }
        } else {
          cloneCopyEvent(elem, clone);
        }
      }
      destElements = getAll(clone, "script");
      if (destElements.length > 0) {
        setGlobalEval(destElements, !inPage && getAll(elem, "script"));
      }
      return clone;
    },
    cleanData: function(elems) {
      var data,
          elem,
          type,
          special = jQuery.event.special,
          i = 0;
      for (; (elem = elems[i]) !== undefined; i++) {
        if (acceptData(elem)) {
          if ((data = elem[dataPriv.expando])) {
            if (data.events) {
              for (type in data.events) {
                if (special[type]) {
                  jQuery.event.remove(elem, type);
                } else {
                  jQuery.removeEvent(elem, type, data.handle);
                }
              }
            }
            elem[dataPriv.expando] = undefined;
          }
          if (elem[dataUser.expando]) {
            elem[dataUser.expando] = undefined;
          }
        }
      }
    }
  });
  jQuery.fn.extend({
    detach: function(selector) {
      return remove(this, selector, true);
    },
    remove: function(selector) {
      return remove(this, selector);
    },
    text: function(value) {
      return access(this, function(value) {
        return value === undefined ? jQuery.text(this) : this.empty().each(function() {
          if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
            this.textContent = value;
          }
        });
      }, null, value, arguments.length);
    },
    append: function() {
      return domManip(this, arguments, function(elem) {
        if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
          var target = manipulationTarget(this, elem);
          target.appendChild(elem);
        }
      });
    },
    prepend: function() {
      return domManip(this, arguments, function(elem) {
        if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
          var target = manipulationTarget(this, elem);
          target.insertBefore(elem, target.firstChild);
        }
      });
    },
    before: function() {
      return domManip(this, arguments, function(elem) {
        if (this.parentNode) {
          this.parentNode.insertBefore(elem, this);
        }
      });
    },
    after: function() {
      return domManip(this, arguments, function(elem) {
        if (this.parentNode) {
          this.parentNode.insertBefore(elem, this.nextSibling);
        }
      });
    },
    empty: function() {
      var elem,
          i = 0;
      for (; (elem = this[i]) != null; i++) {
        if (elem.nodeType === 1) {
          jQuery.cleanData(getAll(elem, false));
          elem.textContent = "";
        }
      }
      return this;
    },
    clone: function(dataAndEvents, deepDataAndEvents) {
      dataAndEvents = dataAndEvents == null ? false : dataAndEvents;
      deepDataAndEvents = deepDataAndEvents == null ? dataAndEvents : deepDataAndEvents;
      return this.map(function() {
        return jQuery.clone(this, dataAndEvents, deepDataAndEvents);
      });
    },
    html: function(value) {
      return access(this, function(value) {
        var elem = this[0] || {},
            i = 0,
            l = this.length;
        if (value === undefined && elem.nodeType === 1) {
          return elem.innerHTML;
        }
        if (typeof value === "string" && !rnoInnerhtml.test(value) && !wrapMap[(rtagName.exec(value) || ["", ""])[1].toLowerCase()]) {
          value = jQuery.htmlPrefilter(value);
          try {
            for (; i < l; i++) {
              elem = this[i] || {};
              if (elem.nodeType === 1) {
                jQuery.cleanData(getAll(elem, false));
                elem.innerHTML = value;
              }
            }
            elem = 0;
          } catch (e) {}
        }
        if (elem) {
          this.empty().append(value);
        }
      }, null, value, arguments.length);
    },
    replaceWith: function() {
      var ignored = [];
      return domManip(this, arguments, function(elem) {
        var parent = this.parentNode;
        if (jQuery.inArray(this, ignored) < 0) {
          jQuery.cleanData(getAll(this));
          if (parent) {
            parent.replaceChild(elem, this);
          }
        }
      }, ignored);
    }
  });
  jQuery.each({
    appendTo: "append",
    prependTo: "prepend",
    insertBefore: "before",
    insertAfter: "after",
    replaceAll: "replaceWith"
  }, function(name, original) {
    jQuery.fn[name] = function(selector) {
      var elems,
          ret = [],
          insert = jQuery(selector),
          last = insert.length - 1,
          i = 0;
      for (; i <= last; i++) {
        elems = i === last ? this : this.clone(true);
        jQuery(insert[i])[original](elems);
        push.apply(ret, elems.get());
      }
      return this.pushStack(ret);
    };
  });
  var rmargin = (/^margin/);
  var rnumnonpx = new RegExp("^(" + pnum + ")(?!px)[a-z%]+$", "i");
  var getStyles = function(elem) {
    var view = elem.ownerDocument.defaultView;
    if (!view || !view.opener) {
      view = window;
    }
    return view.getComputedStyle(elem);
  };
  (function() {
    function computeStyleTests() {
      if (!div) {
        return;
      }
      div.style.cssText = "box-sizing:border-box;" + "position:relative;display:block;" + "margin:auto;border:1px;padding:1px;" + "top:1%;width:50%";
      div.innerHTML = "";
      documentElement.appendChild(container);
      var divStyle = window.getComputedStyle(div);
      pixelPositionVal = divStyle.top !== "1%";
      reliableMarginLeftVal = divStyle.marginLeft === "2px";
      boxSizingReliableVal = divStyle.width === "4px";
      div.style.marginRight = "50%";
      pixelMarginRightVal = divStyle.marginRight === "4px";
      documentElement.removeChild(container);
      div = null;
    }
    var pixelPositionVal,
        boxSizingReliableVal,
        pixelMarginRightVal,
        reliableMarginLeftVal,
        container = document.createElement("div"),
        div = document.createElement("div");
    if (!div.style) {
      return;
    }
    div.style.backgroundClip = "content-box";
    div.cloneNode(true).style.backgroundClip = "";
    support.clearCloneStyle = div.style.backgroundClip === "content-box";
    container.style.cssText = "border:0;width:8px;height:0;top:0;left:-9999px;" + "padding:0;margin-top:1px;position:absolute";
    container.appendChild(div);
    jQuery.extend(support, {
      pixelPosition: function() {
        computeStyleTests();
        return pixelPositionVal;
      },
      boxSizingReliable: function() {
        computeStyleTests();
        return boxSizingReliableVal;
      },
      pixelMarginRight: function() {
        computeStyleTests();
        return pixelMarginRightVal;
      },
      reliableMarginLeft: function() {
        computeStyleTests();
        return reliableMarginLeftVal;
      }
    });
  })();
  function curCSS(elem, name, computed) {
    var width,
        minWidth,
        maxWidth,
        ret,
        style = elem.style;
    computed = computed || getStyles(elem);
    if (computed) {
      ret = computed.getPropertyValue(name) || computed[name];
      if (ret === "" && !jQuery.contains(elem.ownerDocument, elem)) {
        ret = jQuery.style(elem, name);
      }
      if (!support.pixelMarginRight() && rnumnonpx.test(ret) && rmargin.test(name)) {
        width = style.width;
        minWidth = style.minWidth;
        maxWidth = style.maxWidth;
        style.minWidth = style.maxWidth = style.width = ret;
        ret = computed.width;
        style.width = width;
        style.minWidth = minWidth;
        style.maxWidth = maxWidth;
      }
    }
    return ret !== undefined ? ret + "" : ret;
  }
  function addGetHookIf(conditionFn, hookFn) {
    return {get: function() {
        if (conditionFn()) {
          delete this.get;
          return;
        }
        return (this.get = hookFn).apply(this, arguments);
      }};
  }
  var rdisplayswap = /^(none|table(?!-c[ea]).+)/,
      cssShow = {
        position: "absolute",
        visibility: "hidden",
        display: "block"
      },
      cssNormalTransform = {
        letterSpacing: "0",
        fontWeight: "400"
      },
      cssPrefixes = ["Webkit", "Moz", "ms"],
      emptyStyle = document.createElement("div").style;
  function vendorPropName(name) {
    if (name in emptyStyle) {
      return name;
    }
    var capName = name[0].toUpperCase() + name.slice(1),
        i = cssPrefixes.length;
    while (i--) {
      name = cssPrefixes[i] + capName;
      if (name in emptyStyle) {
        return name;
      }
    }
  }
  function setPositiveNumber(elem, value, subtract) {
    var matches = rcssNum.exec(value);
    return matches ? Math.max(0, matches[2] - (subtract || 0)) + (matches[3] || "px") : value;
  }
  function augmentWidthOrHeight(elem, name, extra, isBorderBox, styles) {
    var i,
        val = 0;
    if (extra === (isBorderBox ? "border" : "content")) {
      i = 4;
    } else {
      i = name === "width" ? 1 : 0;
    }
    for (; i < 4; i += 2) {
      if (extra === "margin") {
        val += jQuery.css(elem, extra + cssExpand[i], true, styles);
      }
      if (isBorderBox) {
        if (extra === "content") {
          val -= jQuery.css(elem, "padding" + cssExpand[i], true, styles);
        }
        if (extra !== "margin") {
          val -= jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
        }
      } else {
        val += jQuery.css(elem, "padding" + cssExpand[i], true, styles);
        if (extra !== "padding") {
          val += jQuery.css(elem, "border" + cssExpand[i] + "Width", true, styles);
        }
      }
    }
    return val;
  }
  function getWidthOrHeight(elem, name, extra) {
    var val,
        valueIsBorderBox = true,
        styles = getStyles(elem),
        isBorderBox = jQuery.css(elem, "boxSizing", false, styles) === "border-box";
    if (elem.getClientRects().length) {
      val = elem.getBoundingClientRect()[name];
    }
    if (val <= 0 || val == null) {
      val = curCSS(elem, name, styles);
      if (val < 0 || val == null) {
        val = elem.style[name];
      }
      if (rnumnonpx.test(val)) {
        return val;
      }
      valueIsBorderBox = isBorderBox && (support.boxSizingReliable() || val === elem.style[name]);
      val = parseFloat(val) || 0;
    }
    return (val + augmentWidthOrHeight(elem, name, extra || (isBorderBox ? "border" : "content"), valueIsBorderBox, styles)) + "px";
  }
  jQuery.extend({
    cssHooks: {opacity: {get: function(elem, computed) {
          if (computed) {
            var ret = curCSS(elem, "opacity");
            return ret === "" ? "1" : ret;
          }
        }}},
    cssNumber: {
      "animationIterationCount": true,
      "columnCount": true,
      "fillOpacity": true,
      "flexGrow": true,
      "flexShrink": true,
      "fontWeight": true,
      "lineHeight": true,
      "opacity": true,
      "order": true,
      "orphans": true,
      "widows": true,
      "zIndex": true,
      "zoom": true
    },
    cssProps: {"float": "cssFloat"},
    style: function(elem, name, value, extra) {
      if (!elem || elem.nodeType === 3 || elem.nodeType === 8 || !elem.style) {
        return;
      }
      var ret,
          type,
          hooks,
          origName = jQuery.camelCase(name),
          style = elem.style;
      name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(origName) || origName);
      hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
      if (value !== undefined) {
        type = typeof value;
        if (type === "string" && (ret = rcssNum.exec(value)) && ret[1]) {
          value = adjustCSS(elem, name, ret);
          type = "number";
        }
        if (value == null || value !== value) {
          return;
        }
        if (type === "number") {
          value += ret && ret[3] || (jQuery.cssNumber[origName] ? "" : "px");
        }
        if (!support.clearCloneStyle && value === "" && name.indexOf("background") === 0) {
          style[name] = "inherit";
        }
        if (!hooks || !("set" in hooks) || (value = hooks.set(elem, value, extra)) !== undefined) {
          style[name] = value;
        }
      } else {
        if (hooks && "get" in hooks && (ret = hooks.get(elem, false, extra)) !== undefined) {
          return ret;
        }
        return style[name];
      }
    },
    css: function(elem, name, extra, styles) {
      var val,
          num,
          hooks,
          origName = jQuery.camelCase(name);
      name = jQuery.cssProps[origName] || (jQuery.cssProps[origName] = vendorPropName(origName) || origName);
      hooks = jQuery.cssHooks[name] || jQuery.cssHooks[origName];
      if (hooks && "get" in hooks) {
        val = hooks.get(elem, true, extra);
      }
      if (val === undefined) {
        val = curCSS(elem, name, styles);
      }
      if (val === "normal" && name in cssNormalTransform) {
        val = cssNormalTransform[name];
      }
      if (extra === "" || extra) {
        num = parseFloat(val);
        return extra === true || isFinite(num) ? num || 0 : val;
      }
      return val;
    }
  });
  jQuery.each(["height", "width"], function(i, name) {
    jQuery.cssHooks[name] = {
      get: function(elem, computed, extra) {
        if (computed) {
          return rdisplayswap.test(jQuery.css(elem, "display")) && (!elem.getClientRects().length || !elem.getBoundingClientRect().width) ? swap(elem, cssShow, function() {
            return getWidthOrHeight(elem, name, extra);
          }) : getWidthOrHeight(elem, name, extra);
        }
      },
      set: function(elem, value, extra) {
        var matches,
            styles = extra && getStyles(elem),
            subtract = extra && augmentWidthOrHeight(elem, name, extra, jQuery.css(elem, "boxSizing", false, styles) === "border-box", styles);
        if (subtract && (matches = rcssNum.exec(value)) && (matches[3] || "px") !== "px") {
          elem.style[name] = value;
          value = jQuery.css(elem, name);
        }
        return setPositiveNumber(elem, value, subtract);
      }
    };
  });
  jQuery.cssHooks.marginLeft = addGetHookIf(support.reliableMarginLeft, function(elem, computed) {
    if (computed) {
      return (parseFloat(curCSS(elem, "marginLeft")) || elem.getBoundingClientRect().left - swap(elem, {marginLeft: 0}, function() {
        return elem.getBoundingClientRect().left;
      })) + "px";
    }
  });
  jQuery.each({
    margin: "",
    padding: "",
    border: "Width"
  }, function(prefix, suffix) {
    jQuery.cssHooks[prefix + suffix] = {expand: function(value) {
        var i = 0,
            expanded = {},
            parts = typeof value === "string" ? value.split(" ") : [value];
        for (; i < 4; i++) {
          expanded[prefix + cssExpand[i] + suffix] = parts[i] || parts[i - 2] || parts[0];
        }
        return expanded;
      }};
    if (!rmargin.test(prefix)) {
      jQuery.cssHooks[prefix + suffix].set = setPositiveNumber;
    }
  });
  jQuery.fn.extend({css: function(name, value) {
      return access(this, function(elem, name, value) {
        var styles,
            len,
            map = {},
            i = 0;
        if (jQuery.isArray(name)) {
          styles = getStyles(elem);
          len = name.length;
          for (; i < len; i++) {
            map[name[i]] = jQuery.css(elem, name[i], false, styles);
          }
          return map;
        }
        return value !== undefined ? jQuery.style(elem, name, value) : jQuery.css(elem, name);
      }, name, value, arguments.length > 1);
    }});
  function Tween(elem, options, prop, end, easing) {
    return new Tween.prototype.init(elem, options, prop, end, easing);
  }
  jQuery.Tween = Tween;
  Tween.prototype = {
    constructor: Tween,
    init: function(elem, options, prop, end, easing, unit) {
      this.elem = elem;
      this.prop = prop;
      this.easing = easing || jQuery.easing._default;
      this.options = options;
      this.start = this.now = this.cur();
      this.end = end;
      this.unit = unit || (jQuery.cssNumber[prop] ? "" : "px");
    },
    cur: function() {
      var hooks = Tween.propHooks[this.prop];
      return hooks && hooks.get ? hooks.get(this) : Tween.propHooks._default.get(this);
    },
    run: function(percent) {
      var eased,
          hooks = Tween.propHooks[this.prop];
      if (this.options.duration) {
        this.pos = eased = jQuery.easing[this.easing](percent, this.options.duration * percent, 0, 1, this.options.duration);
      } else {
        this.pos = eased = percent;
      }
      this.now = (this.end - this.start) * eased + this.start;
      if (this.options.step) {
        this.options.step.call(this.elem, this.now, this);
      }
      if (hooks && hooks.set) {
        hooks.set(this);
      } else {
        Tween.propHooks._default.set(this);
      }
      return this;
    }
  };
  Tween.prototype.init.prototype = Tween.prototype;
  Tween.propHooks = {_default: {
      get: function(tween) {
        var result;
        if (tween.elem.nodeType !== 1 || tween.elem[tween.prop] != null && tween.elem.style[tween.prop] == null) {
          return tween.elem[tween.prop];
        }
        result = jQuery.css(tween.elem, tween.prop, "");
        return !result || result === "auto" ? 0 : result;
      },
      set: function(tween) {
        if (jQuery.fx.step[tween.prop]) {
          jQuery.fx.step[tween.prop](tween);
        } else if (tween.elem.nodeType === 1 && (tween.elem.style[jQuery.cssProps[tween.prop]] != null || jQuery.cssHooks[tween.prop])) {
          jQuery.style(tween.elem, tween.prop, tween.now + tween.unit);
        } else {
          tween.elem[tween.prop] = tween.now;
        }
      }
    }};
  Tween.propHooks.scrollTop = Tween.propHooks.scrollLeft = {set: function(tween) {
      if (tween.elem.nodeType && tween.elem.parentNode) {
        tween.elem[tween.prop] = tween.now;
      }
    }};
  jQuery.easing = {
    linear: function(p) {
      return p;
    },
    swing: function(p) {
      return 0.5 - Math.cos(p * Math.PI) / 2;
    },
    _default: "swing"
  };
  jQuery.fx = Tween.prototype.init;
  jQuery.fx.step = {};
  var fxNow,
      timerId,
      rfxtypes = /^(?:toggle|show|hide)$/,
      rrun = /queueHooks$/;
  function raf() {
    if (timerId) {
      window.requestAnimationFrame(raf);
      jQuery.fx.tick();
    }
  }
  function createFxNow() {
    window.setTimeout(function() {
      fxNow = undefined;
    });
    return (fxNow = jQuery.now());
  }
  function genFx(type, includeWidth) {
    var which,
        i = 0,
        attrs = {height: type};
    includeWidth = includeWidth ? 1 : 0;
    for (; i < 4; i += 2 - includeWidth) {
      which = cssExpand[i];
      attrs["margin" + which] = attrs["padding" + which] = type;
    }
    if (includeWidth) {
      attrs.opacity = attrs.width = type;
    }
    return attrs;
  }
  function createTween(value, prop, animation) {
    var tween,
        collection = (Animation.tweeners[prop] || []).concat(Animation.tweeners["*"]),
        index = 0,
        length = collection.length;
    for (; index < length; index++) {
      if ((tween = collection[index].call(animation, prop, value))) {
        return tween;
      }
    }
  }
  function defaultPrefilter(elem, props, opts) {
    var prop,
        value,
        toggle,
        hooks,
        oldfire,
        propTween,
        restoreDisplay,
        display,
        isBox = "width" in props || "height" in props,
        anim = this,
        orig = {},
        style = elem.style,
        hidden = elem.nodeType && isHiddenWithinTree(elem),
        dataShow = dataPriv.get(elem, "fxshow");
    if (!opts.queue) {
      hooks = jQuery._queueHooks(elem, "fx");
      if (hooks.unqueued == null) {
        hooks.unqueued = 0;
        oldfire = hooks.empty.fire;
        hooks.empty.fire = function() {
          if (!hooks.unqueued) {
            oldfire();
          }
        };
      }
      hooks.unqueued++;
      anim.always(function() {
        anim.always(function() {
          hooks.unqueued--;
          if (!jQuery.queue(elem, "fx").length) {
            hooks.empty.fire();
          }
        });
      });
    }
    for (prop in props) {
      value = props[prop];
      if (rfxtypes.test(value)) {
        delete props[prop];
        toggle = toggle || value === "toggle";
        if (value === (hidden ? "hide" : "show")) {
          if (value === "show" && dataShow && dataShow[prop] !== undefined) {
            hidden = true;
          } else {
            continue;
          }
        }
        orig[prop] = dataShow && dataShow[prop] || jQuery.style(elem, prop);
      }
    }
    propTween = !jQuery.isEmptyObject(props);
    if (!propTween && jQuery.isEmptyObject(orig)) {
      return;
    }
    if (isBox && elem.nodeType === 1) {
      opts.overflow = [style.overflow, style.overflowX, style.overflowY];
      restoreDisplay = dataShow && dataShow.display;
      if (restoreDisplay == null) {
        restoreDisplay = dataPriv.get(elem, "display");
      }
      display = jQuery.css(elem, "display");
      if (display === "none") {
        if (restoreDisplay) {
          display = restoreDisplay;
        } else {
          showHide([elem], true);
          restoreDisplay = elem.style.display || restoreDisplay;
          display = jQuery.css(elem, "display");
          showHide([elem]);
        }
      }
      if (display === "inline" || display === "inline-block" && restoreDisplay != null) {
        if (jQuery.css(elem, "float") === "none") {
          if (!propTween) {
            anim.done(function() {
              style.display = restoreDisplay;
            });
            if (restoreDisplay == null) {
              display = style.display;
              restoreDisplay = display === "none" ? "" : display;
            }
          }
          style.display = "inline-block";
        }
      }
    }
    if (opts.overflow) {
      style.overflow = "hidden";
      anim.always(function() {
        style.overflow = opts.overflow[0];
        style.overflowX = opts.overflow[1];
        style.overflowY = opts.overflow[2];
      });
    }
    propTween = false;
    for (prop in orig) {
      if (!propTween) {
        if (dataShow) {
          if ("hidden" in dataShow) {
            hidden = dataShow.hidden;
          }
        } else {
          dataShow = dataPriv.access(elem, "fxshow", {display: restoreDisplay});
        }
        if (toggle) {
          dataShow.hidden = !hidden;
        }
        if (hidden) {
          showHide([elem], true);
        }
        anim.done(function() {
          if (!hidden) {
            showHide([elem]);
          }
          dataPriv.remove(elem, "fxshow");
          for (prop in orig) {
            jQuery.style(elem, prop, orig[prop]);
          }
        });
      }
      propTween = createTween(hidden ? dataShow[prop] : 0, prop, anim);
      if (!(prop in dataShow)) {
        dataShow[prop] = propTween.start;
        if (hidden) {
          propTween.end = propTween.start;
          propTween.start = 0;
        }
      }
    }
  }
  function propFilter(props, specialEasing) {
    var index,
        name,
        easing,
        value,
        hooks;
    for (index in props) {
      name = jQuery.camelCase(index);
      easing = specialEasing[name];
      value = props[index];
      if (jQuery.isArray(value)) {
        easing = value[1];
        value = props[index] = value[0];
      }
      if (index !== name) {
        props[name] = value;
        delete props[index];
      }
      hooks = jQuery.cssHooks[name];
      if (hooks && "expand" in hooks) {
        value = hooks.expand(value);
        delete props[name];
        for (index in value) {
          if (!(index in props)) {
            props[index] = value[index];
            specialEasing[index] = easing;
          }
        }
      } else {
        specialEasing[name] = easing;
      }
    }
  }
  function Animation(elem, properties, options) {
    var result,
        stopped,
        index = 0,
        length = Animation.prefilters.length,
        deferred = jQuery.Deferred().always(function() {
          delete tick.elem;
        }),
        tick = function() {
          if (stopped) {
            return false;
          }
          var currentTime = fxNow || createFxNow(),
              remaining = Math.max(0, animation.startTime + animation.duration - currentTime),
              temp = remaining / animation.duration || 0,
              percent = 1 - temp,
              index = 0,
              length = animation.tweens.length;
          for (; index < length; index++) {
            animation.tweens[index].run(percent);
          }
          deferred.notifyWith(elem, [animation, percent, remaining]);
          if (percent < 1 && length) {
            return remaining;
          } else {
            deferred.resolveWith(elem, [animation]);
            return false;
          }
        },
        animation = deferred.promise({
          elem: elem,
          props: jQuery.extend({}, properties),
          opts: jQuery.extend(true, {
            specialEasing: {},
            easing: jQuery.easing._default
          }, options),
          originalProperties: properties,
          originalOptions: options,
          startTime: fxNow || createFxNow(),
          duration: options.duration,
          tweens: [],
          createTween: function(prop, end) {
            var tween = jQuery.Tween(elem, animation.opts, prop, end, animation.opts.specialEasing[prop] || animation.opts.easing);
            animation.tweens.push(tween);
            return tween;
          },
          stop: function(gotoEnd) {
            var index = 0,
                length = gotoEnd ? animation.tweens.length : 0;
            if (stopped) {
              return this;
            }
            stopped = true;
            for (; index < length; index++) {
              animation.tweens[index].run(1);
            }
            if (gotoEnd) {
              deferred.notifyWith(elem, [animation, 1, 0]);
              deferred.resolveWith(elem, [animation, gotoEnd]);
            } else {
              deferred.rejectWith(elem, [animation, gotoEnd]);
            }
            return this;
          }
        }),
        props = animation.props;
    propFilter(props, animation.opts.specialEasing);
    for (; index < length; index++) {
      result = Animation.prefilters[index].call(animation, elem, props, animation.opts);
      if (result) {
        if (jQuery.isFunction(result.stop)) {
          jQuery._queueHooks(animation.elem, animation.opts.queue).stop = jQuery.proxy(result.stop, result);
        }
        return result;
      }
    }
    jQuery.map(props, createTween, animation);
    if (jQuery.isFunction(animation.opts.start)) {
      animation.opts.start.call(elem, animation);
    }
    jQuery.fx.timer(jQuery.extend(tick, {
      elem: elem,
      anim: animation,
      queue: animation.opts.queue
    }));
    return animation.progress(animation.opts.progress).done(animation.opts.done, animation.opts.complete).fail(animation.opts.fail).always(animation.opts.always);
  }
  jQuery.Animation = jQuery.extend(Animation, {
    tweeners: {"*": [function(prop, value) {
        var tween = this.createTween(prop, value);
        adjustCSS(tween.elem, prop, rcssNum.exec(value), tween);
        return tween;
      }]},
    tweener: function(props, callback) {
      if (jQuery.isFunction(props)) {
        callback = props;
        props = ["*"];
      } else {
        props = props.match(rnothtmlwhite);
      }
      var prop,
          index = 0,
          length = props.length;
      for (; index < length; index++) {
        prop = props[index];
        Animation.tweeners[prop] = Animation.tweeners[prop] || [];
        Animation.tweeners[prop].unshift(callback);
      }
    },
    prefilters: [defaultPrefilter],
    prefilter: function(callback, prepend) {
      if (prepend) {
        Animation.prefilters.unshift(callback);
      } else {
        Animation.prefilters.push(callback);
      }
    }
  });
  jQuery.speed = function(speed, easing, fn) {
    var opt = speed && typeof speed === "object" ? jQuery.extend({}, speed) : {
      complete: fn || !fn && easing || jQuery.isFunction(speed) && speed,
      duration: speed,
      easing: fn && easing || easing && !jQuery.isFunction(easing) && easing
    };
    if (jQuery.fx.off || document.hidden) {
      opt.duration = 0;
    } else {
      if (typeof opt.duration !== "number") {
        if (opt.duration in jQuery.fx.speeds) {
          opt.duration = jQuery.fx.speeds[opt.duration];
        } else {
          opt.duration = jQuery.fx.speeds._default;
        }
      }
    }
    if (opt.queue == null || opt.queue === true) {
      opt.queue = "fx";
    }
    opt.old = opt.complete;
    opt.complete = function() {
      if (jQuery.isFunction(opt.old)) {
        opt.old.call(this);
      }
      if (opt.queue) {
        jQuery.dequeue(this, opt.queue);
      }
    };
    return opt;
  };
  jQuery.fn.extend({
    fadeTo: function(speed, to, easing, callback) {
      return this.filter(isHiddenWithinTree).css("opacity", 0).show().end().animate({opacity: to}, speed, easing, callback);
    },
    animate: function(prop, speed, easing, callback) {
      var empty = jQuery.isEmptyObject(prop),
          optall = jQuery.speed(speed, easing, callback),
          doAnimation = function() {
            var anim = Animation(this, jQuery.extend({}, prop), optall);
            if (empty || dataPriv.get(this, "finish")) {
              anim.stop(true);
            }
          };
      doAnimation.finish = doAnimation;
      return empty || optall.queue === false ? this.each(doAnimation) : this.queue(optall.queue, doAnimation);
    },
    stop: function(type, clearQueue, gotoEnd) {
      var stopQueue = function(hooks) {
        var stop = hooks.stop;
        delete hooks.stop;
        stop(gotoEnd);
      };
      if (typeof type !== "string") {
        gotoEnd = clearQueue;
        clearQueue = type;
        type = undefined;
      }
      if (clearQueue && type !== false) {
        this.queue(type || "fx", []);
      }
      return this.each(function() {
        var dequeue = true,
            index = type != null && type + "queueHooks",
            timers = jQuery.timers,
            data = dataPriv.get(this);
        if (index) {
          if (data[index] && data[index].stop) {
            stopQueue(data[index]);
          }
        } else {
          for (index in data) {
            if (data[index] && data[index].stop && rrun.test(index)) {
              stopQueue(data[index]);
            }
          }
        }
        for (index = timers.length; index--; ) {
          if (timers[index].elem === this && (type == null || timers[index].queue === type)) {
            timers[index].anim.stop(gotoEnd);
            dequeue = false;
            timers.splice(index, 1);
          }
        }
        if (dequeue || !gotoEnd) {
          jQuery.dequeue(this, type);
        }
      });
    },
    finish: function(type) {
      if (type !== false) {
        type = type || "fx";
      }
      return this.each(function() {
        var index,
            data = dataPriv.get(this),
            queue = data[type + "queue"],
            hooks = data[type + "queueHooks"],
            timers = jQuery.timers,
            length = queue ? queue.length : 0;
        data.finish = true;
        jQuery.queue(this, type, []);
        if (hooks && hooks.stop) {
          hooks.stop.call(this, true);
        }
        for (index = timers.length; index--; ) {
          if (timers[index].elem === this && timers[index].queue === type) {
            timers[index].anim.stop(true);
            timers.splice(index, 1);
          }
        }
        for (index = 0; index < length; index++) {
          if (queue[index] && queue[index].finish) {
            queue[index].finish.call(this);
          }
        }
        delete data.finish;
      });
    }
  });
  jQuery.each(["toggle", "show", "hide"], function(i, name) {
    var cssFn = jQuery.fn[name];
    jQuery.fn[name] = function(speed, easing, callback) {
      return speed == null || typeof speed === "boolean" ? cssFn.apply(this, arguments) : this.animate(genFx(name, true), speed, easing, callback);
    };
  });
  jQuery.each({
    slideDown: genFx("show"),
    slideUp: genFx("hide"),
    slideToggle: genFx("toggle"),
    fadeIn: {opacity: "show"},
    fadeOut: {opacity: "hide"},
    fadeToggle: {opacity: "toggle"}
  }, function(name, props) {
    jQuery.fn[name] = function(speed, easing, callback) {
      return this.animate(props, speed, easing, callback);
    };
  });
  jQuery.timers = [];
  jQuery.fx.tick = function() {
    var timer,
        i = 0,
        timers = jQuery.timers;
    fxNow = jQuery.now();
    for (; i < timers.length; i++) {
      timer = timers[i];
      if (!timer() && timers[i] === timer) {
        timers.splice(i--, 1);
      }
    }
    if (!timers.length) {
      jQuery.fx.stop();
    }
    fxNow = undefined;
  };
  jQuery.fx.timer = function(timer) {
    jQuery.timers.push(timer);
    if (timer()) {
      jQuery.fx.start();
    } else {
      jQuery.timers.pop();
    }
  };
  jQuery.fx.interval = 13;
  jQuery.fx.start = function() {
    if (!timerId) {
      timerId = window.requestAnimationFrame ? window.requestAnimationFrame(raf) : window.setInterval(jQuery.fx.tick, jQuery.fx.interval);
    }
  };
  jQuery.fx.stop = function() {
    if (window.cancelAnimationFrame) {
      window.cancelAnimationFrame(timerId);
    } else {
      window.clearInterval(timerId);
    }
    timerId = null;
  };
  jQuery.fx.speeds = {
    slow: 600,
    fast: 200,
    _default: 400
  };
  jQuery.fn.delay = function(time, type) {
    time = jQuery.fx ? jQuery.fx.speeds[time] || time : time;
    type = type || "fx";
    return this.queue(type, function(next, hooks) {
      var timeout = window.setTimeout(next, time);
      hooks.stop = function() {
        window.clearTimeout(timeout);
      };
    });
  };
  (function() {
    var input = document.createElement("input"),
        select = document.createElement("select"),
        opt = select.appendChild(document.createElement("option"));
    input.type = "checkbox";
    support.checkOn = input.value !== "";
    support.optSelected = opt.selected;
    input = document.createElement("input");
    input.value = "t";
    input.type = "radio";
    support.radioValue = input.value === "t";
  })();
  var boolHook,
      attrHandle = jQuery.expr.attrHandle;
  jQuery.fn.extend({
    attr: function(name, value) {
      return access(this, jQuery.attr, name, value, arguments.length > 1);
    },
    removeAttr: function(name) {
      return this.each(function() {
        jQuery.removeAttr(this, name);
      });
    }
  });
  jQuery.extend({
    attr: function(elem, name, value) {
      var ret,
          hooks,
          nType = elem.nodeType;
      if (nType === 3 || nType === 8 || nType === 2) {
        return;
      }
      if (typeof elem.getAttribute === "undefined") {
        return jQuery.prop(elem, name, value);
      }
      if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
        hooks = jQuery.attrHooks[name.toLowerCase()] || (jQuery.expr.match.bool.test(name) ? boolHook : undefined);
      }
      if (value !== undefined) {
        if (value === null) {
          jQuery.removeAttr(elem, name);
          return;
        }
        if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
          return ret;
        }
        elem.setAttribute(name, value + "");
        return value;
      }
      if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
        return ret;
      }
      ret = jQuery.find.attr(elem, name);
      return ret == null ? undefined : ret;
    },
    attrHooks: {type: {set: function(elem, value) {
          if (!support.radioValue && value === "radio" && jQuery.nodeName(elem, "input")) {
            var val = elem.value;
            elem.setAttribute("type", value);
            if (val) {
              elem.value = val;
            }
            return value;
          }
        }}},
    removeAttr: function(elem, value) {
      var name,
          i = 0,
          attrNames = value && value.match(rnothtmlwhite);
      if (attrNames && elem.nodeType === 1) {
        while ((name = attrNames[i++])) {
          elem.removeAttribute(name);
        }
      }
    }
  });
  boolHook = {set: function(elem, value, name) {
      if (value === false) {
        jQuery.removeAttr(elem, name);
      } else {
        elem.setAttribute(name, name);
      }
      return name;
    }};
  jQuery.each(jQuery.expr.match.bool.source.match(/\w+/g), function(i, name) {
    var getter = attrHandle[name] || jQuery.find.attr;
    attrHandle[name] = function(elem, name, isXML) {
      var ret,
          handle,
          lowercaseName = name.toLowerCase();
      if (!isXML) {
        handle = attrHandle[lowercaseName];
        attrHandle[lowercaseName] = ret;
        ret = getter(elem, name, isXML) != null ? lowercaseName : null;
        attrHandle[lowercaseName] = handle;
      }
      return ret;
    };
  });
  var rfocusable = /^(?:input|select|textarea|button)$/i,
      rclickable = /^(?:a|area)$/i;
  jQuery.fn.extend({
    prop: function(name, value) {
      return access(this, jQuery.prop, name, value, arguments.length > 1);
    },
    removeProp: function(name) {
      return this.each(function() {
        delete this[jQuery.propFix[name] || name];
      });
    }
  });
  jQuery.extend({
    prop: function(elem, name, value) {
      var ret,
          hooks,
          nType = elem.nodeType;
      if (nType === 3 || nType === 8 || nType === 2) {
        return;
      }
      if (nType !== 1 || !jQuery.isXMLDoc(elem)) {
        name = jQuery.propFix[name] || name;
        hooks = jQuery.propHooks[name];
      }
      if (value !== undefined) {
        if (hooks && "set" in hooks && (ret = hooks.set(elem, value, name)) !== undefined) {
          return ret;
        }
        return (elem[name] = value);
      }
      if (hooks && "get" in hooks && (ret = hooks.get(elem, name)) !== null) {
        return ret;
      }
      return elem[name];
    },
    propHooks: {tabIndex: {get: function(elem) {
          var tabindex = jQuery.find.attr(elem, "tabindex");
          if (tabindex) {
            return parseInt(tabindex, 10);
          }
          if (rfocusable.test(elem.nodeName) || rclickable.test(elem.nodeName) && elem.href) {
            return 0;
          }
          return -1;
        }}},
    propFix: {
      "for": "htmlFor",
      "class": "className"
    }
  });
  if (!support.optSelected) {
    jQuery.propHooks.selected = {
      get: function(elem) {
        var parent = elem.parentNode;
        if (parent && parent.parentNode) {
          parent.parentNode.selectedIndex;
        }
        return null;
      },
      set: function(elem) {
        var parent = elem.parentNode;
        if (parent) {
          parent.selectedIndex;
          if (parent.parentNode) {
            parent.parentNode.selectedIndex;
          }
        }
      }
    };
  }
  jQuery.each(["tabIndex", "readOnly", "maxLength", "cellSpacing", "cellPadding", "rowSpan", "colSpan", "useMap", "frameBorder", "contentEditable"], function() {
    jQuery.propFix[this.toLowerCase()] = this;
  });
  function stripAndCollapse(value) {
    var tokens = value.match(rnothtmlwhite) || [];
    return tokens.join(" ");
  }
  function getClass(elem) {
    return elem.getAttribute && elem.getAttribute("class") || "";
  }
  jQuery.fn.extend({
    addClass: function(value) {
      var classes,
          elem,
          cur,
          curValue,
          clazz,
          j,
          finalValue,
          i = 0;
      if (jQuery.isFunction(value)) {
        return this.each(function(j) {
          jQuery(this).addClass(value.call(this, j, getClass(this)));
        });
      }
      if (typeof value === "string" && value) {
        classes = value.match(rnothtmlwhite) || [];
        while ((elem = this[i++])) {
          curValue = getClass(elem);
          cur = elem.nodeType === 1 && (" " + stripAndCollapse(curValue) + " ");
          if (cur) {
            j = 0;
            while ((clazz = classes[j++])) {
              if (cur.indexOf(" " + clazz + " ") < 0) {
                cur += clazz + " ";
              }
            }
            finalValue = stripAndCollapse(cur);
            if (curValue !== finalValue) {
              elem.setAttribute("class", finalValue);
            }
          }
        }
      }
      return this;
    },
    removeClass: function(value) {
      var classes,
          elem,
          cur,
          curValue,
          clazz,
          j,
          finalValue,
          i = 0;
      if (jQuery.isFunction(value)) {
        return this.each(function(j) {
          jQuery(this).removeClass(value.call(this, j, getClass(this)));
        });
      }
      if (!arguments.length) {
        return this.attr("class", "");
      }
      if (typeof value === "string" && value) {
        classes = value.match(rnothtmlwhite) || [];
        while ((elem = this[i++])) {
          curValue = getClass(elem);
          cur = elem.nodeType === 1 && (" " + stripAndCollapse(curValue) + " ");
          if (cur) {
            j = 0;
            while ((clazz = classes[j++])) {
              while (cur.indexOf(" " + clazz + " ") > -1) {
                cur = cur.replace(" " + clazz + " ", " ");
              }
            }
            finalValue = stripAndCollapse(cur);
            if (curValue !== finalValue) {
              elem.setAttribute("class", finalValue);
            }
          }
        }
      }
      return this;
    },
    toggleClass: function(value, stateVal) {
      var type = typeof value;
      if (typeof stateVal === "boolean" && type === "string") {
        return stateVal ? this.addClass(value) : this.removeClass(value);
      }
      if (jQuery.isFunction(value)) {
        return this.each(function(i) {
          jQuery(this).toggleClass(value.call(this, i, getClass(this), stateVal), stateVal);
        });
      }
      return this.each(function() {
        var className,
            i,
            self,
            classNames;
        if (type === "string") {
          i = 0;
          self = jQuery(this);
          classNames = value.match(rnothtmlwhite) || [];
          while ((className = classNames[i++])) {
            if (self.hasClass(className)) {
              self.removeClass(className);
            } else {
              self.addClass(className);
            }
          }
        } else if (value === undefined || type === "boolean") {
          className = getClass(this);
          if (className) {
            dataPriv.set(this, "__className__", className);
          }
          if (this.setAttribute) {
            this.setAttribute("class", className || value === false ? "" : dataPriv.get(this, "__className__") || "");
          }
        }
      });
    },
    hasClass: function(selector) {
      var className,
          elem,
          i = 0;
      className = " " + selector + " ";
      while ((elem = this[i++])) {
        if (elem.nodeType === 1 && (" " + stripAndCollapse(getClass(elem)) + " ").indexOf(className) > -1) {
          return true;
        }
      }
      return false;
    }
  });
  var rreturn = /\r/g;
  jQuery.fn.extend({val: function(value) {
      var hooks,
          ret,
          isFunction,
          elem = this[0];
      if (!arguments.length) {
        if (elem) {
          hooks = jQuery.valHooks[elem.type] || jQuery.valHooks[elem.nodeName.toLowerCase()];
          if (hooks && "get" in hooks && (ret = hooks.get(elem, "value")) !== undefined) {
            return ret;
          }
          ret = elem.value;
          if (typeof ret === "string") {
            return ret.replace(rreturn, "");
          }
          return ret == null ? "" : ret;
        }
        return;
      }
      isFunction = jQuery.isFunction(value);
      return this.each(function(i) {
        var val;
        if (this.nodeType !== 1) {
          return;
        }
        if (isFunction) {
          val = value.call(this, i, jQuery(this).val());
        } else {
          val = value;
        }
        if (val == null) {
          val = "";
        } else if (typeof val === "number") {
          val += "";
        } else if (jQuery.isArray(val)) {
          val = jQuery.map(val, function(value) {
            return value == null ? "" : value + "";
          });
        }
        hooks = jQuery.valHooks[this.type] || jQuery.valHooks[this.nodeName.toLowerCase()];
        if (!hooks || !("set" in hooks) || hooks.set(this, val, "value") === undefined) {
          this.value = val;
        }
      });
    }});
  jQuery.extend({valHooks: {
      option: {get: function(elem) {
          var val = jQuery.find.attr(elem, "value");
          return val != null ? val : stripAndCollapse(jQuery.text(elem));
        }},
      select: {
        get: function(elem) {
          var value,
              option,
              i,
              options = elem.options,
              index = elem.selectedIndex,
              one = elem.type === "select-one",
              values = one ? null : [],
              max = one ? index + 1 : options.length;
          if (index < 0) {
            i = max;
          } else {
            i = one ? index : 0;
          }
          for (; i < max; i++) {
            option = options[i];
            if ((option.selected || i === index) && !option.disabled && (!option.parentNode.disabled || !jQuery.nodeName(option.parentNode, "optgroup"))) {
              value = jQuery(option).val();
              if (one) {
                return value;
              }
              values.push(value);
            }
          }
          return values;
        },
        set: function(elem, value) {
          var optionSet,
              option,
              options = elem.options,
              values = jQuery.makeArray(value),
              i = options.length;
          while (i--) {
            option = options[i];
            if (option.selected = jQuery.inArray(jQuery.valHooks.option.get(option), values) > -1) {
              optionSet = true;
            }
          }
          if (!optionSet) {
            elem.selectedIndex = -1;
          }
          return values;
        }
      }
    }});
  jQuery.each(["radio", "checkbox"], function() {
    jQuery.valHooks[this] = {set: function(elem, value) {
        if (jQuery.isArray(value)) {
          return (elem.checked = jQuery.inArray(jQuery(elem).val(), value) > -1);
        }
      }};
    if (!support.checkOn) {
      jQuery.valHooks[this].get = function(elem) {
        return elem.getAttribute("value") === null ? "on" : elem.value;
      };
    }
  });
  var rfocusMorph = /^(?:focusinfocus|focusoutblur)$/;
  jQuery.extend(jQuery.event, {
    trigger: function(event, data, elem, onlyHandlers) {
      var i,
          cur,
          tmp,
          bubbleType,
          ontype,
          handle,
          special,
          eventPath = [elem || document],
          type = hasOwn.call(event, "type") ? event.type : event,
          namespaces = hasOwn.call(event, "namespace") ? event.namespace.split(".") : [];
      cur = tmp = elem = elem || document;
      if (elem.nodeType === 3 || elem.nodeType === 8) {
        return;
      }
      if (rfocusMorph.test(type + jQuery.event.triggered)) {
        return;
      }
      if (type.indexOf(".") > -1) {
        namespaces = type.split(".");
        type = namespaces.shift();
        namespaces.sort();
      }
      ontype = type.indexOf(":") < 0 && "on" + type;
      event = event[jQuery.expando] ? event : new jQuery.Event(type, typeof event === "object" && event);
      event.isTrigger = onlyHandlers ? 2 : 3;
      event.namespace = namespaces.join(".");
      event.rnamespace = event.namespace ? new RegExp("(^|\\.)" + namespaces.join("\\.(?:.*\\.|)") + "(\\.|$)") : null;
      event.result = undefined;
      if (!event.target) {
        event.target = elem;
      }
      data = data == null ? [event] : jQuery.makeArray(data, [event]);
      special = jQuery.event.special[type] || {};
      if (!onlyHandlers && special.trigger && special.trigger.apply(elem, data) === false) {
        return;
      }
      if (!onlyHandlers && !special.noBubble && !jQuery.isWindow(elem)) {
        bubbleType = special.delegateType || type;
        if (!rfocusMorph.test(bubbleType + type)) {
          cur = cur.parentNode;
        }
        for (; cur; cur = cur.parentNode) {
          eventPath.push(cur);
          tmp = cur;
        }
        if (tmp === (elem.ownerDocument || document)) {
          eventPath.push(tmp.defaultView || tmp.parentWindow || window);
        }
      }
      i = 0;
      while ((cur = eventPath[i++]) && !event.isPropagationStopped()) {
        event.type = i > 1 ? bubbleType : special.bindType || type;
        handle = (dataPriv.get(cur, "events") || {})[event.type] && dataPriv.get(cur, "handle");
        if (handle) {
          handle.apply(cur, data);
        }
        handle = ontype && cur[ontype];
        if (handle && handle.apply && acceptData(cur)) {
          event.result = handle.apply(cur, data);
          if (event.result === false) {
            event.preventDefault();
          }
        }
      }
      event.type = type;
      if (!onlyHandlers && !event.isDefaultPrevented()) {
        if ((!special._default || special._default.apply(eventPath.pop(), data) === false) && acceptData(elem)) {
          if (ontype && jQuery.isFunction(elem[type]) && !jQuery.isWindow(elem)) {
            tmp = elem[ontype];
            if (tmp) {
              elem[ontype] = null;
            }
            jQuery.event.triggered = type;
            elem[type]();
            jQuery.event.triggered = undefined;
            if (tmp) {
              elem[ontype] = tmp;
            }
          }
        }
      }
      return event.result;
    },
    simulate: function(type, elem, event) {
      var e = jQuery.extend(new jQuery.Event(), event, {
        type: type,
        isSimulated: true
      });
      jQuery.event.trigger(e, null, elem);
    }
  });
  jQuery.fn.extend({
    trigger: function(type, data) {
      return this.each(function() {
        jQuery.event.trigger(type, data, this);
      });
    },
    triggerHandler: function(type, data) {
      var elem = this[0];
      if (elem) {
        return jQuery.event.trigger(type, data, elem, true);
      }
    }
  });
  jQuery.each(("blur focus focusin focusout resize scroll click dblclick " + "mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave " + "change select submit keydown keypress keyup contextmenu").split(" "), function(i, name) {
    jQuery.fn[name] = function(data, fn) {
      return arguments.length > 0 ? this.on(name, null, data, fn) : this.trigger(name);
    };
  });
  jQuery.fn.extend({hover: function(fnOver, fnOut) {
      return this.mouseenter(fnOver).mouseleave(fnOut || fnOver);
    }});
  support.focusin = "onfocusin" in window;
  if (!support.focusin) {
    jQuery.each({
      focus: "focusin",
      blur: "focusout"
    }, function(orig, fix) {
      var handler = function(event) {
        jQuery.event.simulate(fix, event.target, jQuery.event.fix(event));
      };
      jQuery.event.special[fix] = {
        setup: function() {
          var doc = this.ownerDocument || this,
              attaches = dataPriv.access(doc, fix);
          if (!attaches) {
            doc.addEventListener(orig, handler, true);
          }
          dataPriv.access(doc, fix, (attaches || 0) + 1);
        },
        teardown: function() {
          var doc = this.ownerDocument || this,
              attaches = dataPriv.access(doc, fix) - 1;
          if (!attaches) {
            doc.removeEventListener(orig, handler, true);
            dataPriv.remove(doc, fix);
          } else {
            dataPriv.access(doc, fix, attaches);
          }
        }
      };
    });
  }
  var location = window.location;
  var nonce = jQuery.now();
  var rquery = (/\?/);
  jQuery.parseXML = function(data) {
    var xml;
    if (!data || typeof data !== "string") {
      return null;
    }
    try {
      xml = (new window.DOMParser()).parseFromString(data, "text/xml");
    } catch (e) {
      xml = undefined;
    }
    if (!xml || xml.getElementsByTagName("parsererror").length) {
      jQuery.error("Invalid XML: " + data);
    }
    return xml;
  };
  var rbracket = /\[\]$/,
      rCRLF = /\r?\n/g,
      rsubmitterTypes = /^(?:submit|button|image|reset|file)$/i,
      rsubmittable = /^(?:input|select|textarea|keygen)/i;
  function buildParams(prefix, obj, traditional, add) {
    var name;
    if (jQuery.isArray(obj)) {
      jQuery.each(obj, function(i, v) {
        if (traditional || rbracket.test(prefix)) {
          add(prefix, v);
        } else {
          buildParams(prefix + "[" + (typeof v === "object" && v != null ? i : "") + "]", v, traditional, add);
        }
      });
    } else if (!traditional && jQuery.type(obj) === "object") {
      for (name in obj) {
        buildParams(prefix + "[" + name + "]", obj[name], traditional, add);
      }
    } else {
      add(prefix, obj);
    }
  }
  jQuery.param = function(a, traditional) {
    var prefix,
        s = [],
        add = function(key, valueOrFunction) {
          var value = jQuery.isFunction(valueOrFunction) ? valueOrFunction() : valueOrFunction;
          s[s.length] = encodeURIComponent(key) + "=" + encodeURIComponent(value == null ? "" : value);
        };
    if (jQuery.isArray(a) || (a.jquery && !jQuery.isPlainObject(a))) {
      jQuery.each(a, function() {
        add(this.name, this.value);
      });
    } else {
      for (prefix in a) {
        buildParams(prefix, a[prefix], traditional, add);
      }
    }
    return s.join("&");
  };
  jQuery.fn.extend({
    serialize: function() {
      return jQuery.param(this.serializeArray());
    },
    serializeArray: function() {
      return this.map(function() {
        var elements = jQuery.prop(this, "elements");
        return elements ? jQuery.makeArray(elements) : this;
      }).filter(function() {
        var type = this.type;
        return this.name && !jQuery(this).is(":disabled") && rsubmittable.test(this.nodeName) && !rsubmitterTypes.test(type) && (this.checked || !rcheckableType.test(type));
      }).map(function(i, elem) {
        var val = jQuery(this).val();
        if (val == null) {
          return null;
        }
        if (jQuery.isArray(val)) {
          return jQuery.map(val, function(val) {
            return {
              name: elem.name,
              value: val.replace(rCRLF, "\r\n")
            };
          });
        }
        return {
          name: elem.name,
          value: val.replace(rCRLF, "\r\n")
        };
      }).get();
    }
  });
  var r20 = /%20/g,
      rhash = /#.*$/,
      rantiCache = /([?&])_=[^&]*/,
      rheaders = /^(.*?):[ \t]*([^\r\n]*)$/mg,
      rlocalProtocol = /^(?:about|app|app-storage|.+-extension|file|res|widget):$/,
      rnoContent = /^(?:GET|HEAD)$/,
      rprotocol = /^\/\//,
      prefilters = {},
      transports = {},
      allTypes = "*/".concat("*"),
      originAnchor = document.createElement("a");
  originAnchor.href = location.href;
  function addToPrefiltersOrTransports(structure) {
    return function(dataTypeExpression, func) {
      if (typeof dataTypeExpression !== "string") {
        func = dataTypeExpression;
        dataTypeExpression = "*";
      }
      var dataType,
          i = 0,
          dataTypes = dataTypeExpression.toLowerCase().match(rnothtmlwhite) || [];
      if (jQuery.isFunction(func)) {
        while ((dataType = dataTypes[i++])) {
          if (dataType[0] === "+") {
            dataType = dataType.slice(1) || "*";
            (structure[dataType] = structure[dataType] || []).unshift(func);
          } else {
            (structure[dataType] = structure[dataType] || []).push(func);
          }
        }
      }
    };
  }
  function inspectPrefiltersOrTransports(structure, options, originalOptions, jqXHR) {
    var inspected = {},
        seekingTransport = (structure === transports);
    function inspect(dataType) {
      var selected;
      inspected[dataType] = true;
      jQuery.each(structure[dataType] || [], function(_, prefilterOrFactory) {
        var dataTypeOrTransport = prefilterOrFactory(options, originalOptions, jqXHR);
        if (typeof dataTypeOrTransport === "string" && !seekingTransport && !inspected[dataTypeOrTransport]) {
          options.dataTypes.unshift(dataTypeOrTransport);
          inspect(dataTypeOrTransport);
          return false;
        } else if (seekingTransport) {
          return !(selected = dataTypeOrTransport);
        }
      });
      return selected;
    }
    return inspect(options.dataTypes[0]) || !inspected["*"] && inspect("*");
  }
  function ajaxExtend(target, src) {
    var key,
        deep,
        flatOptions = jQuery.ajaxSettings.flatOptions || {};
    for (key in src) {
      if (src[key] !== undefined) {
        (flatOptions[key] ? target : (deep || (deep = {})))[key] = src[key];
      }
    }
    if (deep) {
      jQuery.extend(true, target, deep);
    }
    return target;
  }
  function ajaxHandleResponses(s, jqXHR, responses) {
    var ct,
        type,
        finalDataType,
        firstDataType,
        contents = s.contents,
        dataTypes = s.dataTypes;
    while (dataTypes[0] === "*") {
      dataTypes.shift();
      if (ct === undefined) {
        ct = s.mimeType || jqXHR.getResponseHeader("Content-Type");
      }
    }
    if (ct) {
      for (type in contents) {
        if (contents[type] && contents[type].test(ct)) {
          dataTypes.unshift(type);
          break;
        }
      }
    }
    if (dataTypes[0] in responses) {
      finalDataType = dataTypes[0];
    } else {
      for (type in responses) {
        if (!dataTypes[0] || s.converters[type + " " + dataTypes[0]]) {
          finalDataType = type;
          break;
        }
        if (!firstDataType) {
          firstDataType = type;
        }
      }
      finalDataType = finalDataType || firstDataType;
    }
    if (finalDataType) {
      if (finalDataType !== dataTypes[0]) {
        dataTypes.unshift(finalDataType);
      }
      return responses[finalDataType];
    }
  }
  function ajaxConvert(s, response, jqXHR, isSuccess) {
    var conv2,
        current,
        conv,
        tmp,
        prev,
        converters = {},
        dataTypes = s.dataTypes.slice();
    if (dataTypes[1]) {
      for (conv in s.converters) {
        converters[conv.toLowerCase()] = s.converters[conv];
      }
    }
    current = dataTypes.shift();
    while (current) {
      if (s.responseFields[current]) {
        jqXHR[s.responseFields[current]] = response;
      }
      if (!prev && isSuccess && s.dataFilter) {
        response = s.dataFilter(response, s.dataType);
      }
      prev = current;
      current = dataTypes.shift();
      if (current) {
        if (current === "*") {
          current = prev;
        } else if (prev !== "*" && prev !== current) {
          conv = converters[prev + " " + current] || converters["* " + current];
          if (!conv) {
            for (conv2 in converters) {
              tmp = conv2.split(" ");
              if (tmp[1] === current) {
                conv = converters[prev + " " + tmp[0]] || converters["* " + tmp[0]];
                if (conv) {
                  if (conv === true) {
                    conv = converters[conv2];
                  } else if (converters[conv2] !== true) {
                    current = tmp[0];
                    dataTypes.unshift(tmp[1]);
                  }
                  break;
                }
              }
            }
          }
          if (conv !== true) {
            if (conv && s.throws) {
              response = conv(response);
            } else {
              try {
                response = conv(response);
              } catch (e) {
                return {
                  state: "parsererror",
                  error: conv ? e : "No conversion from " + prev + " to " + current
                };
              }
            }
          }
        }
      }
    }
    return {
      state: "success",
      data: response
    };
  }
  jQuery.extend({
    active: 0,
    lastModified: {},
    etag: {},
    ajaxSettings: {
      url: location.href,
      type: "GET",
      isLocal: rlocalProtocol.test(location.protocol),
      global: true,
      processData: true,
      async: true,
      contentType: "application/x-www-form-urlencoded; charset=UTF-8",
      accepts: {
        "*": allTypes,
        text: "text/plain",
        html: "text/html",
        xml: "application/xml, text/xml",
        json: "application/json, text/javascript"
      },
      contents: {
        xml: /\bxml\b/,
        html: /\bhtml/,
        json: /\bjson\b/
      },
      responseFields: {
        xml: "responseXML",
        text: "responseText",
        json: "responseJSON"
      },
      converters: {
        "* text": String,
        "text html": true,
        "text json": JSON.parse,
        "text xml": jQuery.parseXML
      },
      flatOptions: {
        url: true,
        context: true
      }
    },
    ajaxSetup: function(target, settings) {
      return settings ? ajaxExtend(ajaxExtend(target, jQuery.ajaxSettings), settings) : ajaxExtend(jQuery.ajaxSettings, target);
    },
    ajaxPrefilter: addToPrefiltersOrTransports(prefilters),
    ajaxTransport: addToPrefiltersOrTransports(transports),
    ajax: function(url, options) {
      if (typeof url === "object") {
        options = url;
        url = undefined;
      }
      options = options || {};
      var transport,
          cacheURL,
          responseHeadersString,
          responseHeaders,
          timeoutTimer,
          urlAnchor,
          completed,
          fireGlobals,
          i,
          uncached,
          s = jQuery.ajaxSetup({}, options),
          callbackContext = s.context || s,
          globalEventContext = s.context && (callbackContext.nodeType || callbackContext.jquery) ? jQuery(callbackContext) : jQuery.event,
          deferred = jQuery.Deferred(),
          completeDeferred = jQuery.Callbacks("once memory"),
          statusCode = s.statusCode || {},
          requestHeaders = {},
          requestHeadersNames = {},
          strAbort = "canceled",
          jqXHR = {
            readyState: 0,
            getResponseHeader: function(key) {
              var match;
              if (completed) {
                if (!responseHeaders) {
                  responseHeaders = {};
                  while ((match = rheaders.exec(responseHeadersString))) {
                    responseHeaders[match[1].toLowerCase()] = match[2];
                  }
                }
                match = responseHeaders[key.toLowerCase()];
              }
              return match == null ? null : match;
            },
            getAllResponseHeaders: function() {
              return completed ? responseHeadersString : null;
            },
            setRequestHeader: function(name, value) {
              if (completed == null) {
                name = requestHeadersNames[name.toLowerCase()] = requestHeadersNames[name.toLowerCase()] || name;
                requestHeaders[name] = value;
              }
              return this;
            },
            overrideMimeType: function(type) {
              if (completed == null) {
                s.mimeType = type;
              }
              return this;
            },
            statusCode: function(map) {
              var code;
              if (map) {
                if (completed) {
                  jqXHR.always(map[jqXHR.status]);
                } else {
                  for (code in map) {
                    statusCode[code] = [statusCode[code], map[code]];
                  }
                }
              }
              return this;
            },
            abort: function(statusText) {
              var finalText = statusText || strAbort;
              if (transport) {
                transport.abort(finalText);
              }
              done(0, finalText);
              return this;
            }
          };
      deferred.promise(jqXHR);
      s.url = ((url || s.url || location.href) + "").replace(rprotocol, location.protocol + "//");
      s.type = options.method || options.type || s.method || s.type;
      s.dataTypes = (s.dataType || "*").toLowerCase().match(rnothtmlwhite) || [""];
      if (s.crossDomain == null) {
        urlAnchor = document.createElement("a");
        try {
          urlAnchor.href = s.url;
          urlAnchor.href = urlAnchor.href;
          s.crossDomain = originAnchor.protocol + "//" + originAnchor.host !== urlAnchor.protocol + "//" + urlAnchor.host;
        } catch (e) {
          s.crossDomain = true;
        }
      }
      if (s.data && s.processData && typeof s.data !== "string") {
        s.data = jQuery.param(s.data, s.traditional);
      }
      inspectPrefiltersOrTransports(prefilters, s, options, jqXHR);
      if (completed) {
        return jqXHR;
      }
      fireGlobals = jQuery.event && s.global;
      if (fireGlobals && jQuery.active++ === 0) {
        jQuery.event.trigger("ajaxStart");
      }
      s.type = s.type.toUpperCase();
      s.hasContent = !rnoContent.test(s.type);
      cacheURL = s.url.replace(rhash, "");
      if (!s.hasContent) {
        uncached = s.url.slice(cacheURL.length);
        if (s.data) {
          cacheURL += (rquery.test(cacheURL) ? "&" : "?") + s.data;
          delete s.data;
        }
        if (s.cache === false) {
          cacheURL = cacheURL.replace(rantiCache, "$1");
          uncached = (rquery.test(cacheURL) ? "&" : "?") + "_=" + (nonce++) + uncached;
        }
        s.url = cacheURL + uncached;
      } else if (s.data && s.processData && (s.contentType || "").indexOf("application/x-www-form-urlencoded") === 0) {
        s.data = s.data.replace(r20, "+");
      }
      if (s.ifModified) {
        if (jQuery.lastModified[cacheURL]) {
          jqXHR.setRequestHeader("If-Modified-Since", jQuery.lastModified[cacheURL]);
        }
        if (jQuery.etag[cacheURL]) {
          jqXHR.setRequestHeader("If-None-Match", jQuery.etag[cacheURL]);
        }
      }
      if (s.data && s.hasContent && s.contentType !== false || options.contentType) {
        jqXHR.setRequestHeader("Content-Type", s.contentType);
      }
      jqXHR.setRequestHeader("Accept", s.dataTypes[0] && s.accepts[s.dataTypes[0]] ? s.accepts[s.dataTypes[0]] + (s.dataTypes[0] !== "*" ? ", " + allTypes + "; q=0.01" : "") : s.accepts["*"]);
      for (i in s.headers) {
        jqXHR.setRequestHeader(i, s.headers[i]);
      }
      if (s.beforeSend && (s.beforeSend.call(callbackContext, jqXHR, s) === false || completed)) {
        return jqXHR.abort();
      }
      strAbort = "abort";
      completeDeferred.add(s.complete);
      jqXHR.done(s.success);
      jqXHR.fail(s.error);
      transport = inspectPrefiltersOrTransports(transports, s, options, jqXHR);
      if (!transport) {
        done(-1, "No Transport");
      } else {
        jqXHR.readyState = 1;
        if (fireGlobals) {
          globalEventContext.trigger("ajaxSend", [jqXHR, s]);
        }
        if (completed) {
          return jqXHR;
        }
        if (s.async && s.timeout > 0) {
          timeoutTimer = window.setTimeout(function() {
            jqXHR.abort("timeout");
          }, s.timeout);
        }
        try {
          completed = false;
          transport.send(requestHeaders, done);
        } catch (e) {
          if (completed) {
            throw e;
          }
          done(-1, e);
        }
      }
      function done(status, nativeStatusText, responses, headers) {
        var isSuccess,
            success,
            error,
            response,
            modified,
            statusText = nativeStatusText;
        if (completed) {
          return;
        }
        completed = true;
        if (timeoutTimer) {
          window.clearTimeout(timeoutTimer);
        }
        transport = undefined;
        responseHeadersString = headers || "";
        jqXHR.readyState = status > 0 ? 4 : 0;
        isSuccess = status >= 200 && status < 300 || status === 304;
        if (responses) {
          response = ajaxHandleResponses(s, jqXHR, responses);
        }
        response = ajaxConvert(s, response, jqXHR, isSuccess);
        if (isSuccess) {
          if (s.ifModified) {
            modified = jqXHR.getResponseHeader("Last-Modified");
            if (modified) {
              jQuery.lastModified[cacheURL] = modified;
            }
            modified = jqXHR.getResponseHeader("etag");
            if (modified) {
              jQuery.etag[cacheURL] = modified;
            }
          }
          if (status === 204 || s.type === "HEAD") {
            statusText = "nocontent";
          } else if (status === 304) {
            statusText = "notmodified";
          } else {
            statusText = response.state;
            success = response.data;
            error = response.error;
            isSuccess = !error;
          }
        } else {
          error = statusText;
          if (status || !statusText) {
            statusText = "error";
            if (status < 0) {
              status = 0;
            }
          }
        }
        jqXHR.status = status;
        jqXHR.statusText = (nativeStatusText || statusText) + "";
        if (isSuccess) {
          deferred.resolveWith(callbackContext, [success, statusText, jqXHR]);
        } else {
          deferred.rejectWith(callbackContext, [jqXHR, statusText, error]);
        }
        jqXHR.statusCode(statusCode);
        statusCode = undefined;
        if (fireGlobals) {
          globalEventContext.trigger(isSuccess ? "ajaxSuccess" : "ajaxError", [jqXHR, s, isSuccess ? success : error]);
        }
        completeDeferred.fireWith(callbackContext, [jqXHR, statusText]);
        if (fireGlobals) {
          globalEventContext.trigger("ajaxComplete", [jqXHR, s]);
          if (!(--jQuery.active)) {
            jQuery.event.trigger("ajaxStop");
          }
        }
      }
      return jqXHR;
    },
    getJSON: function(url, data, callback) {
      return jQuery.get(url, data, callback, "json");
    },
    getScript: function(url, callback) {
      return jQuery.get(url, undefined, callback, "script");
    }
  });
  jQuery.each(["get", "post"], function(i, method) {
    jQuery[method] = function(url, data, callback, type) {
      if (jQuery.isFunction(data)) {
        type = type || callback;
        callback = data;
        data = undefined;
      }
      return jQuery.ajax(jQuery.extend({
        url: url,
        type: method,
        dataType: type,
        data: data,
        success: callback
      }, jQuery.isPlainObject(url) && url));
    };
  });
  jQuery._evalUrl = function(url) {
    return jQuery.ajax({
      url: url,
      type: "GET",
      dataType: "script",
      cache: true,
      async: false,
      global: false,
      "throws": true
    });
  };
  jQuery.fn.extend({
    wrapAll: function(html) {
      var wrap;
      if (this[0]) {
        if (jQuery.isFunction(html)) {
          html = html.call(this[0]);
        }
        wrap = jQuery(html, this[0].ownerDocument).eq(0).clone(true);
        if (this[0].parentNode) {
          wrap.insertBefore(this[0]);
        }
        wrap.map(function() {
          var elem = this;
          while (elem.firstElementChild) {
            elem = elem.firstElementChild;
          }
          return elem;
        }).append(this);
      }
      return this;
    },
    wrapInner: function(html) {
      if (jQuery.isFunction(html)) {
        return this.each(function(i) {
          jQuery(this).wrapInner(html.call(this, i));
        });
      }
      return this.each(function() {
        var self = jQuery(this),
            contents = self.contents();
        if (contents.length) {
          contents.wrapAll(html);
        } else {
          self.append(html);
        }
      });
    },
    wrap: function(html) {
      var isFunction = jQuery.isFunction(html);
      return this.each(function(i) {
        jQuery(this).wrapAll(isFunction ? html.call(this, i) : html);
      });
    },
    unwrap: function(selector) {
      this.parent(selector).not("body").each(function() {
        jQuery(this).replaceWith(this.childNodes);
      });
      return this;
    }
  });
  jQuery.expr.pseudos.hidden = function(elem) {
    return !jQuery.expr.pseudos.visible(elem);
  };
  jQuery.expr.pseudos.visible = function(elem) {
    return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
  };
  jQuery.ajaxSettings.xhr = function() {
    try {
      return new window.XMLHttpRequest();
    } catch (e) {}
  };
  var xhrSuccessStatus = {
    0: 200,
    1223: 204
  },
      xhrSupported = jQuery.ajaxSettings.xhr();
  support.cors = !!xhrSupported && ("withCredentials" in xhrSupported);
  support.ajax = xhrSupported = !!xhrSupported;
  jQuery.ajaxTransport(function(options) {
    var callback,
        errorCallback;
    if (support.cors || xhrSupported && !options.crossDomain) {
      return {
        send: function(headers, complete) {
          var i,
              xhr = options.xhr();
          xhr.open(options.type, options.url, options.async, options.username, options.password);
          if (options.xhrFields) {
            for (i in options.xhrFields) {
              xhr[i] = options.xhrFields[i];
            }
          }
          if (options.mimeType && xhr.overrideMimeType) {
            xhr.overrideMimeType(options.mimeType);
          }
          if (!options.crossDomain && !headers["X-Requested-With"]) {
            headers["X-Requested-With"] = "XMLHttpRequest";
          }
          for (i in headers) {
            xhr.setRequestHeader(i, headers[i]);
          }
          callback = function(type) {
            return function() {
              if (callback) {
                callback = errorCallback = xhr.onload = xhr.onerror = xhr.onabort = xhr.onreadystatechange = null;
                if (type === "abort") {
                  xhr.abort();
                } else if (type === "error") {
                  if (typeof xhr.status !== "number") {
                    complete(0, "error");
                  } else {
                    complete(xhr.status, xhr.statusText);
                  }
                } else {
                  complete(xhrSuccessStatus[xhr.status] || xhr.status, xhr.statusText, (xhr.responseType || "text") !== "text" || typeof xhr.responseText !== "string" ? {binary: xhr.response} : {text: xhr.responseText}, xhr.getAllResponseHeaders());
                }
              }
            };
          };
          xhr.onload = callback();
          errorCallback = xhr.onerror = callback("error");
          if (xhr.onabort !== undefined) {
            xhr.onabort = errorCallback;
          } else {
            xhr.onreadystatechange = function() {
              if (xhr.readyState === 4) {
                window.setTimeout(function() {
                  if (callback) {
                    errorCallback();
                  }
                });
              }
            };
          }
          callback = callback("abort");
          try {
            xhr.send(options.hasContent && options.data || null);
          } catch (e) {
            if (callback) {
              throw e;
            }
          }
        },
        abort: function() {
          if (callback) {
            callback();
          }
        }
      };
    }
  });
  jQuery.ajaxPrefilter(function(s) {
    if (s.crossDomain) {
      s.contents.script = false;
    }
  });
  jQuery.ajaxSetup({
    accepts: {script: "text/javascript, application/javascript, " + "application/ecmascript, application/x-ecmascript"},
    contents: {script: /\b(?:java|ecma)script\b/},
    converters: {"text script": function(text) {
        jQuery.globalEval(text);
        return text;
      }}
  });
  jQuery.ajaxPrefilter("script", function(s) {
    if (s.cache === undefined) {
      s.cache = false;
    }
    if (s.crossDomain) {
      s.type = "GET";
    }
  });
  jQuery.ajaxTransport("script", function(s) {
    if (s.crossDomain) {
      var script,
          callback;
      return {
        send: function(_, complete) {
          script = jQuery("<script>").prop({
            charset: s.scriptCharset,
            src: s.url
          }).on("load error", callback = function(evt) {
            script.remove();
            callback = null;
            if (evt) {
              complete(evt.type === "error" ? 404 : 200, evt.type);
            }
          });
          document.head.appendChild(script[0]);
        },
        abort: function() {
          if (callback) {
            callback();
          }
        }
      };
    }
  });
  var oldCallbacks = [],
      rjsonp = /(=)\?(?=&|$)|\?\?/;
  jQuery.ajaxSetup({
    jsonp: "callback",
    jsonpCallback: function() {
      var callback = oldCallbacks.pop() || (jQuery.expando + "_" + (nonce++));
      this[callback] = true;
      return callback;
    }
  });
  jQuery.ajaxPrefilter("json jsonp", function(s, originalSettings, jqXHR) {
    var callbackName,
        overwritten,
        responseContainer,
        jsonProp = s.jsonp !== false && (rjsonp.test(s.url) ? "url" : typeof s.data === "string" && (s.contentType || "").indexOf("application/x-www-form-urlencoded") === 0 && rjsonp.test(s.data) && "data");
    if (jsonProp || s.dataTypes[0] === "jsonp") {
      callbackName = s.jsonpCallback = jQuery.isFunction(s.jsonpCallback) ? s.jsonpCallback() : s.jsonpCallback;
      if (jsonProp) {
        s[jsonProp] = s[jsonProp].replace(rjsonp, "$1" + callbackName);
      } else if (s.jsonp !== false) {
        s.url += (rquery.test(s.url) ? "&" : "?") + s.jsonp + "=" + callbackName;
      }
      s.converters["script json"] = function() {
        if (!responseContainer) {
          jQuery.error(callbackName + " was not called");
        }
        return responseContainer[0];
      };
      s.dataTypes[0] = "json";
      overwritten = window[callbackName];
      window[callbackName] = function() {
        responseContainer = arguments;
      };
      jqXHR.always(function() {
        if (overwritten === undefined) {
          jQuery(window).removeProp(callbackName);
        } else {
          window[callbackName] = overwritten;
        }
        if (s[callbackName]) {
          s.jsonpCallback = originalSettings.jsonpCallback;
          oldCallbacks.push(callbackName);
        }
        if (responseContainer && jQuery.isFunction(overwritten)) {
          overwritten(responseContainer[0]);
        }
        responseContainer = overwritten = undefined;
      });
      return "script";
    }
  });
  support.createHTMLDocument = (function() {
    var body = document.implementation.createHTMLDocument("").body;
    body.innerHTML = "<form></form><form></form>";
    return body.childNodes.length === 2;
  })();
  jQuery.parseHTML = function(data, context, keepScripts) {
    if (typeof data !== "string") {
      return [];
    }
    if (typeof context === "boolean") {
      keepScripts = context;
      context = false;
    }
    var base,
        parsed,
        scripts;
    if (!context) {
      if (support.createHTMLDocument) {
        context = document.implementation.createHTMLDocument("");
        base = context.createElement("base");
        base.href = document.location.href;
        context.head.appendChild(base);
      } else {
        context = document;
      }
    }
    parsed = rsingleTag.exec(data);
    scripts = !keepScripts && [];
    if (parsed) {
      return [context.createElement(parsed[1])];
    }
    parsed = buildFragment([data], context, scripts);
    if (scripts && scripts.length) {
      jQuery(scripts).remove();
    }
    return jQuery.merge([], parsed.childNodes);
  };
  jQuery.fn.load = function(url, params, callback) {
    var selector,
        type,
        response,
        self = this,
        off = url.indexOf(" ");
    if (off > -1) {
      selector = stripAndCollapse(url.slice(off));
      url = url.slice(0, off);
    }
    if (jQuery.isFunction(params)) {
      callback = params;
      params = undefined;
    } else if (params && typeof params === "object") {
      type = "POST";
    }
    if (self.length > 0) {
      jQuery.ajax({
        url: url,
        type: type || "GET",
        dataType: "html",
        data: params
      }).done(function(responseText) {
        response = arguments;
        self.html(selector ? jQuery("<div>").append(jQuery.parseHTML(responseText)).find(selector) : responseText);
      }).always(callback && function(jqXHR, status) {
        self.each(function() {
          callback.apply(this, response || [jqXHR.responseText, status, jqXHR]);
        });
      });
    }
    return this;
  };
  jQuery.each(["ajaxStart", "ajaxStop", "ajaxComplete", "ajaxError", "ajaxSuccess", "ajaxSend"], function(i, type) {
    jQuery.fn[type] = function(fn) {
      return this.on(type, fn);
    };
  });
  jQuery.expr.pseudos.animated = function(elem) {
    return jQuery.grep(jQuery.timers, function(fn) {
      return elem === fn.elem;
    }).length;
  };
  function getWindow(elem) {
    return jQuery.isWindow(elem) ? elem : elem.nodeType === 9 && elem.defaultView;
  }
  jQuery.offset = {setOffset: function(elem, options, i) {
      var curPosition,
          curLeft,
          curCSSTop,
          curTop,
          curOffset,
          curCSSLeft,
          calculatePosition,
          position = jQuery.css(elem, "position"),
          curElem = jQuery(elem),
          props = {};
      if (position === "static") {
        elem.style.position = "relative";
      }
      curOffset = curElem.offset();
      curCSSTop = jQuery.css(elem, "top");
      curCSSLeft = jQuery.css(elem, "left");
      calculatePosition = (position === "absolute" || position === "fixed") && (curCSSTop + curCSSLeft).indexOf("auto") > -1;
      if (calculatePosition) {
        curPosition = curElem.position();
        curTop = curPosition.top;
        curLeft = curPosition.left;
      } else {
        curTop = parseFloat(curCSSTop) || 0;
        curLeft = parseFloat(curCSSLeft) || 0;
      }
      if (jQuery.isFunction(options)) {
        options = options.call(elem, i, jQuery.extend({}, curOffset));
      }
      if (options.top != null) {
        props.top = (options.top - curOffset.top) + curTop;
      }
      if (options.left != null) {
        props.left = (options.left - curOffset.left) + curLeft;
      }
      if ("using" in options) {
        options.using.call(elem, props);
      } else {
        curElem.css(props);
      }
    }};
  jQuery.fn.extend({
    offset: function(options) {
      if (arguments.length) {
        return options === undefined ? this : this.each(function(i) {
          jQuery.offset.setOffset(this, options, i);
        });
      }
      var docElem,
          win,
          rect,
          doc,
          elem = this[0];
      if (!elem) {
        return;
      }
      if (!elem.getClientRects().length) {
        return {
          top: 0,
          left: 0
        };
      }
      rect = elem.getBoundingClientRect();
      if (rect.width || rect.height) {
        doc = elem.ownerDocument;
        win = getWindow(doc);
        docElem = doc.documentElement;
        return {
          top: rect.top + win.pageYOffset - docElem.clientTop,
          left: rect.left + win.pageXOffset - docElem.clientLeft
        };
      }
      return rect;
    },
    position: function() {
      if (!this[0]) {
        return;
      }
      var offsetParent,
          offset,
          elem = this[0],
          parentOffset = {
            top: 0,
            left: 0
          };
      if (jQuery.css(elem, "position") === "fixed") {
        offset = elem.getBoundingClientRect();
      } else {
        offsetParent = this.offsetParent();
        offset = this.offset();
        if (!jQuery.nodeName(offsetParent[0], "html")) {
          parentOffset = offsetParent.offset();
        }
        parentOffset = {
          top: parentOffset.top + jQuery.css(offsetParent[0], "borderTopWidth", true),
          left: parentOffset.left + jQuery.css(offsetParent[0], "borderLeftWidth", true)
        };
      }
      return {
        top: offset.top - parentOffset.top - jQuery.css(elem, "marginTop", true),
        left: offset.left - parentOffset.left - jQuery.css(elem, "marginLeft", true)
      };
    },
    offsetParent: function() {
      return this.map(function() {
        var offsetParent = this.offsetParent;
        while (offsetParent && jQuery.css(offsetParent, "position") === "static") {
          offsetParent = offsetParent.offsetParent;
        }
        return offsetParent || documentElement;
      });
    }
  });
  jQuery.each({
    scrollLeft: "pageXOffset",
    scrollTop: "pageYOffset"
  }, function(method, prop) {
    var top = "pageYOffset" === prop;
    jQuery.fn[method] = function(val) {
      return access(this, function(elem, method, val) {
        var win = getWindow(elem);
        if (val === undefined) {
          return win ? win[prop] : elem[method];
        }
        if (win) {
          win.scrollTo(!top ? val : win.pageXOffset, top ? val : win.pageYOffset);
        } else {
          elem[method] = val;
        }
      }, method, val, arguments.length);
    };
  });
  jQuery.each(["top", "left"], function(i, prop) {
    jQuery.cssHooks[prop] = addGetHookIf(support.pixelPosition, function(elem, computed) {
      if (computed) {
        computed = curCSS(elem, prop);
        return rnumnonpx.test(computed) ? jQuery(elem).position()[prop] + "px" : computed;
      }
    });
  });
  jQuery.each({
    Height: "height",
    Width: "width"
  }, function(name, type) {
    jQuery.each({
      padding: "inner" + name,
      content: type,
      "": "outer" + name
    }, function(defaultExtra, funcName) {
      jQuery.fn[funcName] = function(margin, value) {
        var chainable = arguments.length && (defaultExtra || typeof margin !== "boolean"),
            extra = defaultExtra || (margin === true || value === true ? "margin" : "border");
        return access(this, function(elem, type, value) {
          var doc;
          if (jQuery.isWindow(elem)) {
            return funcName.indexOf("outer") === 0 ? elem["inner" + name] : elem.document.documentElement["client" + name];
          }
          if (elem.nodeType === 9) {
            doc = elem.documentElement;
            return Math.max(elem.body["scroll" + name], doc["scroll" + name], elem.body["offset" + name], doc["offset" + name], doc["client" + name]);
          }
          return value === undefined ? jQuery.css(elem, type, extra) : jQuery.style(elem, type, value, extra);
        }, type, chainable ? margin : undefined, chainable);
      };
    });
  });
  jQuery.fn.extend({
    bind: function(types, data, fn) {
      return this.on(types, null, data, fn);
    },
    unbind: function(types, fn) {
      return this.off(types, null, fn);
    },
    delegate: function(selector, types, data, fn) {
      return this.on(types, selector, data, fn);
    },
    undelegate: function(selector, types, fn) {
      return arguments.length === 1 ? this.off(selector, "**") : this.off(types, selector || "**", fn);
    }
  });
  jQuery.parseJSON = JSON.parse;
  if (typeof define === "function" && define.amd) {
    define("131", [], function() {
      return jQuery;
    }) && define("jquery", ["131"], function(m) {
      return m;
    });
  }
  var _jQuery = window.jQuery,
      _$ = window.$;
  jQuery.noConflict = function(deep) {
    if (window.$ === jQuery) {
      window.$ = _$;
    }
    if (deep && window.jQuery === jQuery) {
      window.jQuery = _jQuery;
    }
    return jQuery;
  };
  if (!noGlobal) {
    window.jQuery = window.$ = jQuery;
  }
  return jQuery;
});

})();
(function() {
var define = $__System.amdDefine;
define("12d", ["131"], function(main) {
  return main;
});

})();
$__System.registerDynamic('132', [], true, function ($__require, exports, module) {
    var define,
        global = this || self,
        GLOBAL = global;
    // shim for using process in browser
    var process = module.exports = {};

    // cached from whatever global is present so that test runners that stub it
    // don't break things.  But we need to wrap it in a try catch in case it is
    // wrapped in strict mode code which doesn't define any globals.  It's inside a
    // function because try/catches deoptimize in certain engines.

    var cachedSetTimeout;
    var cachedClearTimeout;

    function defaultSetTimout() {
        throw new Error('setTimeout has not been defined');
    }
    function defaultClearTimeout() {
        throw new Error('clearTimeout has not been defined');
    }
    (function () {
        try {
            if (typeof setTimeout === 'function') {
                cachedSetTimeout = setTimeout;
            } else {
                cachedSetTimeout = defaultSetTimout;
            }
        } catch (e) {
            cachedSetTimeout = defaultSetTimout;
        }
        try {
            if (typeof clearTimeout === 'function') {
                cachedClearTimeout = clearTimeout;
            } else {
                cachedClearTimeout = defaultClearTimeout;
            }
        } catch (e) {
            cachedClearTimeout = defaultClearTimeout;
        }
    })();
    function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
            //normal enviroments in sane situations
            return setTimeout(fun, 0);
        }
        // if setTimeout wasn't available but was latter defined
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedSetTimeout(fun, 0);
        } catch (e) {
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                return cachedSetTimeout.call(null, fun, 0);
            } catch (e) {
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                return cachedSetTimeout.call(this, fun, 0);
            }
        }
    }
    function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
            //normal enviroments in sane situations
            return clearTimeout(marker);
        }
        // if clearTimeout wasn't available but was latter defined
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedClearTimeout(marker);
        } catch (e) {
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                return cachedClearTimeout.call(null, marker);
            } catch (e) {
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                return cachedClearTimeout.call(this, marker);
            }
        }
    }
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;

    function cleanUpNextTick() {
        if (!draining || !currentQueue) {
            return;
        }
        draining = false;
        if (currentQueue.length) {
            queue = currentQueue.concat(queue);
        } else {
            queueIndex = -1;
        }
        if (queue.length) {
            drainQueue();
        }
    }

    function drainQueue() {
        if (draining) {
            return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;

        var len = queue.length;
        while (len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
                if (currentQueue) {
                    currentQueue[queueIndex].run();
                }
            }
            queueIndex = -1;
            len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
    }

    process.nextTick = function (fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i];
            }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
        }
    };

    // v8 likes predictible objects
    function Item(fun, array) {
        this.fun = fun;
        this.array = array;
    }
    Item.prototype.run = function () {
        this.fun.apply(null, this.array);
    };
    process.title = 'browser';
    process.browser = true;
    process.env = {};
    process.argv = [];
    process.version = ''; // empty string to avoid regexp issues
    process.versions = {};

    function noop() {}

    process.on = noop;
    process.addListener = noop;
    process.once = noop;
    process.off = noop;
    process.removeListener = noop;
    process.removeAllListeners = noop;
    process.emit = noop;

    process.binding = function (name) {
        throw new Error('process.binding is not supported');
    };

    process.cwd = function () {
        return '/';
    };
    process.chdir = function (dir) {
        throw new Error('process.chdir is not supported');
    };
    process.umask = function () {
        return 0;
    };
    return module.exports;
});
$__System.registerDynamic("133", ["132"], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  module.exports = $__require("132");
  return module.exports;
});
$__System.registerDynamic('134', ['133'], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  module.exports = $__System._nodeRequire ? process : $__require('133');
  return module.exports;
});
$__System.registerDynamic("c6", ["134"], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  module.exports = $__require("134");
  return module.exports;
});
$__System.registerDynamic("135", ["12d", "c6"], true, function ($__require, exports, module) {
  /* */
  "format cjs";

  var define,
      global = this || self,
      GLOBAL = global;
  (function (process) {
    (function (factory) {
      "use strict";

      if (typeof define === 'function' && define.amd) {
        define(['jquery'], factory);
      } else if (typeof exports == "object" && typeof module == "object") {
        module.exports = factory($__require("12d"));
      } else {
        factory(jQuery);
      }
    })(function ($, undefined) {
      "use strict";

      var defaultOpts = {
        beforeShow: noop,
        move: noop,
        change: noop,
        show: noop,
        hide: noop,
        color: false,
        flat: false,
        showInput: false,
        allowEmpty: false,
        showButtons: true,
        clickoutFiresChange: true,
        showInitial: false,
        showPalette: false,
        showPaletteOnly: false,
        hideAfterPaletteSelect: false,
        togglePaletteOnly: false,
        showSelectionPalette: true,
        localStorageKey: false,
        appendTo: "body",
        maxSelectionSize: 7,
        cancelText: "cancel",
        chooseText: "choose",
        togglePaletteMoreText: "more",
        togglePaletteLessText: "less",
        clearText: "Clear Color Selection",
        noColorSelectedText: "No Color Selected",
        preferredFormat: false,
        className: "",
        containerClassName: "",
        replacerClassName: "",
        showAlpha: false,
        theme: "sp-light",
        palette: [["#ffffff", "#000000", "#ff0000", "#ff8000", "#ffff00", "#008000", "#0000ff", "#4b0082", "#9400d3"]],
        selectionPalette: [],
        disabled: false,
        offset: null
      },
          spectrums = [],
          IE = !!/msie/i.exec(window.navigator.userAgent),
          rgbaSupport = function () {
        function contains(str, substr) {
          return !!~('' + str).indexOf(substr);
        }
        var elem = document.createElement('div');
        var style = elem.style;
        style.cssText = 'background-color:rgba(0,0,0,.5)';
        return contains(style.backgroundColor, 'rgba') || contains(style.backgroundColor, 'hsla');
      }(),
          replaceInput = ["<div class='sp-replacer'>", "<div class='sp-preview'><div class='sp-preview-inner'></div></div>", "<div class='sp-dd'>&#9660;</div>", "</div>"].join(''),
          markup = function () {
        var gradientFix = "";
        if (IE) {
          for (var i = 1; i <= 6; i++) {
            gradientFix += "<div class='sp-" + i + "'></div>";
          }
        }
        return ["<div class='sp-container sp-hidden'>", "<div class='sp-palette-container'>", "<div class='sp-palette sp-thumb sp-cf'></div>", "<div class='sp-palette-button-container sp-cf'>", "<button type='button' class='sp-palette-toggle'></button>", "</div>", "</div>", "<div class='sp-picker-container'>", "<div class='sp-top sp-cf'>", "<div class='sp-fill'></div>", "<div class='sp-top-inner'>", "<div class='sp-color'>", "<div class='sp-sat'>", "<div class='sp-val'>", "<div class='sp-dragger'></div>", "</div>", "</div>", "</div>", "<div class='sp-clear sp-clear-display'>", "</div>", "<div class='sp-hue'>", "<div class='sp-slider'></div>", gradientFix, "</div>", "</div>", "<div class='sp-alpha'><div class='sp-alpha-inner'><div class='sp-alpha-handle'></div></div></div>", "</div>", "<div class='sp-input-container sp-cf'>", "<input class='sp-input' type='text' spellcheck='false'  />", "</div>", "<div class='sp-initial sp-thumb sp-cf'></div>", "<div class='sp-button-container sp-cf'>", "<a class='sp-cancel' href='#'></a>", "<button type='button' class='sp-choose'></button>", "</div>", "</div>", "</div>"].join("");
      }();
      function paletteTemplate(p, color, className, opts) {
        var html = [];
        for (var i = 0; i < p.length; i++) {
          var current = p[i];
          if (current) {
            var tiny = tinycolor(current);
            var c = tiny.toHsl().l < 0.5 ? "sp-thumb-el sp-thumb-dark" : "sp-thumb-el sp-thumb-light";
            c += tinycolor.equals(color, current) ? " sp-thumb-active" : "";
            var formattedString = tiny.toString(opts.preferredFormat || "rgb");
            var swatchStyle = rgbaSupport ? "background-color:" + tiny.toRgbString() : "filter:" + tiny.toFilter();
            html.push('<span title="' + formattedString + '" data-color="' + tiny.toRgbString() + '" class="' + c + '"><span class="sp-thumb-inner" style="' + swatchStyle + ';" /></span>');
          } else {
            var cls = 'sp-clear-display';
            html.push($('<div />').append($('<span data-color="" style="background-color:transparent;" class="' + cls + '"></span>').attr('title', opts.noColorSelectedText)).html());
          }
        }
        return "<div class='sp-cf " + className + "'>" + html.join('') + "</div>";
      }
      function hideAll() {
        for (var i = 0; i < spectrums.length; i++) {
          if (spectrums[i]) {
            spectrums[i].hide();
          }
        }
      }
      function instanceOptions(o, callbackContext) {
        var opts = $.extend({}, defaultOpts, o);
        opts.callbacks = {
          'move': bind(opts.move, callbackContext),
          'change': bind(opts.change, callbackContext),
          'show': bind(opts.show, callbackContext),
          'hide': bind(opts.hide, callbackContext),
          'beforeShow': bind(opts.beforeShow, callbackContext)
        };
        return opts;
      }
      function spectrum(element, o) {
        var opts = instanceOptions(o, element),
            flat = opts.flat,
            showSelectionPalette = opts.showSelectionPalette,
            localStorageKey = opts.localStorageKey,
            theme = opts.theme,
            callbacks = opts.callbacks,
            resize = throttle(reflow, 10),
            visible = false,
            isDragging = false,
            dragWidth = 0,
            dragHeight = 0,
            dragHelperHeight = 0,
            slideHeight = 0,
            slideWidth = 0,
            alphaWidth = 0,
            alphaSlideHelperWidth = 0,
            slideHelperHeight = 0,
            currentHue = 0,
            currentSaturation = 0,
            currentValue = 0,
            currentAlpha = 1,
            palette = [],
            paletteArray = [],
            paletteLookup = {},
            selectionPalette = opts.selectionPalette.slice(0),
            maxSelectionSize = opts.maxSelectionSize,
            draggingClass = "sp-dragging",
            shiftMovementDirection = null;
        var doc = element.ownerDocument,
            body = doc.body,
            boundElement = $(element),
            disabled = false,
            container = $(markup, doc).addClass(theme),
            pickerContainer = container.find(".sp-picker-container"),
            dragger = container.find(".sp-color"),
            dragHelper = container.find(".sp-dragger"),
            slider = container.find(".sp-hue"),
            slideHelper = container.find(".sp-slider"),
            alphaSliderInner = container.find(".sp-alpha-inner"),
            alphaSlider = container.find(".sp-alpha"),
            alphaSlideHelper = container.find(".sp-alpha-handle"),
            textInput = container.find(".sp-input"),
            paletteContainer = container.find(".sp-palette"),
            initialColorContainer = container.find(".sp-initial"),
            cancelButton = container.find(".sp-cancel"),
            clearButton = container.find(".sp-clear"),
            chooseButton = container.find(".sp-choose"),
            toggleButton = container.find(".sp-palette-toggle"),
            isInput = boundElement.is("input"),
            isInputTypeColor = isInput && boundElement.attr("type") === "color" && inputTypeColorSupport(),
            shouldReplace = isInput && !flat,
            replacer = shouldReplace ? $(replaceInput).addClass(theme).addClass(opts.className).addClass(opts.replacerClassName) : $([]),
            offsetElement = shouldReplace ? replacer : boundElement,
            previewElement = replacer.find(".sp-preview-inner"),
            initialColor = opts.color || isInput && boundElement.val(),
            colorOnShow = false,
            currentPreferredFormat = opts.preferredFormat,
            clickoutFiresChange = !opts.showButtons || opts.clickoutFiresChange,
            isEmpty = !initialColor,
            allowEmpty = opts.allowEmpty && !isInputTypeColor;
        function applyOptions() {
          if (opts.showPaletteOnly) {
            opts.showPalette = true;
          }
          toggleButton.text(opts.showPaletteOnly ? opts.togglePaletteMoreText : opts.togglePaletteLessText);
          if (opts.palette) {
            palette = opts.palette.slice(0);
            paletteArray = $.isArray(palette[0]) ? palette : [palette];
            paletteLookup = {};
            for (var i = 0; i < paletteArray.length; i++) {
              for (var j = 0; j < paletteArray[i].length; j++) {
                var rgb = tinycolor(paletteArray[i][j]).toRgbString();
                paletteLookup[rgb] = true;
              }
            }
          }
          container.toggleClass("sp-flat", flat);
          container.toggleClass("sp-input-disabled", !opts.showInput);
          container.toggleClass("sp-alpha-enabled", opts.showAlpha);
          container.toggleClass("sp-clear-enabled", allowEmpty);
          container.toggleClass("sp-buttons-disabled", !opts.showButtons);
          container.toggleClass("sp-palette-buttons-disabled", !opts.togglePaletteOnly);
          container.toggleClass("sp-palette-disabled", !opts.showPalette);
          container.toggleClass("sp-palette-only", opts.showPaletteOnly);
          container.toggleClass("sp-initial-disabled", !opts.showInitial);
          container.addClass(opts.className).addClass(opts.containerClassName);
          reflow();
        }
        function initialize() {
          if (IE) {
            container.find("*:not(input)").attr("unselectable", "on");
          }
          applyOptions();
          if (shouldReplace) {
            boundElement.after(replacer).hide();
          }
          if (!allowEmpty) {
            clearButton.hide();
          }
          if (flat) {
            boundElement.after(container).hide();
          } else {
            var appendTo = opts.appendTo === "parent" ? boundElement.parent() : $(opts.appendTo);
            if (appendTo.length !== 1) {
              appendTo = $("body");
            }
            appendTo.append(container);
          }
          updateSelectionPaletteFromStorage();
          offsetElement.bind("click.spectrum touchstart.spectrum", function (e) {
            if (!disabled) {
              toggle();
            }
            e.stopPropagation();
            if (!$(e.target).is("input")) {
              e.preventDefault();
            }
          });
          if (boundElement.is(":disabled") || opts.disabled === true) {
            disable();
          }
          container.click(stopPropagation);
          textInput.change(setFromTextInput);
          textInput.bind("paste", function () {
            setTimeout(setFromTextInput, 1);
          });
          textInput.keydown(function (e) {
            if (e.keyCode == 13) {
              setFromTextInput();
            }
          });
          cancelButton.text(opts.cancelText);
          cancelButton.bind("click.spectrum", function (e) {
            e.stopPropagation();
            e.preventDefault();
            revert();
            hide();
          });
          clearButton.attr("title", opts.clearText);
          clearButton.bind("click.spectrum", function (e) {
            e.stopPropagation();
            e.preventDefault();
            isEmpty = true;
            move();
            if (flat) {
              updateOriginalInput(true);
            }
          });
          chooseButton.text(opts.chooseText);
          chooseButton.bind("click.spectrum", function (e) {
            e.stopPropagation();
            e.preventDefault();
            if (IE && textInput.is(":focus")) {
              textInput.trigger('change');
            }
            if (isValid()) {
              updateOriginalInput(true);
              hide();
            }
          });
          toggleButton.text(opts.showPaletteOnly ? opts.togglePaletteMoreText : opts.togglePaletteLessText);
          toggleButton.bind("click.spectrum", function (e) {
            e.stopPropagation();
            e.preventDefault();
            opts.showPaletteOnly = !opts.showPaletteOnly;
            if (!opts.showPaletteOnly && !flat) {
              container.css('left', '-=' + (pickerContainer.outerWidth(true) + 5));
            }
            applyOptions();
          });
          draggable(alphaSlider, function (dragX, dragY, e) {
            currentAlpha = dragX / alphaWidth;
            isEmpty = false;
            if (e.shiftKey) {
              currentAlpha = Math.round(currentAlpha * 10) / 10;
            }
            move();
          }, dragStart, dragStop);
          draggable(slider, function (dragX, dragY) {
            currentHue = parseFloat(dragY / slideHeight);
            isEmpty = false;
            if (!opts.showAlpha) {
              currentAlpha = 1;
            }
            move();
          }, dragStart, dragStop);
          draggable(dragger, function (dragX, dragY, e) {
            if (!e.shiftKey) {
              shiftMovementDirection = null;
            } else if (!shiftMovementDirection) {
              var oldDragX = currentSaturation * dragWidth;
              var oldDragY = dragHeight - currentValue * dragHeight;
              var furtherFromX = Math.abs(dragX - oldDragX) > Math.abs(dragY - oldDragY);
              shiftMovementDirection = furtherFromX ? "x" : "y";
            }
            var setSaturation = !shiftMovementDirection || shiftMovementDirection === "x";
            var setValue = !shiftMovementDirection || shiftMovementDirection === "y";
            if (setSaturation) {
              currentSaturation = parseFloat(dragX / dragWidth);
            }
            if (setValue) {
              currentValue = parseFloat((dragHeight - dragY) / dragHeight);
            }
            isEmpty = false;
            if (!opts.showAlpha) {
              currentAlpha = 1;
            }
            move();
          }, dragStart, dragStop);
          if (!!initialColor) {
            set(initialColor);
            updateUI();
            currentPreferredFormat = opts.preferredFormat || tinycolor(initialColor).format;
            addColorToSelectionPalette(initialColor);
          } else {
            updateUI();
          }
          if (flat) {
            show();
          }
          function paletteElementClick(e) {
            if (e.data && e.data.ignore) {
              set($(e.target).closest(".sp-thumb-el").data("color"));
              move();
            } else {
              set($(e.target).closest(".sp-thumb-el").data("color"));
              move();
              updateOriginalInput(true);
              if (opts.hideAfterPaletteSelect) {
                hide();
              }
            }
            return false;
          }
          var paletteEvent = IE ? "mousedown.spectrum" : "click.spectrum touchstart.spectrum";
          paletteContainer.delegate(".sp-thumb-el", paletteEvent, paletteElementClick);
          initialColorContainer.delegate(".sp-thumb-el:nth-child(1)", paletteEvent, { ignore: true }, paletteElementClick);
        }
        function updateSelectionPaletteFromStorage() {
          if (localStorageKey && window.localStorage) {
            try {
              var oldPalette = window.localStorage[localStorageKey].split(",#");
              if (oldPalette.length > 1) {
                delete window.localStorage[localStorageKey];
                $.each(oldPalette, function (i, c) {
                  addColorToSelectionPalette(c);
                });
              }
            } catch (e) {}
            try {
              selectionPalette = window.localStorage[localStorageKey].split(";");
            } catch (e) {}
          }
        }
        function addColorToSelectionPalette(color) {
          if (showSelectionPalette) {
            var rgb = tinycolor(color).toRgbString();
            if (!paletteLookup[rgb] && $.inArray(rgb, selectionPalette) === -1) {
              selectionPalette.push(rgb);
              while (selectionPalette.length > maxSelectionSize) {
                selectionPalette.shift();
              }
            }
            if (localStorageKey && window.localStorage) {
              try {
                window.localStorage[localStorageKey] = selectionPalette.join(";");
              } catch (e) {}
            }
          }
        }
        function getUniqueSelectionPalette() {
          var unique = [];
          if (opts.showPalette) {
            for (var i = 0; i < selectionPalette.length; i++) {
              var rgb = tinycolor(selectionPalette[i]).toRgbString();
              if (!paletteLookup[rgb]) {
                unique.push(selectionPalette[i]);
              }
            }
          }
          return unique.reverse().slice(0, opts.maxSelectionSize);
        }
        function drawPalette() {
          var currentColor = get();
          var html = $.map(paletteArray, function (palette, i) {
            return paletteTemplate(palette, currentColor, "sp-palette-row sp-palette-row-" + i, opts);
          });
          updateSelectionPaletteFromStorage();
          if (selectionPalette) {
            html.push(paletteTemplate(getUniqueSelectionPalette(), currentColor, "sp-palette-row sp-palette-row-selection", opts));
          }
          paletteContainer.html(html.join(""));
        }
        function drawInitial() {
          if (opts.showInitial) {
            var initial = colorOnShow;
            var current = get();
            initialColorContainer.html(paletteTemplate([initial, current], current, "sp-palette-row-initial", opts));
          }
        }
        function dragStart() {
          if (dragHeight <= 0 || dragWidth <= 0 || slideHeight <= 0) {
            reflow();
          }
          isDragging = true;
          container.addClass(draggingClass);
          shiftMovementDirection = null;
          boundElement.trigger('dragstart.spectrum', [get()]);
        }
        function dragStop() {
          isDragging = false;
          container.removeClass(draggingClass);
          boundElement.trigger('dragstop.spectrum', [get()]);
        }
        function setFromTextInput() {
          var value = textInput.val();
          if ((value === null || value === "") && allowEmpty) {
            set(null);
            updateOriginalInput(true);
          } else {
            var tiny = tinycolor(value);
            if (tiny.isValid()) {
              set(tiny);
              updateOriginalInput(true);
            } else {
              textInput.addClass("sp-validation-error");
            }
          }
        }
        function toggle() {
          if (visible) {
            hide();
          } else {
            show();
          }
        }
        function show() {
          var event = $.Event('beforeShow.spectrum');
          if (visible) {
            reflow();
            return;
          }
          boundElement.trigger(event, [get()]);
          if (callbacks.beforeShow(get()) === false || event.isDefaultPrevented()) {
            return;
          }
          hideAll();
          visible = true;
          $(doc).bind("keydown.spectrum", onkeydown);
          $(doc).bind("click.spectrum", clickout);
          $(window).bind("resize.spectrum", resize);
          replacer.addClass("sp-active");
          container.removeClass("sp-hidden");
          reflow();
          updateUI();
          colorOnShow = get();
          drawInitial();
          callbacks.show(colorOnShow);
          boundElement.trigger('show.spectrum', [colorOnShow]);
        }
        function onkeydown(e) {
          if (e.keyCode === 27) {
            hide();
          }
        }
        function clickout(e) {
          if (e.button == 2) {
            return;
          }
          if (isDragging) {
            return;
          }
          if (clickoutFiresChange) {
            updateOriginalInput(true);
          } else {
            revert();
          }
          hide();
        }
        function hide() {
          if (!visible || flat) {
            return;
          }
          visible = false;
          $(doc).unbind("keydown.spectrum", onkeydown);
          $(doc).unbind("click.spectrum", clickout);
          $(window).unbind("resize.spectrum", resize);
          replacer.removeClass("sp-active");
          container.addClass("sp-hidden");
          callbacks.hide(get());
          boundElement.trigger('hide.spectrum', [get()]);
        }
        function revert() {
          set(colorOnShow, true);
        }
        function set(color, ignoreFormatChange) {
          if (tinycolor.equals(color, get())) {
            updateUI();
            return;
          }
          var newColor, newHsv;
          if (!color && allowEmpty) {
            isEmpty = true;
          } else {
            isEmpty = false;
            newColor = tinycolor(color);
            newHsv = newColor.toHsv();
            currentHue = newHsv.h % 360 / 360;
            currentSaturation = newHsv.s;
            currentValue = newHsv.v;
            currentAlpha = newHsv.a;
          }
          updateUI();
          if (newColor && newColor.isValid() && !ignoreFormatChange) {
            currentPreferredFormat = opts.preferredFormat || newColor.getFormat();
          }
        }
        function get(opts) {
          opts = opts || {};
          if (allowEmpty && isEmpty) {
            return null;
          }
          return tinycolor.fromRatio({
            h: currentHue,
            s: currentSaturation,
            v: currentValue,
            a: Math.round(currentAlpha * 100) / 100
          }, { format: opts.format || currentPreferredFormat });
        }
        function isValid() {
          return !textInput.hasClass("sp-validation-error");
        }
        function move() {
          updateUI();
          callbacks.move(get());
          boundElement.trigger('move.spectrum', [get()]);
        }
        function updateUI() {
          textInput.removeClass("sp-validation-error");
          updateHelperLocations();
          var flatColor = tinycolor.fromRatio({
            h: currentHue,
            s: 1,
            v: 1
          });
          dragger.css("background-color", flatColor.toHexString());
          var format = currentPreferredFormat;
          if (currentAlpha < 1 && !(currentAlpha === 0 && format === "name")) {
            if (format === "hex" || format === "hex3" || format === "hex6" || format === "name") {
              format = "rgb";
            }
          }
          var realColor = get({ format: format }),
              displayColor = '';
          previewElement.removeClass("sp-clear-display");
          previewElement.css('background-color', 'transparent');
          if (!realColor && allowEmpty) {
            previewElement.addClass("sp-clear-display");
          } else {
            var realHex = realColor.toHexString(),
                realRgb = realColor.toRgbString();
            if (rgbaSupport || realColor.alpha === 1) {
              previewElement.css("background-color", realRgb);
            } else {
              previewElement.css("background-color", "transparent");
              previewElement.css("filter", realColor.toFilter());
            }
            if (opts.showAlpha) {
              var rgb = realColor.toRgb();
              rgb.a = 0;
              var realAlpha = tinycolor(rgb).toRgbString();
              var gradient = "linear-gradient(left, " + realAlpha + ", " + realHex + ")";
              if (IE) {
                alphaSliderInner.css("filter", tinycolor(realAlpha).toFilter({ gradientType: 1 }, realHex));
              } else {
                alphaSliderInner.css("background", "-webkit-" + gradient);
                alphaSliderInner.css("background", "-moz-" + gradient);
                alphaSliderInner.css("background", "-ms-" + gradient);
                alphaSliderInner.css("background", "linear-gradient(to right, " + realAlpha + ", " + realHex + ")");
              }
            }
            displayColor = realColor.toString(format);
          }
          if (opts.showInput) {
            textInput.val(displayColor);
          }
          if (opts.showPalette) {
            drawPalette();
          }
          drawInitial();
        }
        function updateHelperLocations() {
          var s = currentSaturation;
          var v = currentValue;
          if (allowEmpty && isEmpty) {
            alphaSlideHelper.hide();
            slideHelper.hide();
            dragHelper.hide();
          } else {
            alphaSlideHelper.show();
            slideHelper.show();
            dragHelper.show();
            var dragX = s * dragWidth;
            var dragY = dragHeight - v * dragHeight;
            dragX = Math.max(-dragHelperHeight, Math.min(dragWidth - dragHelperHeight, dragX - dragHelperHeight));
            dragY = Math.max(-dragHelperHeight, Math.min(dragHeight - dragHelperHeight, dragY - dragHelperHeight));
            dragHelper.css({
              "top": dragY + "px",
              "left": dragX + "px"
            });
            var alphaX = currentAlpha * alphaWidth;
            alphaSlideHelper.css({ "left": alphaX - alphaSlideHelperWidth / 2 + "px" });
            var slideY = currentHue * slideHeight;
            slideHelper.css({ "top": slideY - slideHelperHeight + "px" });
          }
        }
        function updateOriginalInput(fireCallback) {
          var color = get(),
              displayColor = '',
              hasChanged = !tinycolor.equals(color, colorOnShow);
          if (color) {
            displayColor = color.toString(currentPreferredFormat);
            addColorToSelectionPalette(color);
          }
          if (isInput) {
            boundElement.val(displayColor);
          }
          if (fireCallback && hasChanged) {
            callbacks.change(color);
            boundElement.trigger('change', [color]);
          }
        }
        function reflow() {
          if (!visible) {
            return;
          }
          dragWidth = dragger.width();
          dragHeight = dragger.height();
          dragHelperHeight = dragHelper.height();
          slideWidth = slider.width();
          slideHeight = slider.height();
          slideHelperHeight = slideHelper.height();
          alphaWidth = alphaSlider.width();
          alphaSlideHelperWidth = alphaSlideHelper.width();
          if (!flat) {
            container.css("position", "absolute");
            if (opts.offset) {
              container.offset(opts.offset);
            } else {
              container.offset(getOffset(container, offsetElement));
            }
          }
          updateHelperLocations();
          if (opts.showPalette) {
            drawPalette();
          }
          boundElement.trigger('reflow.spectrum');
        }
        function destroy() {
          boundElement.show();
          offsetElement.unbind("click.spectrum touchstart.spectrum");
          container.remove();
          replacer.remove();
          spectrums[spect.id] = null;
        }
        function option(optionName, optionValue) {
          if (optionName === undefined) {
            return $.extend({}, opts);
          }
          if (optionValue === undefined) {
            return opts[optionName];
          }
          opts[optionName] = optionValue;
          if (optionName === "preferredFormat") {
            currentPreferredFormat = opts.preferredFormat;
          }
          applyOptions();
        }
        function enable() {
          disabled = false;
          boundElement.attr("disabled", false);
          offsetElement.removeClass("sp-disabled");
        }
        function disable() {
          hide();
          disabled = true;
          boundElement.attr("disabled", true);
          offsetElement.addClass("sp-disabled");
        }
        function setOffset(coord) {
          opts.offset = coord;
          reflow();
        }
        initialize();
        var spect = {
          show: show,
          hide: hide,
          toggle: toggle,
          reflow: reflow,
          option: option,
          enable: enable,
          disable: disable,
          offset: setOffset,
          set: function (c) {
            set(c);
            updateOriginalInput();
          },
          get: get,
          destroy: destroy,
          container: container
        };
        spect.id = spectrums.push(spect) - 1;
        return spect;
      }
      function getOffset(picker, input) {
        var extraY = 0;
        var dpWidth = picker.outerWidth();
        var dpHeight = picker.outerHeight();
        var inputHeight = input.outerHeight();
        var doc = picker[0].ownerDocument;
        var docElem = doc.documentElement;
        var viewWidth = docElem.clientWidth + $(doc).scrollLeft();
        var viewHeight = docElem.clientHeight + $(doc).scrollTop();
        var offset = input.offset();
        offset.top += inputHeight;
        offset.left -= Math.min(offset.left, offset.left + dpWidth > viewWidth && viewWidth > dpWidth ? Math.abs(offset.left + dpWidth - viewWidth) : 0);
        offset.top -= Math.min(offset.top, offset.top + dpHeight > viewHeight && viewHeight > dpHeight ? Math.abs(dpHeight + inputHeight - extraY) : extraY);
        return offset;
      }
      function noop() {}
      function stopPropagation(e) {
        e.stopPropagation();
      }
      function bind(func, obj) {
        var slice = Array.prototype.slice;
        var args = slice.call(arguments, 2);
        return function () {
          return func.apply(obj, args.concat(slice.call(arguments)));
        };
      }
      function draggable(element, onmove, onstart, onstop) {
        onmove = onmove || function () {};
        onstart = onstart || function () {};
        onstop = onstop || function () {};
        var doc = document;
        var dragging = false;
        var offset = {};
        var maxHeight = 0;
        var maxWidth = 0;
        var hasTouch = 'ontouchstart' in window;
        var duringDragEvents = {};
        duringDragEvents["selectstart"] = prevent;
        duringDragEvents["dragstart"] = prevent;
        duringDragEvents["touchmove mousemove"] = move;
        duringDragEvents["touchend mouseup"] = stop;
        function prevent(e) {
          if (e.stopPropagation) {
            e.stopPropagation();
          }
          if (e.preventDefault) {
            e.preventDefault();
          }
          e.returnValue = false;
        }
        function move(e) {
          if (dragging) {
            if (IE && doc.documentMode < 9 && !e.button) {
              return stop();
            }
            var t0 = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            var pageX = t0 && t0.pageX || e.pageX;
            var pageY = t0 && t0.pageY || e.pageY;
            var dragX = Math.max(0, Math.min(pageX - offset.left, maxWidth));
            var dragY = Math.max(0, Math.min(pageY - offset.top, maxHeight));
            if (hasTouch) {
              prevent(e);
            }
            onmove.apply(element, [dragX, dragY, e]);
          }
        }
        function start(e) {
          var rightclick = e.which ? e.which == 3 : e.button == 2;
          if (!rightclick && !dragging) {
            if (onstart.apply(element, arguments) !== false) {
              dragging = true;
              maxHeight = $(element).height();
              maxWidth = $(element).width();
              offset = $(element).offset();
              $(doc).bind(duringDragEvents);
              $(doc.body).addClass("sp-dragging");
              move(e);
              prevent(e);
            }
          }
        }
        function stop() {
          if (dragging) {
            $(doc).unbind(duringDragEvents);
            $(doc.body).removeClass("sp-dragging");
            setTimeout(function () {
              onstop.apply(element, arguments);
            }, 0);
          }
          dragging = false;
        }
        $(element).bind("touchstart mousedown", start);
      }
      function throttle(func, wait, debounce) {
        var timeout;
        return function () {
          var context = this,
              args = arguments;
          var throttler = function () {
            timeout = null;
            func.apply(context, args);
          };
          if (debounce) clearTimeout(timeout);
          if (debounce || !timeout) timeout = setTimeout(throttler, wait);
        };
      }
      function inputTypeColorSupport() {
        return $.fn.spectrum.inputTypeColorSupport();
      }
      var dataID = "spectrum.id";
      $.fn.spectrum = function (opts, extra) {
        if (typeof opts == "string") {
          var returnValue = this;
          var args = Array.prototype.slice.call(arguments, 1);
          this.each(function () {
            var spect = spectrums[$(this).data(dataID)];
            if (spect) {
              var method = spect[opts];
              if (!method) {
                throw new Error("Spectrum: no such method: '" + opts + "'");
              }
              if (opts == "get") {
                returnValue = spect.get();
              } else if (opts == "container") {
                returnValue = spect.container;
              } else if (opts == "option") {
                returnValue = spect.option.apply(spect, args);
              } else if (opts == "destroy") {
                spect.destroy();
                $(this).removeData(dataID);
              } else {
                method.apply(spect, args);
              }
            }
          });
          return returnValue;
        }
        return this.spectrum("destroy").each(function () {
          var options = $.extend({}, opts, $(this).data());
          var spect = spectrum(this, options);
          $(this).data(dataID, spect.id);
        });
      };
      $.fn.spectrum.load = true;
      $.fn.spectrum.loadOpts = {};
      $.fn.spectrum.draggable = draggable;
      $.fn.spectrum.defaults = defaultOpts;
      $.fn.spectrum.inputTypeColorSupport = function inputTypeColorSupport() {
        if (typeof inputTypeColorSupport._cachedResult === "undefined") {
          var colorInput = $("<input type='color'/>")[0];
          inputTypeColorSupport._cachedResult = colorInput.type === "color" && colorInput.value !== "";
        }
        return inputTypeColorSupport._cachedResult;
      };
      $.spectrum = {};
      $.spectrum.localization = {};
      $.spectrum.palettes = {};
      $.fn.spectrum.processNativeColorInputs = function () {
        var colorInputs = $("input[type=color]");
        if (colorInputs.length && !inputTypeColorSupport()) {
          colorInputs.spectrum({ preferredFormat: "hex6" });
        }
      };
      (function () {
        var trimLeft = /^[\s,#]+/,
            trimRight = /\s+$/,
            tinyCounter = 0,
            math = Math,
            mathRound = math.round,
            mathMin = math.min,
            mathMax = math.max,
            mathRandom = math.random;
        var tinycolor = function (color, opts) {
          color = color ? color : '';
          opts = opts || {};
          if (color instanceof tinycolor) {
            return color;
          }
          if (!(this instanceof tinycolor)) {
            return new tinycolor(color, opts);
          }
          var rgb = inputToRGB(color);
          this._originalInput = color, this._r = rgb.r, this._g = rgb.g, this._b = rgb.b, this._a = rgb.a, this._roundA = mathRound(100 * this._a) / 100, this._format = opts.format || rgb.format;
          this._gradientType = opts.gradientType;
          if (this._r < 1) {
            this._r = mathRound(this._r);
          }
          if (this._g < 1) {
            this._g = mathRound(this._g);
          }
          if (this._b < 1) {
            this._b = mathRound(this._b);
          }
          this._ok = rgb.ok;
          this._tc_id = tinyCounter++;
        };
        tinycolor.prototype = {
          isDark: function () {
            return this.getBrightness() < 128;
          },
          isLight: function () {
            return !this.isDark();
          },
          isValid: function () {
            return this._ok;
          },
          getOriginalInput: function () {
            return this._originalInput;
          },
          getFormat: function () {
            return this._format;
          },
          getAlpha: function () {
            return this._a;
          },
          getBrightness: function () {
            var rgb = this.toRgb();
            return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
          },
          setAlpha: function (value) {
            this._a = boundAlpha(value);
            this._roundA = mathRound(100 * this._a) / 100;
            return this;
          },
          toHsv: function () {
            var hsv = rgbToHsv(this._r, this._g, this._b);
            return {
              h: hsv.h * 360,
              s: hsv.s,
              v: hsv.v,
              a: this._a
            };
          },
          toHsvString: function () {
            var hsv = rgbToHsv(this._r, this._g, this._b);
            var h = mathRound(hsv.h * 360),
                s = mathRound(hsv.s * 100),
                v = mathRound(hsv.v * 100);
            return this._a == 1 ? "hsv(" + h + ", " + s + "%, " + v + "%)" : "hsva(" + h + ", " + s + "%, " + v + "%, " + this._roundA + ")";
          },
          toHsl: function () {
            var hsl = rgbToHsl(this._r, this._g, this._b);
            return {
              h: hsl.h * 360,
              s: hsl.s,
              l: hsl.l,
              a: this._a
            };
          },
          toHslString: function () {
            var hsl = rgbToHsl(this._r, this._g, this._b);
            var h = mathRound(hsl.h * 360),
                s = mathRound(hsl.s * 100),
                l = mathRound(hsl.l * 100);
            return this._a == 1 ? "hsl(" + h + ", " + s + "%, " + l + "%)" : "hsla(" + h + ", " + s + "%, " + l + "%, " + this._roundA + ")";
          },
          toHex: function (allow3Char) {
            return rgbToHex(this._r, this._g, this._b, allow3Char);
          },
          toHexString: function (allow3Char) {
            return '#' + this.toHex(allow3Char);
          },
          toHex8: function () {
            return rgbaToHex(this._r, this._g, this._b, this._a);
          },
          toHex8String: function () {
            return '#' + this.toHex8();
          },
          toRgb: function () {
            return {
              r: mathRound(this._r),
              g: mathRound(this._g),
              b: mathRound(this._b),
              a: this._a
            };
          },
          toRgbString: function () {
            return this._a == 1 ? "rgb(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ")" : "rgba(" + mathRound(this._r) + ", " + mathRound(this._g) + ", " + mathRound(this._b) + ", " + this._roundA + ")";
          },
          toPercentageRgb: function () {
            return {
              r: mathRound(bound01(this._r, 255) * 100) + "%",
              g: mathRound(bound01(this._g, 255) * 100) + "%",
              b: mathRound(bound01(this._b, 255) * 100) + "%",
              a: this._a
            };
          },
          toPercentageRgbString: function () {
            return this._a == 1 ? "rgb(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%)" : "rgba(" + mathRound(bound01(this._r, 255) * 100) + "%, " + mathRound(bound01(this._g, 255) * 100) + "%, " + mathRound(bound01(this._b, 255) * 100) + "%, " + this._roundA + ")";
          },
          toName: function () {
            if (this._a === 0) {
              return "transparent";
            }
            if (this._a < 1) {
              return false;
            }
            return hexNames[rgbToHex(this._r, this._g, this._b, true)] || false;
          },
          toFilter: function (secondColor) {
            var hex8String = '#' + rgbaToHex(this._r, this._g, this._b, this._a);
            var secondHex8String = hex8String;
            var gradientType = this._gradientType ? "GradientType = 1, " : "";
            if (secondColor) {
              var s = tinycolor(secondColor);
              secondHex8String = s.toHex8String();
            }
            return "progid:DXImageTransform.Microsoft.gradient(" + gradientType + "startColorstr=" + hex8String + ",endColorstr=" + secondHex8String + ")";
          },
          toString: function (format) {
            var formatSet = !!format;
            format = format || this._format;
            var formattedString = false;
            var hasAlpha = this._a < 1 && this._a >= 0;
            var needsAlphaFormat = !formatSet && hasAlpha && (format === "hex" || format === "hex6" || format === "hex3" || format === "name");
            if (needsAlphaFormat) {
              if (format === "name" && this._a === 0) {
                return this.toName();
              }
              return this.toRgbString();
            }
            if (format === "rgb") {
              formattedString = this.toRgbString();
            }
            if (format === "prgb") {
              formattedString = this.toPercentageRgbString();
            }
            if (format === "hex" || format === "hex6") {
              formattedString = this.toHexString();
            }
            if (format === "hex3") {
              formattedString = this.toHexString(true);
            }
            if (format === "hex8") {
              formattedString = this.toHex8String();
            }
            if (format === "name") {
              formattedString = this.toName();
            }
            if (format === "hsl") {
              formattedString = this.toHslString();
            }
            if (format === "hsv") {
              formattedString = this.toHsvString();
            }
            return formattedString || this.toHexString();
          },
          _applyModification: function (fn, args) {
            var color = fn.apply(null, [this].concat([].slice.call(args)));
            this._r = color._r;
            this._g = color._g;
            this._b = color._b;
            this.setAlpha(color._a);
            return this;
          },
          lighten: function () {
            return this._applyModification(lighten, arguments);
          },
          brighten: function () {
            return this._applyModification(brighten, arguments);
          },
          darken: function () {
            return this._applyModification(darken, arguments);
          },
          desaturate: function () {
            return this._applyModification(desaturate, arguments);
          },
          saturate: function () {
            return this._applyModification(saturate, arguments);
          },
          greyscale: function () {
            return this._applyModification(greyscale, arguments);
          },
          spin: function () {
            return this._applyModification(spin, arguments);
          },
          _applyCombination: function (fn, args) {
            return fn.apply(null, [this].concat([].slice.call(args)));
          },
          analogous: function () {
            return this._applyCombination(analogous, arguments);
          },
          complement: function () {
            return this._applyCombination(complement, arguments);
          },
          monochromatic: function () {
            return this._applyCombination(monochromatic, arguments);
          },
          splitcomplement: function () {
            return this._applyCombination(splitcomplement, arguments);
          },
          triad: function () {
            return this._applyCombination(triad, arguments);
          },
          tetrad: function () {
            return this._applyCombination(tetrad, arguments);
          }
        };
        tinycolor.fromRatio = function (color, opts) {
          if (typeof color == "object") {
            var newColor = {};
            for (var i in color) {
              if (color.hasOwnProperty(i)) {
                if (i === "a") {
                  newColor[i] = color[i];
                } else {
                  newColor[i] = convertToPercentage(color[i]);
                }
              }
            }
            color = newColor;
          }
          return tinycolor(color, opts);
        };
        function inputToRGB(color) {
          var rgb = {
            r: 0,
            g: 0,
            b: 0
          };
          var a = 1;
          var ok = false;
          var format = false;
          if (typeof color == "string") {
            color = stringInputToObject(color);
          }
          if (typeof color == "object") {
            if (color.hasOwnProperty("r") && color.hasOwnProperty("g") && color.hasOwnProperty("b")) {
              rgb = rgbToRgb(color.r, color.g, color.b);
              ok = true;
              format = String(color.r).substr(-1) === "%" ? "prgb" : "rgb";
            } else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("v")) {
              color.s = convertToPercentage(color.s);
              color.v = convertToPercentage(color.v);
              rgb = hsvToRgb(color.h, color.s, color.v);
              ok = true;
              format = "hsv";
            } else if (color.hasOwnProperty("h") && color.hasOwnProperty("s") && color.hasOwnProperty("l")) {
              color.s = convertToPercentage(color.s);
              color.l = convertToPercentage(color.l);
              rgb = hslToRgb(color.h, color.s, color.l);
              ok = true;
              format = "hsl";
            }
            if (color.hasOwnProperty("a")) {
              a = color.a;
            }
          }
          a = boundAlpha(a);
          return {
            ok: ok,
            format: color.format || format,
            r: mathMin(255, mathMax(rgb.r, 0)),
            g: mathMin(255, mathMax(rgb.g, 0)),
            b: mathMin(255, mathMax(rgb.b, 0)),
            a: a
          };
        }
        function rgbToRgb(r, g, b) {
          return {
            r: bound01(r, 255) * 255,
            g: bound01(g, 255) * 255,
            b: bound01(b, 255) * 255
          };
        }
        function rgbToHsl(r, g, b) {
          r = bound01(r, 255);
          g = bound01(g, 255);
          b = bound01(b, 255);
          var max = mathMax(r, g, b),
              min = mathMin(r, g, b);
          var h,
              s,
              l = (max + min) / 2;
          if (max == min) {
            h = s = 0;
          } else {
            var d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
              case g:
                h = (b - r) / d + 2;
                break;
              case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
          }
          return {
            h: h,
            s: s,
            l: l
          };
        }
        function hslToRgb(h, s, l) {
          var r, g, b;
          h = bound01(h, 360);
          s = bound01(s, 100);
          l = bound01(l, 100);
          function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
          }
          if (s === 0) {
            r = g = b = l;
          } else {
            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            var p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
          }
          return {
            r: r * 255,
            g: g * 255,
            b: b * 255
          };
        }
        function rgbToHsv(r, g, b) {
          r = bound01(r, 255);
          g = bound01(g, 255);
          b = bound01(b, 255);
          var max = mathMax(r, g, b),
              min = mathMin(r, g, b);
          var h,
              s,
              v = max;
          var d = max - min;
          s = max === 0 ? 0 : d / max;
          if (max == min) {
            h = 0;
          } else {
            switch (max) {
              case r:
                h = (g - b) / d + (g < b ? 6 : 0);
                break;
              case g:
                h = (b - r) / d + 2;
                break;
              case b:
                h = (r - g) / d + 4;
                break;
            }
            h /= 6;
          }
          return {
            h: h,
            s: s,
            v: v
          };
        }
        function hsvToRgb(h, s, v) {
          h = bound01(h, 360) * 6;
          s = bound01(s, 100);
          v = bound01(v, 100);
          var i = math.floor(h),
              f = h - i,
              p = v * (1 - s),
              q = v * (1 - f * s),
              t = v * (1 - (1 - f) * s),
              mod = i % 6,
              r = [v, q, p, p, t, v][mod],
              g = [t, v, v, q, p, p][mod],
              b = [p, p, t, v, v, q][mod];
          return {
            r: r * 255,
            g: g * 255,
            b: b * 255
          };
        }
        function rgbToHex(r, g, b, allow3Char) {
          var hex = [pad2(mathRound(r).toString(16)), pad2(mathRound(g).toString(16)), pad2(mathRound(b).toString(16))];
          if (allow3Char && hex[0].charAt(0) == hex[0].charAt(1) && hex[1].charAt(0) == hex[1].charAt(1) && hex[2].charAt(0) == hex[2].charAt(1)) {
            return hex[0].charAt(0) + hex[1].charAt(0) + hex[2].charAt(0);
          }
          return hex.join("");
        }
        function rgbaToHex(r, g, b, a) {
          var hex = [pad2(convertDecimalToHex(a)), pad2(mathRound(r).toString(16)), pad2(mathRound(g).toString(16)), pad2(mathRound(b).toString(16))];
          return hex.join("");
        }
        tinycolor.equals = function (color1, color2) {
          if (!color1 || !color2) {
            return false;
          }
          return tinycolor(color1).toRgbString() == tinycolor(color2).toRgbString();
        };
        tinycolor.random = function () {
          return tinycolor.fromRatio({
            r: mathRandom(),
            g: mathRandom(),
            b: mathRandom()
          });
        };
        function desaturate(color, amount) {
          amount = amount === 0 ? 0 : amount || 10;
          var hsl = tinycolor(color).toHsl();
          hsl.s -= amount / 100;
          hsl.s = clamp01(hsl.s);
          return tinycolor(hsl);
        }
        function saturate(color, amount) {
          amount = amount === 0 ? 0 : amount || 10;
          var hsl = tinycolor(color).toHsl();
          hsl.s += amount / 100;
          hsl.s = clamp01(hsl.s);
          return tinycolor(hsl);
        }
        function greyscale(color) {
          return tinycolor(color).desaturate(100);
        }
        function lighten(color, amount) {
          amount = amount === 0 ? 0 : amount || 10;
          var hsl = tinycolor(color).toHsl();
          hsl.l += amount / 100;
          hsl.l = clamp01(hsl.l);
          return tinycolor(hsl);
        }
        function brighten(color, amount) {
          amount = amount === 0 ? 0 : amount || 10;
          var rgb = tinycolor(color).toRgb();
          rgb.r = mathMax(0, mathMin(255, rgb.r - mathRound(255 * -(amount / 100))));
          rgb.g = mathMax(0, mathMin(255, rgb.g - mathRound(255 * -(amount / 100))));
          rgb.b = mathMax(0, mathMin(255, rgb.b - mathRound(255 * -(amount / 100))));
          return tinycolor(rgb);
        }
        function darken(color, amount) {
          amount = amount === 0 ? 0 : amount || 10;
          var hsl = tinycolor(color).toHsl();
          hsl.l -= amount / 100;
          hsl.l = clamp01(hsl.l);
          return tinycolor(hsl);
        }
        function spin(color, amount) {
          var hsl = tinycolor(color).toHsl();
          var hue = (mathRound(hsl.h) + amount) % 360;
          hsl.h = hue < 0 ? 360 + hue : hue;
          return tinycolor(hsl);
        }
        function complement(color) {
          var hsl = tinycolor(color).toHsl();
          hsl.h = (hsl.h + 180) % 360;
          return tinycolor(hsl);
        }
        function triad(color) {
          var hsl = tinycolor(color).toHsl();
          var h = hsl.h;
          return [tinycolor(color), tinycolor({
            h: (h + 120) % 360,
            s: hsl.s,
            l: hsl.l
          }), tinycolor({
            h: (h + 240) % 360,
            s: hsl.s,
            l: hsl.l
          })];
        }
        function tetrad(color) {
          var hsl = tinycolor(color).toHsl();
          var h = hsl.h;
          return [tinycolor(color), tinycolor({
            h: (h + 90) % 360,
            s: hsl.s,
            l: hsl.l
          }), tinycolor({
            h: (h + 180) % 360,
            s: hsl.s,
            l: hsl.l
          }), tinycolor({
            h: (h + 270) % 360,
            s: hsl.s,
            l: hsl.l
          })];
        }
        function splitcomplement(color) {
          var hsl = tinycolor(color).toHsl();
          var h = hsl.h;
          return [tinycolor(color), tinycolor({
            h: (h + 72) % 360,
            s: hsl.s,
            l: hsl.l
          }), tinycolor({
            h: (h + 216) % 360,
            s: hsl.s,
            l: hsl.l
          })];
        }
        function analogous(color, results, slices) {
          results = results || 6;
          slices = slices || 30;
          var hsl = tinycolor(color).toHsl();
          var part = 360 / slices;
          var ret = [tinycolor(color)];
          for (hsl.h = (hsl.h - (part * results >> 1) + 720) % 360; --results;) {
            hsl.h = (hsl.h + part) % 360;
            ret.push(tinycolor(hsl));
          }
          return ret;
        }
        function monochromatic(color, results) {
          results = results || 6;
          var hsv = tinycolor(color).toHsv();
          var h = hsv.h,
              s = hsv.s,
              v = hsv.v;
          var ret = [];
          var modification = 1 / results;
          while (results--) {
            ret.push(tinycolor({
              h: h,
              s: s,
              v: v
            }));
            v = (v + modification) % 1;
          }
          return ret;
        }
        tinycolor.mix = function (color1, color2, amount) {
          amount = amount === 0 ? 0 : amount || 50;
          var rgb1 = tinycolor(color1).toRgb();
          var rgb2 = tinycolor(color2).toRgb();
          var p = amount / 100;
          var w = p * 2 - 1;
          var a = rgb2.a - rgb1.a;
          var w1;
          if (w * a == -1) {
            w1 = w;
          } else {
            w1 = (w + a) / (1 + w * a);
          }
          w1 = (w1 + 1) / 2;
          var w2 = 1 - w1;
          var rgba = {
            r: rgb2.r * w1 + rgb1.r * w2,
            g: rgb2.g * w1 + rgb1.g * w2,
            b: rgb2.b * w1 + rgb1.b * w2,
            a: rgb2.a * p + rgb1.a * (1 - p)
          };
          return tinycolor(rgba);
        };
        tinycolor.readability = function (color1, color2) {
          var c1 = tinycolor(color1);
          var c2 = tinycolor(color2);
          var rgb1 = c1.toRgb();
          var rgb2 = c2.toRgb();
          var brightnessA = c1.getBrightness();
          var brightnessB = c2.getBrightness();
          var colorDiff = Math.max(rgb1.r, rgb2.r) - Math.min(rgb1.r, rgb2.r) + Math.max(rgb1.g, rgb2.g) - Math.min(rgb1.g, rgb2.g) + Math.max(rgb1.b, rgb2.b) - Math.min(rgb1.b, rgb2.b);
          return {
            brightness: Math.abs(brightnessA - brightnessB),
            color: colorDiff
          };
        };
        tinycolor.isReadable = function (color1, color2) {
          var readability = tinycolor.readability(color1, color2);
          return readability.brightness > 125 && readability.color > 500;
        };
        tinycolor.mostReadable = function (baseColor, colorList) {
          var bestColor = null;
          var bestScore = 0;
          var bestIsReadable = false;
          for (var i = 0; i < colorList.length; i++) {
            var readability = tinycolor.readability(baseColor, colorList[i]);
            var readable = readability.brightness > 125 && readability.color > 500;
            var score = 3 * (readability.brightness / 125) + readability.color / 500;
            if (readable && !bestIsReadable || readable && bestIsReadable && score > bestScore || !readable && !bestIsReadable && score > bestScore) {
              bestIsReadable = readable;
              bestScore = score;
              bestColor = tinycolor(colorList[i]);
            }
          }
          return bestColor;
        };
        var names = tinycolor.names = {
          aliceblue: "f0f8ff",
          antiquewhite: "faebd7",
          aqua: "0ff",
          aquamarine: "7fffd4",
          azure: "f0ffff",
          beige: "f5f5dc",
          bisque: "ffe4c4",
          black: "000",
          blanchedalmond: "ffebcd",
          blue: "00f",
          blueviolet: "8a2be2",
          brown: "a52a2a",
          burlywood: "deb887",
          burntsienna: "ea7e5d",
          cadetblue: "5f9ea0",
          chartreuse: "7fff00",
          chocolate: "d2691e",
          coral: "ff7f50",
          cornflowerblue: "6495ed",
          cornsilk: "fff8dc",
          crimson: "dc143c",
          cyan: "0ff",
          darkblue: "00008b",
          darkcyan: "008b8b",
          darkgoldenrod: "b8860b",
          darkgray: "a9a9a9",
          darkgreen: "006400",
          darkgrey: "a9a9a9",
          darkkhaki: "bdb76b",
          darkmagenta: "8b008b",
          darkolivegreen: "556b2f",
          darkorange: "ff8c00",
          darkorchid: "9932cc",
          darkred: "8b0000",
          darksalmon: "e9967a",
          darkseagreen: "8fbc8f",
          darkslateblue: "483d8b",
          darkslategray: "2f4f4f",
          darkslategrey: "2f4f4f",
          darkturquoise: "00ced1",
          darkviolet: "9400d3",
          deeppink: "ff1493",
          deepskyblue: "00bfff",
          dimgray: "696969",
          dimgrey: "696969",
          dodgerblue: "1e90ff",
          firebrick: "b22222",
          floralwhite: "fffaf0",
          forestgreen: "228b22",
          fuchsia: "f0f",
          gainsboro: "dcdcdc",
          ghostwhite: "f8f8ff",
          gold: "ffd700",
          goldenrod: "daa520",
          gray: "808080",
          green: "008000",
          greenyellow: "adff2f",
          grey: "808080",
          honeydew: "f0fff0",
          hotpink: "ff69b4",
          indianred: "cd5c5c",
          indigo: "4b0082",
          ivory: "fffff0",
          khaki: "f0e68c",
          lavender: "e6e6fa",
          lavenderblush: "fff0f5",
          lawngreen: "7cfc00",
          lemonchiffon: "fffacd",
          lightblue: "add8e6",
          lightcoral: "f08080",
          lightcyan: "e0ffff",
          lightgoldenrodyellow: "fafad2",
          lightgray: "d3d3d3",
          lightgreen: "90ee90",
          lightgrey: "d3d3d3",
          lightpink: "ffb6c1",
          lightsalmon: "ffa07a",
          lightseagreen: "20b2aa",
          lightskyblue: "87cefa",
          lightslategray: "789",
          lightslategrey: "789",
          lightsteelblue: "b0c4de",
          lightyellow: "ffffe0",
          lime: "0f0",
          limegreen: "32cd32",
          linen: "faf0e6",
          magenta: "f0f",
          maroon: "800000",
          mediumaquamarine: "66cdaa",
          mediumblue: "0000cd",
          mediumorchid: "ba55d3",
          mediumpurple: "9370db",
          mediumseagreen: "3cb371",
          mediumslateblue: "7b68ee",
          mediumspringgreen: "00fa9a",
          mediumturquoise: "48d1cc",
          mediumvioletred: "c71585",
          midnightblue: "191970",
          mintcream: "f5fffa",
          mistyrose: "ffe4e1",
          moccasin: "ffe4b5",
          navajowhite: "ffdead",
          navy: "000080",
          oldlace: "fdf5e6",
          olive: "808000",
          olivedrab: "6b8e23",
          orange: "ffa500",
          orangered: "ff4500",
          orchid: "da70d6",
          palegoldenrod: "eee8aa",
          palegreen: "98fb98",
          paleturquoise: "afeeee",
          palevioletred: "db7093",
          papayawhip: "ffefd5",
          peachpuff: "ffdab9",
          peru: "cd853f",
          pink: "ffc0cb",
          plum: "dda0dd",
          powderblue: "b0e0e6",
          purple: "800080",
          rebeccapurple: "663399",
          red: "f00",
          rosybrown: "bc8f8f",
          royalblue: "4169e1",
          saddlebrown: "8b4513",
          salmon: "fa8072",
          sandybrown: "f4a460",
          seagreen: "2e8b57",
          seashell: "fff5ee",
          sienna: "a0522d",
          silver: "c0c0c0",
          skyblue: "87ceeb",
          slateblue: "6a5acd",
          slategray: "708090",
          slategrey: "708090",
          snow: "fffafa",
          springgreen: "00ff7f",
          steelblue: "4682b4",
          tan: "d2b48c",
          teal: "008080",
          thistle: "d8bfd8",
          tomato: "ff6347",
          turquoise: "40e0d0",
          violet: "ee82ee",
          wheat: "f5deb3",
          white: "fff",
          whitesmoke: "f5f5f5",
          yellow: "ff0",
          yellowgreen: "9acd32"
        };
        var hexNames = tinycolor.hexNames = flip(names);
        function flip(o) {
          var flipped = {};
          for (var i in o) {
            if (o.hasOwnProperty(i)) {
              flipped[o[i]] = i;
            }
          }
          return flipped;
        }
        function boundAlpha(a) {
          a = parseFloat(a);
          if (isNaN(a) || a < 0 || a > 1) {
            a = 1;
          }
          return a;
        }
        function bound01(n, max) {
          if (isOnePointZero(n)) {
            n = "100%";
          }
          var processPercent = isPercentage(n);
          n = mathMin(max, mathMax(0, parseFloat(n)));
          if (processPercent) {
            n = parseInt(n * max, 10) / 100;
          }
          if (math.abs(n - max) < 0.000001) {
            return 1;
          }
          return n % max / parseFloat(max);
        }
        function clamp01(val) {
          return mathMin(1, mathMax(0, val));
        }
        function parseIntFromHex(val) {
          return parseInt(val, 16);
        }
        function isOnePointZero(n) {
          return typeof n == "string" && n.indexOf('.') != -1 && parseFloat(n) === 1;
        }
        function isPercentage(n) {
          return typeof n === "string" && n.indexOf('%') != -1;
        }
        function pad2(c) {
          return c.length == 1 ? '0' + c : '' + c;
        }
        function convertToPercentage(n) {
          if (n <= 1) {
            n = n * 100 + "%";
          }
          return n;
        }
        function convertDecimalToHex(d) {
          return Math.round(parseFloat(d) * 255).toString(16);
        }
        function convertHexToDecimal(h) {
          return parseIntFromHex(h) / 255;
        }
        var matchers = function () {
          var CSS_INTEGER = "[-\\+]?\\d+%?";
          var CSS_NUMBER = "[-\\+]?\\d*\\.\\d+%?";
          var CSS_UNIT = "(?:" + CSS_NUMBER + ")|(?:" + CSS_INTEGER + ")";
          var PERMISSIVE_MATCH3 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
          var PERMISSIVE_MATCH4 = "[\\s|\\(]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")[,|\\s]+(" + CSS_UNIT + ")\\s*\\)?";
          return {
            rgb: new RegExp("rgb" + PERMISSIVE_MATCH3),
            rgba: new RegExp("rgba" + PERMISSIVE_MATCH4),
            hsl: new RegExp("hsl" + PERMISSIVE_MATCH3),
            hsla: new RegExp("hsla" + PERMISSIVE_MATCH4),
            hsv: new RegExp("hsv" + PERMISSIVE_MATCH3),
            hsva: new RegExp("hsva" + PERMISSIVE_MATCH4),
            hex3: /^([0-9a-fA-F]{1})([0-9a-fA-F]{1})([0-9a-fA-F]{1})$/,
            hex6: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/,
            hex8: /^([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/
          };
        }();
        function stringInputToObject(color) {
          color = color.replace(trimLeft, '').replace(trimRight, '').toLowerCase();
          var named = false;
          if (names[color]) {
            color = names[color];
            named = true;
          } else if (color == 'transparent') {
            return {
              r: 0,
              g: 0,
              b: 0,
              a: 0,
              format: "name"
            };
          }
          var match;
          if (match = matchers.rgb.exec(color)) {
            return {
              r: match[1],
              g: match[2],
              b: match[3]
            };
          }
          if (match = matchers.rgba.exec(color)) {
            return {
              r: match[1],
              g: match[2],
              b: match[3],
              a: match[4]
            };
          }
          if (match = matchers.hsl.exec(color)) {
            return {
              h: match[1],
              s: match[2],
              l: match[3]
            };
          }
          if (match = matchers.hsla.exec(color)) {
            return {
              h: match[1],
              s: match[2],
              l: match[3],
              a: match[4]
            };
          }
          if (match = matchers.hsv.exec(color)) {
            return {
              h: match[1],
              s: match[2],
              v: match[3]
            };
          }
          if (match = matchers.hsva.exec(color)) {
            return {
              h: match[1],
              s: match[2],
              v: match[3],
              a: match[4]
            };
          }
          if (match = matchers.hex8.exec(color)) {
            return {
              a: convertHexToDecimal(match[1]),
              r: parseIntFromHex(match[2]),
              g: parseIntFromHex(match[3]),
              b: parseIntFromHex(match[4]),
              format: named ? "name" : "hex8"
            };
          }
          if (match = matchers.hex6.exec(color)) {
            return {
              r: parseIntFromHex(match[1]),
              g: parseIntFromHex(match[2]),
              b: parseIntFromHex(match[3]),
              format: named ? "name" : "hex"
            };
          }
          if (match = matchers.hex3.exec(color)) {
            return {
              r: parseIntFromHex(match[1] + '' + match[1]),
              g: parseIntFromHex(match[2] + '' + match[2]),
              b: parseIntFromHex(match[3] + '' + match[3]),
              format: named ? "name" : "hex"
            };
          }
          return false;
        }
        window.tinycolor = tinycolor;
      })();
      $(function () {
        if ($.fn.spectrum.load) {
          $.fn.spectrum.processNativeColorInputs();
        }
      });
    });
  })($__require("c6"));
  return module.exports;
});
$__System.registerDynamic("136", ["135"], true, function ($__require, exports, module) {
  var define,
      global = this || self,
      GLOBAL = global;
  module.exports = $__require("135");
  return module.exports;
});
$__System.register('137', [], function (_export) {
  /*!
   * modernizr v3.3.1
   * Build https://modernizr.com/download?-touchevents-setclasses-dontmin
   *
   * Copyright (c)
   *  Faruk Ates
   *  Paul Irish
   *  Alex Sexton
   *  Ryan Seddon
   *  Patrick Kettner
   *  Stu Cox
   *  Richard Herrera
  
   * MIT License
   */

  /*
   * Modernizr tests which native CSS3 and HTML5 features are available in the
   * current UA and makes the results available to you in two ways: as properties on
   * a global `Modernizr` object, and as classes on the `<html>` element. This
   * information allows you to progressively enhance your pages with a granular level
   * of control over the experience.
  */

  'use strict';

  return {
    setters: [],
    execute: function () {
      ;(function (window, document, undefined) {
        var classes = [];

        var tests = [];

        /**
         *
         * ModernizrProto is the constructor for Modernizr
         *
         * @class
         * @access public
         */

        var ModernizrProto = {
          // The current version, dummy
          _version: '3.3.1',

          // Any settings that don't work as separate modules
          // can go in here as configuration.
          _config: {
            'classPrefix': '',
            'enableClasses': true,
            'enableJSClass': true,
            'usePrefixes': true
          },

          // Queue of tests
          _q: [],

          // Stub these for people who are listening
          on: function on(test, cb) {
            // I don't really think people should do this, but we can
            // safe guard it a bit.
            // -- NOTE:: this gets WAY overridden in src/addTest for actual async tests.
            // This is in case people listen to synchronous tests. I would leave it out,
            // but the code to *disallow* sync tests in the real version of this
            // function is actually larger than this.
            var self = this;
            setTimeout(function () {
              cb(self[test]);
            }, 0);
          },

          addTest: function addTest(name, fn, options) {
            tests.push({ name: name, fn: fn, options: options });
          },

          addAsyncTest: function addAsyncTest(fn) {
            tests.push({ name: null, fn: fn });
          }
        };

        // Fake some of Object.create so we can force non test results to be non "own" properties.
        var Modernizr = function Modernizr() {};
        Modernizr.prototype = ModernizrProto;

        // Leak modernizr globally when you `require` it rather than force it here.
        // Overwrite name so constructor name is nicer :D
        Modernizr = new Modernizr();

        /**
         * is returns a boolean if the typeof an obj is exactly type.
         *
         * @access private
         * @function is
         * @param {*} obj - A thing we want to check the type of
         * @param {string} type - A string to compare the typeof against
         * @returns {boolean}
         */

        function is(obj, type) {
          return typeof obj === type;
        }
        ;

        /**
         * Run through all tests and detect their support in the current UA.
         *
         * @access private
         */

        function testRunner() {
          var featureNames;
          var feature;
          var aliasIdx;
          var result;
          var nameIdx;
          var featureName;
          var featureNameSplit;

          for (var featureIdx in tests) {
            if (tests.hasOwnProperty(featureIdx)) {
              featureNames = [];
              feature = tests[featureIdx];
              // run the test, throw the return value into the Modernizr,
              // then based on that boolean, define an appropriate className
              // and push it into an array of classes we'll join later.
              //
              // If there is no name, it's an 'async' test that is run,
              // but not directly added to the object. That should
              // be done with a post-run addTest call.
              if (feature.name) {
                featureNames.push(feature.name.toLowerCase());

                if (feature.options && feature.options.aliases && feature.options.aliases.length) {
                  // Add all the aliases into the names list
                  for (aliasIdx = 0; aliasIdx < feature.options.aliases.length; aliasIdx++) {
                    featureNames.push(feature.options.aliases[aliasIdx].toLowerCase());
                  }
                }
              }

              // Run the test, or use the raw value if it's not a function
              result = is(feature.fn, 'function') ? feature.fn() : feature.fn;

              // Set each of the names on the Modernizr object
              for (nameIdx = 0; nameIdx < featureNames.length; nameIdx++) {
                featureName = featureNames[nameIdx];
                // Support dot properties as sub tests. We don't do checking to make sure
                // that the implied parent tests have been added. You must call them in
                // order (either in the test, or make the parent test a dependency).
                //
                // Cap it to TWO to make the logic simple and because who needs that kind of subtesting
                // hashtag famous last words
                featureNameSplit = featureName.split('.');

                if (featureNameSplit.length === 1) {
                  Modernizr[featureNameSplit[0]] = result;
                } else {
                  // cast to a Boolean, if not one already
                  /* jshint -W053 */
                  if (Modernizr[featureNameSplit[0]] && !(Modernizr[featureNameSplit[0]] instanceof Boolean)) {
                    Modernizr[featureNameSplit[0]] = new Boolean(Modernizr[featureNameSplit[0]]);
                  }

                  Modernizr[featureNameSplit[0]][featureNameSplit[1]] = result;
                }

                classes.push((result ? '' : 'no-') + featureNameSplit.join('-'));
              }
            }
          }
        }
        ;

        /**
         * docElement is a convenience wrapper to grab the root element of the document
         *
         * @access private
         * @returns {HTMLElement|SVGElement} The root element of the document
         */

        var docElement = document.documentElement;

        /**
         * A convenience helper to check if the document we are running in is an SVG document
         *
         * @access private
         * @returns {boolean}
         */

        var isSVG = docElement.nodeName.toLowerCase() === 'svg';

        /**
         * setClasses takes an array of class names and adds them to the root element
         *
         * @access private
         * @function setClasses
         * @param {string[]} classes - Array of class names
         */

        // Pass in an and array of class names, e.g.:
        //  ['no-webp', 'borderradius', ...]
        function setClasses(classes) {
          var className = docElement.className;
          var classPrefix = Modernizr._config.classPrefix || '';

          if (isSVG) {
            className = className.baseVal;
          }

          // Change `no-js` to `js` (independently of the `enableClasses` option)
          // Handle classPrefix on this too
          if (Modernizr._config.enableJSClass) {
            var reJS = new RegExp('(^|\\s)' + classPrefix + 'no-js(\\s|$)');
            className = className.replace(reJS, '$1' + classPrefix + 'js$2');
          }

          if (Modernizr._config.enableClasses) {
            // Add the new classes
            className += ' ' + classPrefix + classes.join(' ' + classPrefix);
            isSVG ? docElement.className.baseVal = className : docElement.className = className;
          }
        }

        ;

        /**
         * List of property values to set for css tests. See ticket #21
         * http://git.io/vUGl4
         *
         * @memberof Modernizr
         * @name Modernizr._prefixes
         * @optionName Modernizr._prefixes
         * @optionProp prefixes
         * @access public
         * @example
         *
         * Modernizr._prefixes is the internal list of prefixes that we test against
         * inside of things like [prefixed](#modernizr-prefixed) and [prefixedCSS](#-code-modernizr-prefixedcss). It is simply
         * an array of kebab-case vendor prefixes you can use within your code.
         *
         * Some common use cases include
         *
         * Generating all possible prefixed version of a CSS property
         * ```js
         * var rule = Modernizr._prefixes.join('transform: rotate(20deg); ');
         *
         * rule === 'transform: rotate(20deg); webkit-transform: rotate(20deg); moz-transform: rotate(20deg); o-transform: rotate(20deg); ms-transform: rotate(20deg);'
         * ```
         *
         * Generating all possible prefixed version of a CSS value
         * ```js
         * rule = 'display:' +  Modernizr._prefixes.join('flex; display:') + 'flex';
         *
         * rule === 'display:flex; display:-webkit-flex; display:-moz-flex; display:-o-flex; display:-ms-flex; display:flex'
         * ```
         */

        // we use ['',''] rather than an empty array in order to allow a pattern of .`join()`ing prefixes to test
        // values in feature detects to continue to work
        var prefixes = ModernizrProto._config.usePrefixes ? ' -webkit- -moz- -o- -ms- '.split(' ') : ['', ''];

        // expose these for the plugin API. Look in the source for how to join() them against your input
        ModernizrProto._prefixes = prefixes;

        /**
         * createElement is a convenience wrapper around document.createElement. Since we
         * use createElement all over the place, this allows for (slightly) smaller code
         * as well as abstracting away issues with creating elements in contexts other than
         * HTML documents (e.g. SVG documents).
         *
         * @access private
         * @function createElement
         * @returns {HTMLElement|SVGElement} An HTML or SVG element
         */

        function createElement() {
          if (typeof document.createElement !== 'function') {
            // This is the case in IE7, where the type of createElement is "object".
            // For this reason, we cannot call apply() as Object is not a Function.
            return document.createElement(arguments[0]);
          } else if (isSVG) {
            return document.createElementNS.call(document, 'http://www.w3.org/2000/svg', arguments[0]);
          } else {
            return document.createElement.apply(document, arguments);
          }
        }

        ;

        /**
         * getBody returns the body of a document, or an element that can stand in for
         * the body if a real body does not exist
         *
         * @access private
         * @function getBody
         * @returns {HTMLElement|SVGElement} Returns the real body of a document, or an
         * artificially created element that stands in for the body
         */

        function getBody() {
          // After page load injecting a fake body doesn't work so check if body exists
          var body = document.body;

          if (!body) {
            // Can't use the real body create a fake one.
            body = createElement(isSVG ? 'svg' : 'body');
            body.fake = true;
          }

          return body;
        }

        ;

        /**
         * injectElementWithStyles injects an element with style element and some CSS rules
         *
         * @access private
         * @function injectElementWithStyles
         * @param {string} rule - String representing a css rule
         * @param {function} callback - A function that is used to test the injected element
         * @param {number} [nodes] - An integer representing the number of additional nodes you want injected
         * @param {string[]} [testnames] - An array of strings that are used as ids for the additional nodes
         * @returns {boolean}
         */

        function injectElementWithStyles(rule, callback, nodes, testnames) {
          var mod = 'modernizr';
          var style;
          var ret;
          var node;
          var docOverflow;
          var div = createElement('div');
          var body = getBody();

          if (parseInt(nodes, 10)) {
            // In order not to give false positives we create a node for each test
            // This also allows the method to scale for unspecified uses
            while (nodes--) {
              node = createElement('div');
              node.id = testnames ? testnames[nodes] : mod + (nodes + 1);
              div.appendChild(node);
            }
          }

          style = createElement('style');
          style.type = 'text/css';
          style.id = 's' + mod;

          // IE6 will false positive on some tests due to the style element inside the test div somehow interfering offsetHeight, so insert it into body or fakebody.
          // Opera will act all quirky when injecting elements in documentElement when page is served as xml, needs fakebody too. #270
          (!body.fake ? div : body).appendChild(style);
          body.appendChild(div);

          if (style.styleSheet) {
            style.styleSheet.cssText = rule;
          } else {
            style.appendChild(document.createTextNode(rule));
          }
          div.id = mod;

          if (body.fake) {
            //avoid crashing IE8, if background image is used
            body.style.background = '';
            //Safari 5.13/5.1.4 OSX stops loading if ::-webkit-scrollbar is used and scrollbars are visible
            body.style.overflow = 'hidden';
            docOverflow = docElement.style.overflow;
            docElement.style.overflow = 'hidden';
            docElement.appendChild(body);
          }

          ret = callback(div, rule);
          // If this is done after page load we don't want to remove the body so check if body exists
          if (body.fake) {
            body.parentNode.removeChild(body);
            docElement.style.overflow = docOverflow;
            // Trigger layout so kinetic scrolling isn't disabled in iOS6+
            docElement.offsetHeight;
          } else {
            div.parentNode.removeChild(div);
          }

          return !!ret;
        }

        ;

        /**
         * testStyles injects an element with style element and some CSS rules
         *
         * @memberof Modernizr
         * @name Modernizr.testStyles
         * @optionName Modernizr.testStyles()
         * @optionProp testStyles
         * @access public
         * @function testStyles
         * @param {string} rule - String representing a css rule
         * @param {function} callback - A function that is used to test the injected element
         * @param {number} [nodes] - An integer representing the number of additional nodes you want injected
         * @param {string[]} [testnames] - An array of strings that are used as ids for the additional nodes
         * @returns {boolean}
         * @example
         *
         * `Modernizr.testStyles` takes a CSS rule and injects it onto the current page
         * along with (possibly multiple) DOM elements. This lets you check for features
         * that can not be detected by simply checking the [IDL](https://developer.mozilla.org/en-US/docs/Mozilla/Developer_guide/Interface_development_guide/IDL_interface_rules).
         *
         * ```js
         * Modernizr.testStyles('#modernizr { width: 9px; color: papayawhip; }', function(elem, rule) {
         *   // elem is the first DOM node in the page (by default #modernizr)
         *   // rule is the first argument you supplied - the CSS rule in string form
         *
         *   addTest('widthworks', elem.style.width === '9px')
         * });
         * ```
         *
         * If your test requires multiple nodes, you can include a third argument
         * indicating how many additional div elements to include on the page. The
         * additional nodes are injected as children of the `elem` that is returned as
         * the first argument to the callback.
         *
         * ```js
         * Modernizr.testStyles('#modernizr {width: 1px}; #modernizr2 {width: 2px}', function(elem) {
         *   document.getElementById('modernizr').style.width === '1px'; // true
         *   document.getElementById('modernizr2').style.width === '2px'; // true
         *   elem.firstChild === document.getElementById('modernizr2'); // true
         * }, 1);
         * ```
         *
         * By default, all of the additional elements have an ID of `modernizr[n]`, where
         * `n` is its index (e.g. the first additional, second overall is `#modernizr2`,
         * the second additional is `#modernizr3`, etc.).
         * If you want to have more meaningful IDs for your function, you can provide
         * them as the fourth argument, as an array of strings
         *
         * ```js
         * Modernizr.testStyles('#foo {width: 10px}; #bar {height: 20px}', function(elem) {
         *   elem.firstChild === document.getElementById('foo'); // true
         *   elem.lastChild === document.getElementById('bar'); // true
         * }, 2, ['foo', 'bar']);
         * ```
         *
         */

        var testStyles = ModernizrProto.testStyles = injectElementWithStyles;

        /*!
        {
          "name": "Touch Events",
          "property": "touchevents",
          "caniuse" : "touch",
          "tags": ["media", "attribute"],
          "notes": [{
            "name": "Touch Events spec",
            "href": "https://www.w3.org/TR/2013/WD-touch-events-20130124/"
          }],
          "warnings": [
            "Indicates if the browser supports the Touch Events spec, and does not necessarily reflect a touchscreen device"
          ],
          "knownBugs": [
            "False-positive on some configurations of Nokia N900",
            "False-positive on some BlackBerry 6.0 builds – https://github.com/Modernizr/Modernizr/issues/372#issuecomment-3112695"
          ]
        }
        !*/
        /* DOC
        Indicates if the browser supports the W3C Touch Events API.
        
        This *does not* necessarily reflect a touchscreen device:
        
        * Older touchscreen devices only emulate mouse events
        * Modern IE touch devices implement the Pointer Events API instead: use `Modernizr.pointerevents` to detect support for that
        * Some browsers & OS setups may enable touch APIs when no touchscreen is connected
        * Future browsers may implement other event models for touch interactions
        
        See this article: [You Can't Detect A Touchscreen](http://www.stucox.com/blog/you-cant-detect-a-touchscreen/).
        
        It's recommended to bind both mouse and touch/pointer events simultaneously – see [this HTML5 Rocks tutorial](http://www.html5rocks.com/en/mobile/touchandmouse/).
        
        This test will also return `true` for Firefox 4 Multitouch support.
        */

        // Chrome (desktop) used to lie about its support on this, but that has since been rectified: http://crbug.com/36415
        Modernizr.addTest('touchevents', function () {
          var bool;
          if ('ontouchstart' in window || window.DocumentTouch && document instanceof DocumentTouch) {
            bool = true;
          } else {
            // include the 'heartz' as a way to have a non matching MQ to help terminate the join
            // https://git.io/vznFH
            var query = ['@media (', prefixes.join('touch-enabled),('), 'heartz', ')', '{#modernizr{top:9px;position:absolute}}'].join('');
            testStyles(query, function (node) {
              bool = node.offsetTop === 9;
            });
          }
          return bool;
        });

        // Run each test
        testRunner();

        // Remove the "no-js" class if it exists
        setClasses(classes);

        delete ModernizrProto.addTest;
        delete ModernizrProto.addAsyncTest;

        // Run the things that are supposed to run after the tests
        for (var i = 0; i < Modernizr._q.length; i++) {
          Modernizr._q[i]();
        }

        // Leak Modernizr namespace
        window.Modernizr = Modernizr;

        ;
      })(window, document);

      _export('default', Modernizr);
    }
  };
});
$__System.register('1', ['130', '136', '137', '12b', '12d', '12e'], function (_export) {
  // Polyfill everything so even ES3 browsers work
  'use strict';

  // jQuery and plugins
  var $, session_id, new_squad, creating, needs_update_after_creation, new_entry_to_squad, original_values, save_attempt_index, latest_save_attempt_index, typeahead_freeze, typeahead_active, history_numeric_date, day_history_loaded, entry_history_loaded, subscription_changing;
  // map from numeric date to save index
  function save_entry(textarea_element) {
    if (textarea_element.value.trim() === '') {
      return;
    }
    var id_parts = textarea_element.id.split("_");
    var numeric_date = id_parts[0];
    var entry_id = id_parts[1];
    if (entry_id === "-1") {
      if (creating[numeric_date]) {
        needs_update_after_creation[numeric_date] = true;
        return;
      } else {
        creating[numeric_date] = true;
      }
    }
    var cur_save_attempt_index = save_attempt_index++;
    latest_save_attempt_index[numeric_date] = cur_save_attempt_index;
    var entry = $(textarea_element).closest('div.entry');
    entry.find('span.save-error').hide();
    entry.find('img.entry-loading').show();

    var creation_time = Date.now();
    var payload = {
      'text': textarea_element.value,
      'prev_text': original_values[textarea_element.id],
      'session_id': session_id,
      'timestamp': creation_time,
      'entry_id': entry_id
    };
    if (entry_id === "-1") {
      payload['day'] = numeric_date;
      payload['month'] = month;
      payload['year'] = year;
      payload['squad'] = new_entry_to_squad[numeric_date];
    }
    $.post('save.php', payload).done(function (data) {
      console.log(data);
      if (data.error === 'concurrent_modification') {
        $('div#concurrent-modification-modal-overlay').show();
        return;
      }
      if (latest_save_attempt_index[numeric_date] === cur_save_attempt_index) {
        entry.find('img.entry-loading').hide();
        if (data.success) {
          entry.find('span.save-error').hide();
        } else {
          entry.find('span.save-error').show();
        }
      }
      if (entry_id === "-1" && data.entry_id) {
        var needs_update = needs_update_after_creation[numeric_date];
        var textarea = $("textarea#" + textarea_element.id);
        if (needs_update && textarea.length === 0) {
          delete_entry(data.entry_id);
        } else {
          textarea_element.id = numeric_date + "_" + data.entry_id;
          textarea.closest('div.entry').find('a.delete-entry-button').after("<a href='#' class='entry-history-button'>" + "  <span class='history'>≡</span>" + "  <span class='action-links-text'>History</span>" + "</a>");
        }
        creating[numeric_date] = false;
        needs_update_after_creation[numeric_date] = false;
        creation_times[data.entry_id] = creation_time;
        new_entry_to_squad[numeric_date] = null;
        if (needs_update && $("textarea#" + textarea_element.id).length !== 0) {
          save_entry(textarea_element);
        }
      }
    }).fail(function () {
      if (latest_save_attempt_index[numeric_date] === cur_save_attempt_index) {
        entry.find('img.entry-loading').hide();
        entry.find('span.save-error').show();
      }
    });
  }

  function freeze_typeahead(option_div) {
    typeahead_freeze = true;
    option_div.addClass('squad-nav-frozen-option');
  }
  function unfreeze_typeahead() {
    typeahead_freeze = false;
    $('div.squad-nav-option').removeClass('squad-nav-frozen-option');
    update_typeahead(false);
  }

  function update_typeahead(new_typeahead_active) {
    if (typeahead_freeze || new_typeahead_active == typeahead_active) {
      return;
    }
    typeahead_active = new_typeahead_active;
    if (typeahead_active) {
      $('input#typeahead').focus();
      $('input#typeahead').select();
      $('div.squad-nav-dropdown').show();
      $('span.squad-nav-first-symbol').hide();
      $('span.squad-nav-second-symbol').hide();
    } else {
      $('input#typeahead').blur();
      $('input#typeahead').val(current_nav_name);
      $('div.squad-nav-dropdown').hide();
      $('span.squad-nav-first-symbol').show();
      $('span.squad-nav-second-symbol').show();
    }
  }

  function truncated_squad_name(squad, max_length) {
    var raw_squad_name = squad_names[squad];
    if (raw_squad_name.length <= max_length) {
      return raw_squad_name;
    }
    return raw_squad_name.substring(0, max_length - 1) + "...";
  }
  function handle_new_entry_action(day) {
    var container = day.find('div.entry-container');
    if (squad !== null) {
      create_new_entry(container, squad);
      return;
    }
    var numeric_date = day.attr('id');
    if (new_entry_to_squad[numeric_date]) {
      return;
    }
    day.find('div.pick-squad').show();
  }
  function create_new_entry(container, entry_squad) {
    var numeric_date = container.closest('td.day').attr('id');
    var textarea_id = numeric_date + '_-1';
    if ($('textarea#' + textarea_id).length !== 0) {
      return;
    }
    new_entry_to_squad[numeric_date] = entry_squad;
    var new_entry = $("<div class='entry' />");
    new_entry.css('background-color', '#' + colors[entry_squad]);
    if (color_is_dark[entry_squad]) {
      new_entry.addClass('dark-entry');
    }
    var textarea = $("<textarea rows='1' />");
    textarea.attr('id', textarea_id);
    new_entry.append(textarea);
    new_entry.append("<img" + "  class='entry-loading'" + "  src='" + base_url + "images/ajax-loader.gif'" + "  alt='loading'" + "/>" + "<span class='save-error'>!</span>" + "<div class='action-links'>" + "  <a href='#' class='delete-entry-button'>" + "    <span class='delete'>✖</span>" + "    <span class='action-links-text'>Delete</span>" + "  </a>" + "  <span class='right-action-links action-links-text'>" + "    " + truncated_squad_name(entry_squad, 12) + "  </span>" + "  <div class='clear'></div>" + "</div>");
    container.find('div.entry-container-spacer').before(new_entry);
    $('textarea#' + textarea_id).focus();
    container.scrollTop(container[0].scrollHeight);
    $('textarea').each(function (i) {
      $(this).attr('tabindex', i + 1);
    });
  }

  function delete_entry(textarea_id) {
    var id_parts = textarea_id.split("_");
    if (id_parts[1] !== "-1") {
      $.post('delete_entry.php', {
        'id': id_parts[1],
        'prev_text': original_values[textarea_id],
        'session_id': session_id,
        'timestamp': Date.now()
      }, function (data) {
        console.log(data);
      });
    } else {
      new_entry_to_squad[id_parts[0]] = null;
      if (creating[id_parts[0]]) {
        needs_update_after_creation[id_parts[0]] = true;
      }
    }
    $('textarea#' + textarea_id).closest('div.entry').remove();
  }

  function update_entry_focus(entry) {
    var textarea = entry.find('textarea');
    var action_links = entry.find('div.action-links');
    if (entry.is(':hover') || textarea.is(':focus')) {
      entry.addClass('focused-entry');
      action_links.addClass('focused-action-links');
    } else {
      entry.removeClass('focused-entry');
      action_links.removeClass('focused-action-links');
    }
  }

  // mode = 0: day view
  // mode = 1: entry view
  function update_history_modal_mode(mode, animate) {
    $('div#history-modal-overlay').show();
    if (mode === 0) {
      if (animate) {
        $('div.day-history').animate({
          left: '0'
        }, 500);
        $('div.entry-history').animate({
          left: '100%'
        }, 500);
      } else {
        $('div.day-history').css('left', '0');
        $('div.entry-history').css('left', '100%');
      }
      $('a#all-history-button').css('visibility', 'hidden');
    } else if (mode === 1) {
      if (animate) {
        $('div.day-history').animate({
          left: '-100%'
        }, 500);
        $('div.entry-history').animate({
          left: '0'
        }, 500);
      } else {
        $('div.day-history').css('left', '-100%');
        $('div.entry-history').css('left', '0');
      }
      $('a#all-history-button').css('visibility', 'visible');
    }
  }
  function show_entry_history(id, animate) {
    $('p#history-loading').show();
    $('div.entry-history > ul').empty();
    $('span.history-date').text(pretty_date(history_numeric_date));
    update_history_modal_mode(1, animate);
    $.post('entry_history.php', { 'id': id }, function (data) {
      console.log(data);
      $('p#history-loading').hide();
      var list = $('div.entry-history > ul');
      for (var i in data.result) {
        var revision = data.result[i];
        var next_revision = data.result[parseInt(i) + 1];
        var list_item = $('<li>').appendTo(list);
        if (next_revision !== undefined && revision.deleted !== next_revision.deleted) {
          list_item.append(revision.deleted ? "<div class='entry-history-deleted'>Deleted</div>" : "<div class='entry-history-restored'>Restored</div>");
        } else {
          var entry_div = $("<div class='entry entry-history-entry'>" + revision.text + "</div>").appendTo(list_item);
          entry_div.css('background-color', '#' + colors[revision.squad]);
          if (color_is_dark[revision.squad]) {
            entry_div.addClass('dark-entry');
          }
        }
        var author = revision.author === null ? "Anonymous" : "<span class='entry-username'>" + revision.author + "</span>";
        list_item.append("<span class='entry-author'>updated by " + author + "</span>");
        var date = new Date(revision.last_update);
        var hovertext = $.format.toBrowserTimeZone(date, "ddd, MMMM D, yyyy 'at' h:mm a");
        var time = $("<time class='timeago entry-time' datetime='" + date.toISOString() + "'>" + hovertext + "</time>").appendTo(list_item);
        time.timeago();
        list_item.append("<div class='clear'>");
      }
      entry_history_loaded = id;
    });
  }
  function show_day_history(numeric_date, animate) {
    $('p#history-loading').show();
    $('div.day-history > ul').empty();
    $('span.history-date').text(pretty_date(history_numeric_date));
    update_history_modal_mode(0, animate);
    $.post('day_history.php', {
      'day': numeric_date,
      'month': month,
      'year': year,
      'nav': original_nav
    }, function (data) {
      console.log(data);
      $('p#history-loading').hide();
      var list = $('div.day-history > ul');
      for (var i in data.result) {
        var entry = data.result[i];
        var list_item = $("<li id='history_" + entry.id + "'>").appendTo(list);
        var entry_div = $("<div class='entry entry-history-entry'>" + entry.text + "</div>").appendTo(list_item);
        entry_div.css('background-color', '#' + colors[entry.squad]);
        if (color_is_dark[entry.squad]) {
          entry_div.addClass('dark-entry');
        }
        var creator = entry.creator === null ? "Anonymous" : "<span class='entry-username'>" + entry.creator + "</span>";
        list_item.append("<span class='entry-author'>created by " + creator + "</span>");
        list_item.append("<span class='entry-squad'>" + truncated_squad_name(entry.squad, 20) + "</span>");
        list_item.append("<div class='clear'>");
        var deleted = entry.deleted ? "<span class='deleted-entry'>" + "<span class='deleted-entry-label'>deleted</span>" + "<span class='restore-entry-label'>" + "(<a href='#' class='restore-entry-button'>restore</a>)</span>" + "<img class='restore-loading' src='" + base_url + "images/ajax-loader.gif' alt='loading' /></span>" : "";
        list_item.append(deleted);
        list_item.append("<a href='#' class='revision-history-button'>" + "revision history &gt;</a>");
        list_item.append("<div class='clear'>");
      }
      day_history_loaded = true;
    });
  }
  function pretty_date(numeric_date) {
    var month_and_date = $('h2.upper-center').text().replace(/[<>]/g, '').trim();
    var date = new Date(month_and_date + " " + numeric_date);
    return $.format.date(date, "MMMM D, yyyy");
  }

  return {
    setters: [function (_) {}, function (_2) {}, function (_3) {}, function (_b) {}, function (_d) {
      $ = _d['default'];
    }, function (_e) {}],
    execute: function () {
      session_id = Math.floor(0x80000000 * Math.random()).toString(36);
      new_squad = null;
      creating = {};
      needs_update_after_creation = {};
      new_entry_to_squad = {};

      (function () {
        var today = new Date();
        if (today.getMonth() === month - 1 && today.getFullYear() === year) {
          $('td.day#' + today.getDate()).addClass('current-day');
        }
      })();

      if (show === 'reset_password') {
        $('input#reset-new-password').focus();
      } else {
        // No way to escape the reset password prompt
        $(window).click(function (event) {
          if ($(event.target).hasClass('modal-overlay')) {
            $('div.modal-overlay').hide();
          }
        });
        $('span.modal-close').click(function () {
          $('div.modal-overlay').hide();
        });
        $(document).keyup(function (e) {
          if (e.keyCode == 27) {
            // esc key
            $('div.modal-overlay').hide();
          }
        });
      }

      original_values = {};

      $('textarea').each(function (i, element) {
        original_values[element.id] = element.value;
      });

      $('textarea').each(function () {
        this.setAttribute('style', 'height: ' + this.scrollHeight + 'px');
      });
      $('table').on('input', 'textarea', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
      });

      save_attempt_index = 0;
      latest_save_attempt_index = {};
      $('table').on('input', 'textarea', function (event) {
        save_entry(event.target);
      });
      $('input#refresh-button').click(function () {
        window.location.href = this_url;
      });

      typeahead_freeze = false;
      typeahead_active = false;
      $(window).click(function (event) {
        var ta = typeahead_active;
        var target = $(event.target);
        var option = target.closest('div.squad-nav-option');
        // If the typehead is closed and the target is the typeahead, it opens
        if (!ta && target.closest('div#squad-nav').length > 0) {
          update_typeahead(true);
          // If the typeahead is open and the target is the actual text, do nothing
        } else if (ta && target.closest('input#typeahead').length > 0) {
            // If the typeahead is open and the target is a selection, navigate to it
          } else if (ta && option.length > 0) {
              var next = option.attr('id').split('_')[1];
              if (next == 'new') {
                if (email) {
                  freeze_typeahead(option);
                  $('div#new-squad-modal-overlay').show();
                  $('div#new-squad-modal input:visible').filter(function () {
                    return this.value === "";
                  }).first().focus();
                } else {
                  update_typeahead(false);
                  $('div#login-to-create-squad-modal-overlay').show();
                }
              } else if (next == 'home') {
                window.location.href = month_url + "&home";
              } else if (authorized_squads[next] !== true) {
                freeze_typeahead(option);
                var new_squad_name = option.text();
                $('div#squad-login-name > div.form-content').text(new_squad_name);
                $('div#squad-login-modal-overlay').show();
                $('div#squad-login-modal input:visible').filter(function () {
                  return this.value === "";
                }).first().focus();
              } else {
                window.location.href = month_url + "&squad=" + next;
              }
              // If the typeahead is open, close it
            } else if (ta) {
                update_typeahead(false);
              }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          update_typeahead(false);
        }
      });

      $('div#squad-login-modal span.modal-close').click(function () {
        unfreeze_typeahead();
        $('input#squad-password').val("");
        $('div#squad-login-modal span.modal-form-error').text("");
      });
      $(window).click(function (event) {
        if (event.target.id === 'squad-login-modal-overlay') {
          unfreeze_typeahead();
          $('input#squad-password').val("");
          $('div#squad-login-modal span.modal-form-error').text("");
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          unfreeze_typeahead();
          $('input#squad-password').val("");
          $('div#squad-login-modal span.modal-form-error').text("");
        }
      });
      $('div#squad-login-modal form').submit(function (event) {
        event.preventDefault();
        $('div#squad-login-modal input').prop("disabled", true);
        $.post('auth_squad.php', {
          'squad': new_squad,
          'password': $('input#squad-password').val()
        }, function (data) {
          console.log(data);
          if (data.success === true) {
            window.location.href = month_url + "&squad=" + new_squad;
            return;
          }
          $('input#squad-password').val("");
          $('input#squad-password').focus();
          $('div#squad-login-modal input').prop("disabled", false);
          if (data.error === 'invalid_credentials') {
            $('div#squad-login-modal span.modal-form-error').text("wrong password");
          } else {
            $('div#squad-login-modal span.modal-form-error').text("unknown error");
          }
        });
      });

      $('input#new-squad-color').spectrum({
        'cancelText': "Cancel",
        'chooseText': "Choose",
        'preferredFormat': "hex",
        'color': '#fff8dd'
      });
      $('input#new-squad-closed').click(function () {
        $('div#new-squad-password-container').show();
        $('div#new-squad-confirm-password-container').show();
      });
      $('input#new-squad-open').click(function () {
        $('div#new-squad-password-container').hide();
        $('div#new-squad-confirm-password-container').hide();
      });
      $('div#new-squad-modal span.modal-close').click(function () {
        unfreeze_typeahead();
        $('input#new-squad-password').val("");
        $('input#new-squad-confirm-password').val("");
        $('div#new-squad-modal span.modal-form-error').text("");
      });
      $(window).click(function (event) {
        if (event.target.id === 'new-squad-modal-overlay') {
          unfreeze_typeahead();
          $('input#new-squad-password').val("");
          $('input#new-squad-confirm-password').val("");
          $('div#new-squad-modal span.modal-form-error').text("");
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          unfreeze_typeahead();
          $('input#new-squad-password').val("");
          $('input#new-squad-confirm-password').val("");
          $('div#new-squad-modal span.modal-form-error').text("");
        }
      });
      $('div#new-squad-modal form').submit(function (event) {
        event.preventDefault();
        var name = $('input#new-squad-name').val().trim();
        if (name === '') {
          $('input#new-squad-name').val("");
          $('input#new-squad-name').focus();
          $('div#new-squad-modal span.modal-form-error').text("empty squad name");
          return;
        }
        var type = $('div#new-squad-modal input[name="new-squad-type"]:checked');
        if (type.length === 0) {
          $('input#new-squad-open').focus();
          $('div#new-squad-modal span.modal-form-error').text("squad type unspecified");
          return;
        }
        var password = $('input#new-squad-password').val();
        if (type.val() === 'closed') {
          if (password.trim() === '') {
            $('input#new-squad-password').val("");
            $('input#new-squad-confirm-password').val("");
            $('input#new-squad-password').focus();
            $('div#new-squad-modal span.modal-form-error').text("empty password");
            return;
          }
          var confirm_password = $('input#new-squad-confirm-password').val();
          if (password !== confirm_password) {
            $('input#new-squad-password').val("");
            $('input#new-squad-confirm-password').val("");
            $('input#new-squad-password').focus();
            $('div#new-squad-modal span.modal-form-error').text("passwords don't match");
            return;
          }
        }
        var color = $('input#new-squad-color').spectrum("get").toString().substring(1, 7);
        $('div#new-squad-modal input').prop("disabled", true);
        $.post('new_squad.php', {
          'name': name,
          'type': type.val(),
          'password': password,
          'color': color
        }, function (data) {
          console.log(data);
          if (data.success === true) {
            window.location.href = month_url + "&squad=" + data.new_squad_id;
            return;
          }
          $('div#new-squad-modal input').prop("disabled", false);
          $('input#new-squad-name').val("");
          $('input#new-squad-name').focus();
          if (data.error === 'name_taken') {
            $('div#new-squad-modal span.modal-form-error').text("squad name already taken");
          } else {
            $('input#new-squad-password').val("");
            $('input#new-squad-confirm-password').val("");
            $('div#new-squad-modal input[name="new-squad-type"]').prop('checked', false);
            $('div.new-squad-password').hide();
            $('div#new-squad-modal span.modal-form-error').text("unknown error");
          }
        });
      });

      $('a#log-in-button').click(function () {
        $('div#log-in-modal-overlay').show();
        $('div#log-in-modal input:visible').filter(function () {
          return this.value === "";
        }).first().focus();
      });
      $('div#log-in-modal span.modal-close').click(function () {
        $('input#log-in-password').val("");
        $('div#log-in-modal span.modal-form-error').text("");
      });
      $(window).click(function (event) {
        if (event.target.id === 'log-in-modal-overlay') {
          $('input#log-in-password').val("");
          $('div#log-in-modal span.modal-form-error').text("");
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          $('input#log-in-password').val("");
          $('div#log-in-modal span.modal-form-error').text("");
        }
      });
      $('div#log-in-modal form').submit(function (event) {
        event.preventDefault();
        var username = $('input#log-in-username').val();
        var valid_username_regex = /^[a-zA-Z0-9-_]+$/;
        var valid_email_regex = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source + /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source + /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source);
        if (username.search(valid_username_regex) === -1 && username.search(valid_email_regex) === -1) {
          $('input#log-in-username').val("");
          $('input#log-in-username').focus();
          $('div#log-in-modal span.modal-form-error').text("alphanumeric usernames or emails only");
          return;
        }
        $('div#log-in-modal input').prop("disabled", true);
        $.post('login.php', {
          'username': username,
          'password': $('input#log-in-password').val()
        }, function (data) {
          console.log(data);
          if (data.success === true) {
            window.location.href = this_url;
            return;
          }
          $('div#log-in-modal input').prop("disabled", false);
          if (data.error === 'invalid_parameters') {
            $('input#log-in-username').val("");
            $('input#log-in-username').focus();
            $('div#log-in-modal span.modal-form-error').text("user doesn't exist");
          } else if (data.error === 'invalid_credentials') {
            $('input#log-in-password').val("");
            $('input#log-in-password').focus();
            $('div#log-in-modal span.modal-form-error').text("wrong password");
          } else {
            $('input#log-in-username').val("");
            $('input#log-in-password').val("");
            $('input#log-in-username').val("");
            $('input#log-in-username').focus();
            $('div#log-in-modal span.modal-form-error').text("unknown error");
          }
        });
      });

      $('a#register-button').click(function () {
        $('div#register-modal-overlay').show();
        $('div#register-modal input:visible').filter(function () {
          return this.value === "";
        }).first().focus();
      });
      $('div#register-modal span.modal-close').click(function () {
        $('input#register-password').val("");
        $('input#register-confirm-password').val("");
        $('div#register-modal span.modal-form-error').text("");
      });
      $(window).click(function (event) {
        if (event.target.id === 'register-modal-overlay') {
          $('input#register-password').val("");
          $('input#register-confirm-password').val("");
          $('div#register-modal span.modal-form-error').text("");
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          $('input#register-password').val("");
          $('input#register-confirm-password').val("");
          $('div#register-modal span.modal-form-error').text("");
        }
      });
      $('div#register-modal form').submit(function (event) {
        event.preventDefault();
        var password = $('input#register-password').val();
        if (password.trim() === '') {
          $('input#register-password').val("");
          $('input#register-confirm-password').val("");
          $('input#register-password').focus();
          $('div#register-modal span.modal-form-error').text("empty password");
          return;
        }
        var confirm_password = $('input#register-confirm-password').val();
        if (password !== confirm_password) {
          $('input#register-password').val("");
          $('input#register-confirm-password').val("");
          $('input#register-password').focus();
          $('div#register-modal span.modal-form-error').text("passwords don't match");
          return;
        }
        var username = $('input#register-username').val();
        var valid_username_regex = /^[a-zA-Z0-9-_]+$/;
        if (username.search(valid_username_regex) === -1) {
          $('input#register-username').val("");
          $('input#register-username').focus();
          $('div#register-modal span.modal-form-error').text("alphanumeric usernames only");
          return;
        }
        var email_field = $('input#register-email').val();
        var valid_email_regex = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source + /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source + /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source);
        if (email_field.search(valid_email_regex) === -1) {
          $('input#register-email').val("");
          $('input#register-email').focus();
          $('div#register-modal span.modal-form-error').text("invalid email address");
          return;
        }
        $('div#register-modal input').prop("disabled", true);
        $.post('register.php', {
          'username': username,
          'email': email_field,
          'password': password
        }, function (data) {
          console.log(data);
          if (data.success === true) {
            window.location.href = this_url + "&show=verify_email";
            return;
          }
          $('div#register-modal input').prop("disabled", false);
          if (data.error === 'username_taken') {
            $('input#register-username').val("");
            $('input#register-username').focus();
            $('div#register-modal span.modal-form-error').text("username already taken");
          } else if (data.error === 'email_taken') {
            $('input#register-email').val("");
            $('input#register-email').focus();
            $('div#register-modal span.modal-form-error').text("email already taken");
          } else {
            $('input#register-username').val("");
            $('input#register-email').val("");
            $('input#register-password').val("");
            $('input#register-confirm-password').val("");
            $('input#register-username').focus();
            $('div#register-modal span.modal-form-error').text("unknown error");
          }
        });
      });

      $('a#forgot-password-button').click(function () {
        $('div#log-in-modal-overlay').hide();
        $('input#log-in-password').val("");
        $('div#log-in-modal span.modal-form-error').text("");
        $('div#forgot-password-modal-overlay').show();
        $('input#forgot-password-username').focus();
      });
      $('div#log-in-modal span.modal-close').click(function () {
        $('div#forgot-password-modal span.modal-form-error').text("");
      });
      $(window).click(function (event) {
        if (event.target.id === 'log-in-modal-overlay') {
          $('div#forgot-password-modal span.modal-form-error').text("");
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          $('div#forgot-password-modal span.modal-form-error').text("");
        }
      });
      $('div#forgot-password-modal form').submit(function (event) {
        event.preventDefault();
        var username = $('input#forgot-password-username').val();
        var valid_username_regex = /^[a-zA-Z0-9-_]+$/;
        var valid_email_regex = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source + /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source + /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source);
        if (username.search(valid_username_regex) === -1 && username.search(valid_email_regex) === -1) {
          $('input#forgot-password-username').val("");
          $('input#forgot-password-username').focus();
          $('div#forgot-password-modal span.modal-form-error').text("alphanumeric usernames or emails only");
          return;
        }
        $('div#forgot-password-modal input').prop("disabled", true);
        $.post('forgot_password.php', {
          'username': username
        }, function (data) {
          console.log(data);
          $('div#forgot-password-modal input').prop("disabled", false);
          $('input#forgot-password-username').val("");
          if (data.success === true) {
            $('div#forgot-password-modal-overlay').hide();
            $('div#forgot-password-modal span.modal-form-error').text("");
            $('div#password-reset-email-modal-overlay').show();
          } else if (data.error === 'invalid_user') {
            $('input#forgot-password-username').focus();
            $('div#forgot-password-modal span.modal-form-error').text("user doesn't exist");
          } else {
            $('input#forgot-password-username').focus();
            $('div#forgot-password-modal span.modal-form-error').text("unknown error");
          }
        });
      });
      $('div#reset-password-modal form').submit(function (event) {
        event.preventDefault();
        var password = $('input#reset-new-password').val();
        if (password.trim() === '') {
          $('input#reset-new-password').val("");
          $('input#reset-confirm-password').val("");
          $('input#reset-new-password').focus();
          $('div#reset-password-modal span.modal-form-error').text("empty password");
          return;
        }
        var confirm_password = $('input#reset-confirm-password').val();
        if (password !== confirm_password) {
          $('input#reset-new-password').val("");
          $('input#reset-confirm-password').val("");
          $('input#reset-new-password').focus();
          $('div#reset-password-modal span.modal-form-error').text("passwords don't match");
          return;
        }
        $('div#reset-password-modal input').prop("disabled", true);
        $.post('reset_password.php', {
          'code': $('input#reset-password-code').val(),
          'password': password
        }, function (data) {
          console.log(data);
          if (data.success === true) {
            window.location.href = this_url;
            return;
          }
          $('div#reset-password-modal input').prop("disabled", false);
          $('input#reset-new-password').val("");
          $('input#reset-confirm-password').val("");
          $('input#reset-new-password').focus();
          $('div#reset-password-modal span.modal-form-error').text("unknown error");
        });
      });

      $('a#log-out-button').click(function () {
        $.post('logout.php', {}, function (data) {
          window.location.href = month_url;
        });
      });

      $('a#user-settings-button').click(function () {
        $('div#user-settings-modal-overlay').show();
        $('input#change-email').focus();
      });
      $('div#user-settings-modal span.modal-close').click(function () {
        $('input#change-current-password').val("");
        $('input#change-new-password').val("");
        $('input#change-confirm-password').val("");
        $('div#user-settings-modal span.modal-form-error').text("");
      });
      $(window).click(function (event) {
        if (event.target.id === 'user-settings-modal-overlay') {
          $('input#change-current-password').val("");
          $('input#change-new-password').val("");
          $('input#change-confirm-password').val("");
          $('div#user-settings-modal span.modal-form-error').text("");
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          $('input#change-current-password').val("");
          $('input#change-new-password').val("");
          $('input#change-confirm-password').val("");
          $('div#user-settings-modal span.modal-form-error').text("");
        }
      });
      $('div#user-settings-modal form').submit(function (event) {
        event.preventDefault();
        var new_password = $('input#change-new-password').val();
        var confirm_password = $('input#change-confirm-password').val();
        if (new_password !== confirm_password) {
          $('input#change-new-password').val("");
          $('input#change-confirm-password').val("");
          $('input#change-new-password').focus();
          $('div#user-settings-modal span.modal-form-error').text("passwords don't match");
          return;
        }
        var email_field = $('input#change-email').val();
        var valid_email_regex = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+/.source + /@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?/.source + /(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.source);
        if (email_field.search(valid_email_regex) === -1) {
          $('input#change-email').val(email);
          $('div#email-verified-status').show();
          $('input#change-email').focus();
          $('div#user-settings-modal span.modal-form-error').text("invalid email address");
          return;
        }
        $('div#user-settings-modal input').prop("disabled", true);
        $.post('edit_account.php', {
          'email': email_field,
          'new_password': new_password,
          'old_password': $('input#change-old-password').val()
        }, function (data) {
          console.log(data);
          if (data.success === true) {
            if (email_field !== email) {
              window.location.href = this_url + "&show=verify_email";
            } else {
              window.location.href = this_url;
            }
            return;
          }
          $('div#user-settings-modal input').prop("disabled", false);
          if (data.error === 'invalid_credentials') {
            $('input#change-old-password').val("");
            $('input#change-old-password').focus();
            $('div#user-settings-modal span.modal-form-error').text("wrong current password");
          } else if (data.error === 'email_taken') {
            $('input#change-email').val(email);
            $('div#email-verified-status').show();
            $('input#change-email').focus();
            $('div#user-settings-modal span.modal-form-error').text("email already taken");
          } else {
            $('input#change-old-password').val("");
            $('input#change-email').val(email);
            $('div#email-verified-status').show();
            $('input#change-new-password').val("");
            $('input#change-confirm-password').val("");
            $('input#change-email').focus();
            $('div#user-settings-modal span.modal-form-error').text("unknown error");
          }
        });
      });
      $('input#change-email').on("input propertychange", function () {
        var email_field = $('input#change-email').val();
        if (email_field != email) {
          $('div#email-verified-status').hide();
        } else {
          $('div#email-verified-status').show();
        }
      });
      $('a#resend-verification-email-button').click(function () {
        // Close user settings modal
        $('input#change-current-password').val("");
        $('input#change-new-password').val("");
        $('input#change-confirm-password').val("");
        $('div#user-settings-modal span.modal-form-error').text("");
        $('div#user-settings-modal-overlay').hide();
        // Actually resend the email
        $.post('resend_verification.php', {});
        // Show verification modal
        $('div#verify-email-modal-overlay').show();
      });

      $('a#delete-account-button').click(function () {
        $('div#delete-account-modal-overlay').show();
        $('div#delete-account-modal input:visible').filter(function () {
          return this.value === "";
        }).first().focus();
      });
      $('div#delete-account-modal span.modal-close').click(function () {
        $('input#delete-account-password').val("");
        $('div#delete-account-modal span.modal-form-error').text("");
      });
      $(window).click(function (event) {
        if (event.target.id === 'delete-account-modal-overlay') {
          $('input#delete-account-password').val("");
          $('div#delete-account-modal span.modal-form-error').text("");
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          $('input#delete-account-password').val("");
          $('div#delete-account-modal span.modal-form-error').text("");
        }
      });
      $('div#delete-account-modal form').submit(function (event) {
        event.preventDefault();
        $('div#delete-account-modal input').prop("disabled", true);
        $.post('delete_account.php', {
          'password': $('input#delete-account-password').val()
        }, function (data) {
          console.log(data);
          if (data.success === true) {
            window.location.href = month_url;
            return;
          }
          $('div#delete-account-modal input').prop("disabled", false);
          $('input#delete-account-password').val("");
          $('input#delete-account-password').focus();
          if (data.error === 'invalid_credentials') {
            $('div#delete-account-modal span.modal-form-error').text("wrong password");
          } else {
            $('div#delete-account-modal span.modal-form-error').text("unknown error");
          }
        });
      });

      $('a#delete-squad-button').click(function () {
        $('div#delete-squad-modal-overlay').show();
        $('div#delete-squad-modal input:visible').filter(function () {
          return this.value === "";
        }).first().focus();
      });
      $('div#delete-squad-modal span.modal-close').click(function () {
        $('input#delete-squad-password').val("");
        $('div#delete-squad-modal span.modal-form-error').text("");
      });
      $(window).click(function (event) {
        if (event.target.id === 'delete-squad-modal-overlay') {
          $('input#delete-squad-password').val("");
          $('div#delete-squad-modal span.modal-form-error').text("");
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          $('input#delete-squad-password').val("");
          $('div#delete-squad-modal span.modal-form-error').text("");
        }
      });
      $('div#delete-squad-modal form').submit(function (event) {
        event.preventDefault();
        $('div#delete-squad-modal input').prop("disabled", true);
        $.post('delete_squad.php', {
          'squad': squad,
          'password': $('input#delete-squad-password').val()
        }, function (data) {
          console.log(data);
          if (data.success === true) {
            window.location.href = month_url;
            return;
          }
          $('div#delete-squad-modal input').prop("disabled", false);
          $('input#delete-squad-password').val("");
          $('input#delete-squad-password').focus();
          if (data.error === 'invalid_credentials') {
            $('div#delete-squad-modal span.modal-form-error').text("wrong password");
          } else {
            $('div#delete-squad-modal span.modal-form-error').text("unknown error");
          }
        });
      });

      $('input#edit-squad-color').spectrum({
        'cancelText': "Cancel",
        'chooseText': "Choose",
        'preferredFormat': "hex",
        'color': colors[squad]
      });
      $('input#edit-squad-closed').click(function () {
        $('div#edit-squad-new-password-container').show();
        $('div#edit-squad-confirm-password-container').show();
      });
      $('input#edit-squad-open').click(function () {
        $('div#edit-squad-new-password-container').hide();
        $('div#edit-squad-confirm-password-container').hide();
      });
      $('a#edit-squad-button').click(function () {
        $('div#edit-squad-modal-overlay').show();
        $('input#edit-squad-name').focus();
      });
      $('div#edit-squad-modal span.modal-close').click(function () {
        $('input#edit-squad-personal-password').val("");
        $('input#edit-squad-new-password').val("");
        $('input#edit-squad-confirm-password').val("");
        $('div#edit-squad-modal span.modal-form-error').text("");
      });
      $(window).click(function (event) {
        if (event.target.id === 'edit-squad-modal-overlay') {
          $('input#edit-squad-personal-password').val("");
          $('input#edit-squad-new-password').val("");
          $('input#edit-squad-confirm-password').val("");
          $('div#edit-squad-modal span.modal-form-error').text("");
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          $('input#edit-squad-personal-password').val("");
          $('input#edit-squad-new-password').val("");
          $('input#edit-squad-confirm-password').val("");
          $('div#edit-squad-modal span.modal-form-error').text("");
        }
      });
      $('div#edit-squad-modal form').submit(function (event) {
        event.preventDefault();
        var name = $('input#edit-squad-name').val().trim();
        if (name === '') {
          $('input#edit-squad-name').val(squad_name);
          $('input#edit-squad-name').focus();
          $('div#edit-squad-modal span.modal-form-error').text("empty squad name");
          return;
        }
        var type = $('div#edit-squad-modal ' + 'input[name="edit-squad-type"]:checked');
        if (type.length === 0) {
          $('input#edit-squad-open').focus();
          $('div#edit-squad-modal span.modal-form-error').text("squad type unspecified");
          return;
        }
        var new_password = $('input#edit-squad-new-password').val();
        if (type.val() === 'closed') {
          if (!squad_requires_auth) {
            // If the squad is currently open but is being switched to closed,
            // then a password *must* be specified
            if (new_password.trim() === '') {
              $('input#edit-squad-new-password').val("");
              $('input#edit-squad-confirm-password').val("");
              $('input#edit-squad-new-password').focus();
              $('div#edit-squad-modal span.modal-form-error').text("empty password");
              return;
            }
          }
          var confirm_password = $('input#edit-squad-confirm-password').val();
          if (new_password !== confirm_password) {
            $('input#edit-squad-new-password').val("");
            $('input#edit-squad-confirm-password').val("");
            $('input#edit-squad-new-password').focus();
            $('div#edit-squad-modal span.modal-form-error').text("passwords don't match");
            return;
          }
        }
        var color = $('input#edit-squad-color').spectrum("get").toString().substring(1, 7);
        $('div#edit-squad-modal input').prop("disabled", true);
        $.post('edit_squad.php', {
          'name': name,
          'squad': squad,
          'type': type.val(),
          'personal_password': $('input#edit-squad-personal-password').val(),
          'new_password': new_password,
          'color': color
        }, function (data) {
          console.log(data);
          if (data.success === true) {
            window.location.href = this_url;
            return;
          }
          $('div#edit-squad-modal input').prop("disabled", false);
          if (data.error === 'invalid_credentials') {
            $('input#edit-squad-personal-password').val("");
            $('input#edit-squad-personal-password').focus();
            $('div#edit-squad-modal span.modal-form-error').text("wrong password");
          } else if (data.error === 'name_taken') {
            $('input#edit-squad-name').val(squad_name);
            $('input#edit-squad-name').focus();
            $('div#edit-squad-modal span.modal-form-error').text("squad name already taken");
          } else {
            $('input#edit-squad-name').val(squad_name);
            if (squad_requires_auth) {
              $('div#edit-squad-new-password-container').show();
              $('div#edit-squad-confirm-password-container').show();
            } else {
              $('div#edit-squad-new-password-container').hide();
              $('div#edit-squad-confirm-password-container').hide();
            }
            $('input#edit-squad-open').prop('checked', !squad_requires_auth);
            $('input#edit-squad-closed').prop('checked', squad_requires_auth);
            $('input#edit-squad-new-password').val("");
            $('input#edit-squad-confirm-password').val("");
            $('input#edit-squad-personal-password').val("");
            $('input#edit-squad-color').spectrum("set", colors[squad]);
            $('input#edit-squad-name').focus();
            $('div#edit-squad-modal span.modal-form-error').text("unknown error");
          }
        });
      });

      $('a.show-login-modal').click(function () {
        unfreeze_typeahead();
        $('div.modal-overlay').hide();
        $('div#log-in-modal-overlay').show();
        $('div#log-in-modal input:visible').filter(function () {
          return this.value === "";
        }).first().focus();
      });
      $('a.show-register-modal').click(function () {
        $('div.modal-overlay').hide();
        $('div#register-modal-overlay').show();
        $('div#register-modal input:visible').filter(function () {
          return this.value === "";
        }).first().focus();
      });$('td.day > div').click(function (event) {
        var target = $(event.target);
        if (target.hasClass('entry-container') || target.hasClass('entry-container-spacer') || target.hasClass('day-action-links')) {
          handle_new_entry_action(target.closest('td.day'));
        }
      });
      $('a.add-entry-button').click(function (event) {
        var day = $(this).closest('td.day');
        handle_new_entry_action(day);
      });
      $(window).click(function (event) {
        var target = $(event.target);
        var pick_squads = $('div.pick-squad');
        if (target.hasClass('entry-container') || target.hasClass('entry-container-spacer') || target.closest('a.add-entry-button').length > 0) {
          pick_squads = pick_squads.filter(function () {
            return $(this).closest('td.day')[0] !== target.closest('td.day')[0];
          });
        }
        pick_squads.hide();
      });
      $('a.select-squad').click(function (event) {
        var new_entry_squad = this.id.split('_')[1];
        var container = $(this).closest('td.day').find('div.entry-container');
        create_new_entry(container, new_entry_squad);
      });$('table').on('focusout', 'textarea', function (event) {
        if (event.target.value.trim() === '') {
          delete_entry(event.target.id);
        }
      });
      $('table').on('click', 'a.delete-entry-button', function () {
        var entry = $(this).closest('div.entry');
        var next_entry = entry.next('div.entry');
        var textarea_id = entry.find('textarea').attr('id');
        delete_entry(textarea_id);
        next_entry.addClass('focused-entry');
        next_entry.find('div.action-links').addClass('focused-action-links');
      });$('table').on('focusin focusout', 'textarea', function (event) {
        var entry = $(event.target).closest('div.entry');
        update_entry_focus(entry);
      });
      $('table').on('mouseenter mouseleave', 'div.entry', function (event) {
        var entry = $(event.target).closest('div.entry');
        update_entry_focus(entry);
      });
      $('td.day').hover(function (event) {
        var day = $(event.target).closest('td.day');
        if (day.is(':hover')) {
          day.find('div.day-action-links').addClass('focused-action-links');
          day.find('div.entry-container').addClass('focused-entry-container');
        } else {
          day.find('div.day-action-links').removeClass('focused-action-links');
          day.find('div.entry-container').removeClass('focused-entry-container');
        }
      });

      history_numeric_date = null;
      day_history_loaded = false;
      entry_history_loaded = null;
      $('div#history-modal span.modal-close').click(function () {
        history_numeric_date = null;
        day_history_loaded = false;
        entry_history_loaded = null;
      });
      $(window).click(function (event) {
        if (event.target.id === 'history-modal-overlay') {
          history_numeric_date = null;
          day_history_loaded = false;
          entry_history_loaded = null;
        }
      });
      $(document).keyup(function (e) {
        if (e.keyCode == 27) {
          // esc key
          history_numeric_date = null;
          day_history_loaded = false;
          entry_history_loaded = null;
        }
      });

      $('table').on('click', 'a.entry-history-button', function () {
        var entry = $(this).closest('div.entry');
        entry.removeClass('focused-entry');
        var id_parts = entry.find('textarea').attr('id').split('_');
        if (history_numeric_date != id_parts[0]) {
          history_numeric_date = id_parts[0];
          day_history_loaded = false;
        }
        if (entry_history_loaded === id_parts[1]) {
          update_history_modal_mode(1, false);
        } else {
          show_entry_history(id_parts[1], false);
        }
      });
      $('div.day-history').on('click', 'a.revision-history-button', function () {
        var id_parts = $(this).closest('li').attr('id').split('_');
        if (entry_history_loaded === id_parts[1]) {
          update_history_modal_mode(1, true);
        } else {
          show_entry_history(id_parts[1], true);
        }
      });
      $('a.day-history-button').click(function () {
        var new_numeric_date = $(this).closest('td.day').attr('id');
        if (new_numeric_date === history_numeric_date && day_history_loaded) {
          update_history_modal_mode(0, false);
        } else {
          history_numeric_date = new_numeric_date;
          show_day_history(history_numeric_date, false);
        }
      });
      $('a#all-history-button').click(function () {
        if (!history_numeric_date) {
          return;
        }
        if (day_history_loaded) {
          update_history_modal_mode(0, true);
        } else {
          show_day_history(history_numeric_date, true);
        }
      });

      $('div.day-history').on('click', 'a.restore-entry-button', function () {
        var li = $(this).closest('li');
        var entry_id = li.attr('id').split('_')[1];
        var numeric_date = history_numeric_date;
        li.find('img.restore-loading').show();
        $.post('restore_entry.php', {
          'id': entry_id,
          'session_id': session_id,
          'timestamp': Date.now()
        }, function (data) {
          console.log(data);
          if (!data.success) {
            return;
          }
          li.find('span.deleted-entry').remove();
          show_entry_history(entry_id, true);

          // Now we need to re-add the entry to the UI
          var new_entry = $("<div class='entry' />");
          new_entry.css('background-color', '#' + colors[data.squad]);
          if (color_is_dark[data.squad]) {
            new_entry.addClass('dark-entry');
          }
          var textarea = $("<textarea rows='1' />");
          textarea.attr('id', numeric_date + '_' + entry_id);
          textarea.val(data.text);
          new_entry.append(textarea);
          new_entry.append("<img" + "  class='entry-loading'" + "  src='" + base_url + "images/ajax-loader.gif'" + "  alt='loading'" + "/>" + "<span class='save-error'>!</span>" + "<div class='action-links'>" + "  <a href='#' class='delete-entry-button'>" + "    <span class='delete'>✖</span>" + "    <span class='action-links-text'>Delete</span>" + "  </a>" + "  <a href='#' class='entry-history-button'>" + "    <span class='history'>≡</span>" + "    <span class='action-links-text'>History</span>" + "  </a>" + "  <span class='right-action-links action-links-text'>" + "    " + truncated_squad_name(data.squad, 12) + "  </span>" + "  <div class='clear'></div>" + "</div>");
          var current_entries = $('td.day#' + numeric_date + ' textarea');
          var insert_before_this_entry = null;
          current_entries.each(function (i, textarea_element) {
            var id_parts = textarea_element.id.split("_");
            var candidate_entry_id = id_parts[1];
            if (creation_times[candidate_entry_id] === undefined || creation_times[candidate_entry_id] > data.creation_time) {
              insert_before_this_entry = $(textarea_element).closest('div.entry');
              return false;
            }
            return true;
          });
          if (insert_before_this_entry === null) {
            insert_before_this_entry = $('td.day#' + numeric_date + ' div.entry-container-spacer');
          }
          insert_before_this_entry.before(new_entry);
          var textarea_element = new_entry.find('textarea')[0];
          textarea_element.style.height = 'auto';
          textarea_element.style.height = textarea_element.scrollHeight + 'px';
          creation_times[entry_id] = data.creation_time;
          $('textarea').each(function (i) {
            $(this).attr('tabindex', i + 1);
          });
        });
      });

      subscription_changing = false;

      $('a#subscribe-button').click(function () {
        if (subscription_changing) {
          return;
        }
        subscription_changing = true;
        $('img.subscribe-loading').show();
        $.post('subscribe.php', {
          'squad': squad,
          'subscribe': viewer_subscribed ? 0 : 1
        }, function (data) {
          console.log(data);
          $('img.subscribe-loading').hide();
          if (data.success) {
            viewer_subscribed = !viewer_subscribed;
            var text = viewer_subscribed ? "Unsubscribe" : "Subscribe";
            $('a#subscribe-button').text(text);
          }
          subscription_changing = false;
        });
      });
    }
  };
});
// side effect: $.timeago
// side effect: $.format
// side effect: $.spectrum

// Modernizr (custom, so it's not a JSPM package)
})
(function(factory) {
  factory();
});
//# sourceMappingURL=build.js.map