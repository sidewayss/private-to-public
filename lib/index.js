"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = _default;
let prefix,
  // user configured string, defaults to "_",
  isMini,
  // boolean for minify option, defaults to false
  aToZ,
  // minify sub-option to include UTF-8 Latin Supplement chars
  byFile,
  // boolean indicates that options should reset for each file
  classId,
  // global identifier, set upon entering class declaration
  charCode,
  // the current byClass object for this class or one of its supers
  blocks; // the full set of characters for minification, by block

const byClass = {},
  // { [classId]:{ char:Number, map:{ name:Number } } }
  block16 = [256, 705],
  // Latin Extended
  block8 = [[192, 214],
  // Latin 1 Supplement
  [216, 246], [248, 705] // and Latin Extended
  ],
  blockSrc = [[5121, 5740],
  // Unified Canadian Aboriginal Syllabics
  [63744, 64109],
  // CJK Compatibility
  [4348, 4680],
  // Georgian / Hangul Jamo / Ethiopic Syllables
  [64467, 64829],
  // Arabic Presentation Forms
  [64326, 64433],
  // Hebrew & Arabic Presentation Forms
  [1162, 1327] // Extended & Obscure Cyrillic
  ];
//==============================================================================
function _default({
  types: t
}) {
  return {
    visitor: {
      Program(_, state) {
        // runs once per file
        byFile = Boolean(state.opts.byFile);
        if (byFile || isMini === undefined) {
          // reset options for this file
          isMini = Boolean(state.opts.minify);
          if (isMini) {
            blocks = blockSrc.slice();
            aToZ = Boolean(state.opts.aToZ);
            if (aToZ) blocks.unshift(...block8);else blocks.push(block16);
          } else prefix = state.opts.prefix ?? "_";
        } // else leave them as-is
      },
      ClassDeclaration(path) {
        // get classId only once per declaration
        classId = path.node.id;
        if (isMini) {
          charCode = byClass[path.node.superClass?.name] // share super's object
          ?? {
            block: -1,
            map: {}
          }; // new object
          byClass[classId.name] = charCode;
        }
        //console.log("class", isMini, classId.name, path.node.superClass?.name, byClass);
      },
      ClassProperty(path) {
        // public fields
        newField(t, path);
      },
      ClassPrivateProperty(path) {
        // private fields
        newField(t, path, true);
      },
      ClassPrivateMethod(path) {
        // private methods
        const node = path.node,
          type = t.classMethod(node.kind, getId(t, node.key), node.params, node.body, undefined, node.static);
        path.replaceWith(type);
      },
      PrivateName(path) {
        // references to private fields and methods
        path.replaceWith(getId(t, path.node));
      }
    }
  };
}
//==============================================================================
// getId() returns a new public identifier with the old name and a new prefix
function getId(t, obj) {
  let str,
    name = obj.id.name;
  if (isMini) {
    name = classId.name + name; // private names don't inherit
    if (name in charCode.map) str = charCode.map[name];else {
      str = nextChar();
      charCode.map[name] = str;
    }
  } else str = prefix + name; // id.name has no # prefix

  return t.identifier(str);
}
// newField() removes private and public field declarations. Static fields with
//            a value are reassigned to immediately below the class declaration.
function newField(t, path, isPrivate) {
  const node = path.node,
    key = node.key;
  //console.log("newField():", isPrivate ? key.id.name : key.name, charCode);

  if (node.value !== null) {
    // reassign static = value
    if (node.static) {
      const prop = isPrivate ? getId(t, key) : key,
        mExp = t.optionalMemberExpression(classId, prop, node.computed, false),
        aExp = t.assignmentExpression("=", mExp, node.value);
      path.parentPath.parentPath.insertAfter(t.expressionStatement(aExp));
    } else
      // reassigning instance properties is out-of-scope
      throw new Error(`class ${classId.name}: You must initialize ${isPrivate ? `#${key.id.name}` : key.name} in the constructor, not in the class body.`);
  } else if (isMini && isPrivate) {
    const name = classId.name + key.id.name;
    if (!(name in charCode.map)) charCode.map[name] = nextChar();
  }
  path.remove(); // remove the original
}
// nextChar() gets the next character for minify option, returns char as string
function nextChar() {
  if (charCode.code !== charCode.last) charCode.code++; // use the next character in the block
  else {
    charCode.block++; // go to the next block
    if (charCode.block < blocks.length) {
      charCode.code = blocks[charCode.block][0];
      charCode.last = blocks[charCode.block][1];
    } else
      // we ran out of blocks!
      throw new Error(`${classId.name} and its related classes have exceeded ${aToZ ? "2468" : "2406"} private members.`);
  }
  return String.fromCharCode(charCode.code);
}
