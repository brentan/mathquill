# [MathQuill](http://mathquill.github.com)

This is a custom MathQuill fork for use in the SwiftCalcs system.  For full mathquill documentation, see the 
original repository...but be warned not all options will work with this fork, and most customizations have not
yet been documented (sorry).

This library uses make to concatenate all the js files together in to a single file/library.  The intro.js
and outro.js files are the books ends for the final file built by make.

Mathquill is the WYSIWYG math entry system utilized by Swift Calcs.  A mathquill instance is created on
each math-enabled block in a worksheet, and when activated, keystrokes and commands are passed from
swift_calcs_client in to the mathquill class to be handled.  The API between swift_calcs_client and mathquill
exists in the src/publicapi.js file.  Many of these are custom to Swift Calcs, as the default mathquill library
does its own click/keysroke handling.  In swift calcs, we handle it in our own library and pass the event
to mathquill if it bubbles to that level.  Please see that file for documentation of the various API functions.

Mathquill utilizes an object-like structure to track all the various components in the entry box.  The basic class is the Controller, which houses a root block.  The root block (and any subsquent child) is an extension of the Node class found in the tree.js file.  You can navigate the elements using:
el[R] - element to the right of the current one (or 0)
el[L] - element to the left of the current one (or 0)
el.ends[R] - rightmost child element (or 0)
el.ends[L] - leftmost child element (or 0)
(L and R are defined as -1, 1 respectively)

There is also a cursor, which is inserted in to the element, and its location is tracked using the same navigation
functions noted above.

For example:
1+1
this would be three elements next to each other
cos(1+1)
this would be a single element, with three children, which are 1+1.

The base math element class is found in the src/commands/math.js file.  Classes for specific elements derived
from the base class are in the src/commands/math/ folder.  Each element has its own HTML, jQ element if its in the DOM, textual representation, and latex representation.  When the .text() or .latex() commands are called in the 
public API, the element tree is traversed and all the various text or latex representations combined together.