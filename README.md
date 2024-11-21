# babel-plugin-private-to-public
## Summary
This plugin is an alternative to the combination of:
- [@babel/plugin-transform-class-properties](https://babeljs.io/docs/babel-plugin-transform-class-properties)
- [@babel/plugin-transform-private-methods](https://babeljs.io/docs/babel-plugin-transform-private-methods)

It has two main features and [options](#options) to control them:
- [Backward Compatibility](#backward-compatibility) for browser versions that don't support class fields and private class methods
- [Minification](#minification) of private names

Why? The built-in Babel plugins do too much. They don't offer an option to simply convert the private members to public. I didn't see any such plugin in the npm registry, so I built it. The minification features are a bonus.

## Usage
### Installation
```
npm install --save-dev babel-plugin-private-to-public
```

### Sample babel.config.json entry:
```json
{
  "plugins": [
    ["babel-plugin-private-to-public", { "minify":true, "aToZ":true }]
  ]
}
```
## Backward Compatibility
For browser versions that don't support [class fields](https://caniuse.com/?search=class%20fields) (a subset of which are [private properties](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes/Private_properties)) and [private methods](https://caniuse.com/mdn-javascript_classes_private_class_methods):
- Removes all class field declarations, public and private, instance and static.
- Renames private methods and references to private fields by replacing the `#` prefix or minifying the name.
- For class fields with a value assigned in the declaration:
  - **Instance** - Throws an error. You must move the assignment inside the constructor.
  - **Static** - Inserts a new `AssignmentExpression` immediately after the `ClassDeclaration`. For example:

    ```js
    class C {
      static statix = 0;
    }
    ```
    becomes:
    ```js
    class C {
    }
    C.statix = 0;
    ```

## Options
### `prefix`
*String.* Designates the prefix used when replacing the `#` prefix instead of minifying. It takes any [valid set of starting characters](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers) for a JavaScript identifier. It defaults to `"_"`.  For example, this converts `#name` to `z$name`:
```json
["babel-plugin-private-to-public", { "prefix":"z$" }]
```

### `minify`
*Boolean.* Toggles minification. When `true`, overrides the `prefix` option and converts each private name to a single character public name.

### `aToZ`
*Boolean, requires `"minify":true`.* When `true`, indicates that your source code only uses `$`, `_`, `A-Z`, and `a-z` for single-character class property names:
- If unset or `false`, all the new names are single UTF-16 characters and the limit is 2,406 private names.
- If `true`, it uses the remaining valid UTF-8 characters for the first 62 names, saving a little space and nudging the limit up to 2,468.

### `byFile`
*Boolean.* When `true` indicates that the plugin will reset prior to processing this file. Leave it unset or set it to `false` when you are transpiling a class family that spans files.  I use it for the automated tests in Jest/babel-plugin-tester, where each [`fixture`](https://github.com/babel-utils/babel-plugin-tester?tab=readme-ov-file#fixtures) is processed with different options, and each file is a separate class family.

## Minification
The original goal was backward compatibility. Along the way I realized that unless I minified before transpiling, there would be no simple way to mangle the previously private property names, because now they are public. As private properties they are scoped within the class. I prefer to avoid learning such advanced transpilation options, and I'm used to minifying at the end of the process (*whether or not that matters...*).

It's a simple, global minification of private names to a single character using contiguous blocks of valid character codes and the `++` operator. The limit of ~2400 private names applies to the entire class family for static and instance properties combined (*they share the same namespace*\*). Each replacement property name must be unique across the entire class family or subclasses will have overlapping properties, as if overriding the superclass - which never happens with private properties.

> *NOTE:* It does not generate a source map of any kind. It would be a nice enhancement.

> *NOTE:* If your class family spans multiple files, you must feed the source files into Babel in descending order, superclass to subclasses. On the positive side, the plugin handles multi-file class families.

The only other possible issue is that these are valid characters, and you could already be using one or more of them as single-character property names for your class; but it's not likely. The UTF-16 characters are in blocks that are unlikely to be used in source code at all, regardless of the length of the name. If you are only using ASCII characters, then there's zero chance of a name conflict.

*Yes, it's kludgy, a hack, but minification is a hacky enterprise: no standards, obtuse options, and no shortage of disclaimers. If you don't need a source map, this is a practical solution for minifiying private properties while transpiling them to public for backward compatibility.*

### Character blocks
#### UTF-8 for `"aToZ":true`:
- `U+00C0` - `U+00FF` (62) Latin 1 Supplement, excluding `U+00D7` and `U+00F7`

#### UTF-16 blocks, in order:
- `U+1401` - `U+166C` (620) Unified Canadian Aboriginal Syllabics
- `U+F900` - `U+FA6D` (366) CJK Compatibility
- `U+10FC` - `U+1248` (333) Georgian / Hangul Jamo / Ethiopic Syllables
- `U+FBD3` - `U+FD3D` (363) Arabic Presentation Forms
- `U+FB46` - `U+FBB1` (108) Hebrew & Arabic Presentation Forms
- `U+048A` - `U+052F` (166) Extended & Obscure Cyrillic
- `U+0100` - `U+02C1` (450) Latin Extended (*last because I think it might be used by a lot more people than the previous blocks combined - 1,956 names without it is still a lot*)

If I'm wrong and any of these characters are used by programmers for single character names (some of these character blocks intend their characters to be combined), please let me know.

If your class family has more than 2,400 private names and you need to increase the limit, I'd be happy to oblige :) As it is, I think I could have left it at 512 using only Latin 1 Supplement and Latin Extended. Or at 620 using only the Canadian aboriginal symbols, which are pretty cool looking and the largest verifiable, single block. But in the process of finding the biggest block, I found several big ones, and it was simple enough to link them up, preempting any realistic need to extend the limit in the future.

\* *The single-character public names could be separated by static vs instance because those namespaces are separate. It would increase the number of names available, depending on how many of each you have.*