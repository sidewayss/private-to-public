let
prefix,   // user configured string, defaults to "_",
isMini,   // boolean for minify option, defaults to false
aToZ,     // minify sub-option to include UTF-8 Latin Supplement chars
classId,  // global identifier, set upon entering class declaration
charCode, // the current byClass object for this class or one of its supers
charMap,  // Map used to create continuous block of char codes
charOne;  // the starting character code, varies by aToZ option value

const
byClass = {}, // { [classId]:{ char:Number, map:{ name:Number } } }

utf8Map = [[  214,   216],  // Latin 1 Supplement
           [  246,   248],
           [  705,  5121]], // Unified Canadian Aboriginal Syllabics
baseMap = [[ 5740, 63744],  // CJK Compatibility
           [64109,  4348],  // Georgian / Hangul Jamo / Ethiopic Syllables
           [ 4680, 64467],  // Arabic Presentation Forms
           [64829, 64326],  // Hebrew & Arabic Presentation Forms
           [64433,  1162],  // Extended & Obscure Cyrillic
           [ 1327,   256]]; // Latin Extended

export default function({ types: t }) {
  return {
    visitor: {
      Program(_, state) {           // capture option values once per file
        let arr;
        prefix = state.opts.prefix ?? "_";
        isMini = Boolean(state.opts.minify);
        if (isMini)
          aToZ = state.opts.aToZ;
          if (aToZ) {
            charOne = 192;
            arr = [...utf8Map.slice(), ...baseMap.slice()];
            delete arr.at(-1)[1];
          }
          else {
            charOne = 5121;
            arr = baseMap.slice();
            arr.push([705])
          }
          charMap = new Map(arr);
      },
      ClassDeclaration(path) {      // get the class declaration id only once
        classId = path.node.id;
        if (isMini) {
          charCode = byClass[path.node.superClass?.name] // share super's object
                  ?? { code:charOne, map:{} };           // new object
          byClass[classId.name] = charCode;
        }
      },
      ClassProperty(path) {         // public fields
        newField(t, path);
      },
      ClassPrivateProperty(path) {  // private fields
        newField(t, path, true);
      },
      ClassPrivateMethod(path) {    // private methods
        const
        node = path.node,
        type = t.classMethod(node.kind, getId(t, node.key), node.params,
                             node.body, undefined, node.static);
        path.replaceWith(type);
      },
      PrivateName(path) {           // references to private fields and methods
        path.replaceWith(getId(t, path.node));
      }
    }
  };
}
//==============================================================================
// getId() returns a new public identifier with the old name and a new prefix
function getId(t, obj) {
  let str;
  const name = obj.id.name;
  if (!isMini)
    str = prefix + name;         // id.name has no # prefix
  else if (name in charCode.map)
    str = charCode.map[name];
  else {
    str = nextChar();
    charCode.map[name] = str;
  }
  return t.identifier(str);
}
// newField() removes private and public field declarations. Static fields with
//            a value are reassigned to immediately below the class declaration.
function newField(t, path, isPrivate) {
  const
  node = path.node,
  key  = node.key;

  if (node.value !== null) {  // reassign static = value
    if (node.static) {
      const
      prop = isPrivate ? getId(t, key) : key,
      mExp = t.optionalMemberExpression(classId, prop, node.computed, false),
      aExp = t.assignmentExpression("=", mExp, node.value);
      path.parentPath.parentPath.insertAfter(t.expressionStatement(aExp));
    }
    else                      // reassigning instance properties is out-of-scope
      throw new Error(`class ${classId.name}: You must initialize ${isPrivate
                    ? `#${key.id.name}` : key.name} in the constructor, not in the class body.`);
  }
  else if (isPrivate && !(key.id.name in charCode.map))
    charCode.map[key.id.name] = nextChar();

  path.remove();              // remove the original
}
// nextChar() gets the next character code for minify option
function nextChar() {
  if (charMap.has(charCode.code)) {
    charCode.code = charMap.get(charCode.code);
    if (!charCode.code)
      throw new Error(`${classId.name} and its related classes have exceeded ${
                      aToZ ? "2468" : "2406"} private members.`);
  }
  else
      charCode.code++;

  return String.fromCharCode(charCode.code);
}