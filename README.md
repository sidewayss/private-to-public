# `private-to-public` is a Babel plugin
## Usage
Installation... *I need to publish it!*

Here is a sample babel.config.json:
```json
{
  "plugins": [
    ["private-to-public", { "minify":true, "aToZ":true }]
  ]
}
```
## Features
### Backward compatibility for browser versions that don't support [class fields](https://caniuse.com/?search=class%20fields)
Step one: remove all class field declarations, public and private, instance and static.

Step two:
- Private fields: It renames all references by replacing the `#` prefix with `_` (or the string of your choice via the `prefix` option). For example, `#name` becomes `_name`.
- Public fields: If no value is assigned, there is nothing more to do.
- Instance fields: Assigning a value in the declaration is not supported and will throw an error. Move the assignment inside the constructor.
- Static fields: If a value *is* assigned, then it inserts a new `AssignmentExpression` immediately after the `ClassDeclaration`. For example:
    ```js
    Class C {
      static statix = 0;
    }
    ```
    becomes
    ```js
    Class C {
    }
    C.statix = 0;
    ```
The only option is `"prefix"`, which takes any [valid set of starting characters](https://pr36619.content.dev.mdn.mozit.cloud/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#identifiers) for a JavaScript identifier. For example:
```json
["private-to-public", { "prefix":"z_$" }]
```

### Minification of private names
Setting `"minify":true` turns on minification and overrides the `"prefix"` option.

Setting `"aToZ":true` indicates that your source code only uses `$`, `_`, `A-Z`, and `a-z` for single-character class property names:
- If unset or `false`, all the character codes are UTF-16 and the limit is 2406 private names.
- If `true`, it uses the remaining valid UTF-8 characters for the first 62 names, saving a little space and nudging the limit up to 2468.

The original goal was backward compatibility. Along the way I realized that unless I minified before transpiling, there would be no simple way to mangle the previously private property names, because now they are public. As private properties they are scoped within the class. I prefer to avoid learning such advanced transpilation options, and I'm used to minifying at the end of the process (*whether or not that matters...*).

It's a simple, global minification of private names to a single character using contiguous blocks of valid Unicode character codes and the `++` operator. There is a limit to the number of private properties, static and instance combined (they share the same namespace), but that limit is high and can be extended with a pull request. The single-character public name must be unique across the entire class family, from the top-level superclass down to all of its descendants. `this.name` must refer to the correct property within the correct (sub)class.  (*That could be separated by static and instance names, now that they're public and have separate namespaces. It would be one way to increase the number of names available.*)

> *NOTE:* If you are not bundling your class family into a single file, you must feed the source files into babel in descending order, superclass to subclasses. On the positive side, the plugin handles multi-file class families.

The only other limitation is that these are valid Unicode character codes, so you can't already be using them as single-character property names for your class. These UTF-16 characters are in blocks that are unlikely to be used in source code, regardless of the length of the name, so I don't see this as much of a limitation. If you set `"aToZ":true` they you're telling the plugin that you aren't using *any* UTF-16 characters as single-character names.

The specific character blocks are:<br>
UTF-8 for `"aToZ":true`:
- `U+00C0` - `U+00FF` ( 62) Latin 1 Supplement, excluding `U+00D7` and `U+00F7`

UTF-16 blocks, in order:
- `U+1401` - `U+166C` (620) Unified Canadian Aboriginal Syllabics
- `U+F900` - `U+FA6D` (366) CJK Compatibility
- `U+10FC` - `U+1248` (333) Georgian / Hangul Jamo / Ethiopic Syllables
- `U+FBD3` - `U+FD3D` (363) Arabic Presentation Forms
- `U+FB46` - `U+FBB1` (108) Hebrew & Arabic Presentation Forms
- `U+048A` - `U+052F` (166) Extended & Obscure Cyrillic
- `U+0100` - `U+02C1` (450) Latin Extended

If your class family has more than 2,400 private names and you need to increase the limit, I'd be happy to oblige you :) As it is, I think I could have left it at 512 using only Latin 1 Supplement and Latin Extended. Or used only the Canadian aboriginal symbols, which are pretty cool looking and the largest single block at 620. But in the process of finding the biggest block, I found several big ones, and it was simple enough to link them up, preempting any realistic need to extend the limit.