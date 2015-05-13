/*********************************************************
 * The publicly exposed MathQuill API.
 ********************************************************/

/**
 * Global function that takes an HTML element and, if it's the root HTML element
 * of a static math or math or text field, returns its API object (if not, null).
 * Identity of API object guaranteed if called multiple times, i.e.:
 *
 *   var mathfield = MathQuill.MathField(mathFieldSpan);
 *   assert(MathQuill(mathFieldSpan) === mathfield);
 *   assert(MathQuill(mathFieldSpan) === MathQuill(mathFieldSpan));
 *
 */
function MathQuill(el) {
  if (!el || !el.nodeType) return null; // check that `el` is a HTML element, using the
    // same technique as jQuery: https://github.com/jquery/jquery/blob/679536ee4b7a92ae64a5f58d90e9cc38c001e807/src/core/init.js#L92
  var blockId = $(el).children('.mq-root-block').attr(mqBlockId);
  return blockId ? Node.byId[blockId].controller.API : null;
};

MathQuill.noConflict = function() {
  window.MathQuill = origMathQuill;
  return MathQuill;
};
var origMathQuill = window.MathQuill;
window.MathQuill = MathQuill;

/**
 * Returns function (to be publicly exported) that MathQuill-ifies an HTML
 * element and returns an API object. If the element had already been MathQuill-
 * ified into the same kind, return the original API object (if different kind
 * or not an HTML element, null).
 */
function APIFnFor(APIClass) {
  function APIFn(el, opts) {
    var mq = MathQuill(el);
    if (mq instanceof APIClass || !el || !el.nodeType) return mq;
    return APIClass($(el), opts);
  }
  APIFn.prototype = APIClass.prototype;
  return APIFn;
}

var Options = P(), optionProcessors = {};
MathQuill.__options = Options.p;

var AbstractMathQuill = P(function(_) {
  _.init = function() { throw "don't call me, I'm 'abstract'"; };
  _.initRoot = function(root, el, opts) {
    this.__options = Options();
    this.config(opts);

    var ctrlr = Controller(this, root, el);
    ctrlr.createTextarea();

    var contents = el.contents().detach();
    root.jQ =
      $('<span class="mq-root-block"/>').attr(mqBlockId, root.id).appendTo(el);
    this.latex(contents.text());

    this.revert = function() {
      return el.empty().unbind('.mathquill')
      .removeClass('mq-editable-field mq-math-mode mq-text-mode')
      .append(contents);
    };
  };
  _.config =
  MathQuill.config = function(opts) {
    for (var opt in opts) if (opts.hasOwnProperty(opt)) {
      var optVal = opts[opt], processor = optionProcessors[opt];
      this.__options[opt] = (processor ? processor(optVal) : optVal);
    }
    return this;
  };
  _.setElement = function(el) { this.__controller.element = el; return this; };
  _.el = function() { return this.__controller.container[0]; };
  _.text = function() { return this.__controller.exportText(this.__options); };
  _.toString = function() { 
    var latex = this.__controller.exportLatex();
    return latex = 'latex{' + latex + '}';
  };
  _.html = function() {
    return this.__controller.root.jQ.html()
      .replace(/ mathquill-(?:command|block)-id="?\d+"?/g, '')
      .replace(/<span class="?mq-cursor( mq-blink)?"?>.?<\/span>/i, '')
      .replace(/ mq-hasCursor|mq-hasCursor ?/, '')
      .replace(/ class=(""|(?= |>))/g, '');
  };
  _.reflow = function() {
    this.__controller.root.postOrder('reflow');
    return this;
  };
});
MathQuill.prototype = AbstractMathQuill.prototype;

MathQuill.StaticMath = APIFnFor(P(AbstractMathQuill, function(_, super_) { // BRENTAN: Likely does not work...take a look at some point
  _.init = function(el) {
    this.initRoot(MathBlock(), el.addClass('mq-math-mode'));
    this.__controller.editable = false;
    this.__controller.editablesTextareaEvents();
  };
  _.latex = function() {
    var returned = super_.latex.apply(this, arguments);
    if (arguments.length > 0) {
      this.__controller.root.postOrder('registerInnerField', this.innerFields = []);
    }
    return returned;
  };
}));

var EditableField = MathQuill.EditableField = P(AbstractMathQuill, function(_) {
  _.initRootAndEvents = function(root, el, opts) {
    this.initRoot(root, el, opts);
    this.__controller.editable = true;
    this.__controller.editablesTextareaEvents();
  };
  _.focus = function(dir) { 
    this.__controller.focus(); 
    if(dir && (dir < 2))
      this.moveToDirEnd(dir);
    else if(dir) {
      this.__controller.seek(false, dir, 0);
    }
    return this; 
  };
  _.blur = function() { this.__controller.blur(); return this; };
  _.windowBlur = function() { this.__controller.windowBlur(); return this; };
  _.inFocus = function() { return !this.__controller.blurred; };
  _.write = function(latex) {
    if (latex.slice(0,6) === 'latex{' && latex.slice(-1) === '}') 
      latex = latex.slice(6, -1);
    this.__controller.writeLatex(latex);
    if (this.__controller.blurred) this.__controller.cursor.hide().parent.blur();
    return this;
  };
  _.setAutocomplete = function(list) {
    this.__options.autocomplete = list.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    return this;
  }
  _.addAutocomplete = function(item) { 
    if(typeof this.__options.autocomplete === 'undefined') this.__options.autocomplete = [item];
    else if(this.__options.autocomplete.indexOf(item) > -1) return; 
    else this.__options.autocomplete.push(item);
    this.__options.autocomplete = this.__options.autocomplete.sort(function (a, b) { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    return this;
  }
  _.command = function(cmd) {
    // Toolbar command
    this.cmd(cmd);
  }
  _.cmd = function(cmd) {
    var ctrlr = this.__controller.notify(), cursor = ctrlr.cursor.show();
    if (/^\\[a-z]+$/i.test(cmd)) {
      cmd = cmd.slice(1);
      var klass = LatexCmds[cmd];
      if (klass) {
        cmd = klass(cmd);
        if (cursor.selection) cmd.replaces(cursor.replaceSelection());
        cmd.createLeftOf(cursor);
      }
      else /* TODO: API needs better error reporting */;
    }
    else cursor.parent.write(cursor, cmd, cursor.replaceSelection());
    if (ctrlr.blurred) cursor.hide().parent.blur();
    return this;
  };
  _.select = function() {
    var ctrlr = this.__controller;
    ctrlr.notify('move').cursor.insAtRightEnd(ctrlr.root);
    while (ctrlr.cursor[L]) ctrlr.selectLeft();
    return this;
  };
  _.clearSelection = function() {
    this.__controller.cursor.clearSelection();
    return this;
  };
  _.clear = function() {
    this.select();
    this.clearSelection();
    return this;
  }

  _.moveToDirEnd = function(dir) {
    this.__controller.notify('move').cursor.insAtDirEnd(dir, this.__controller.root);
    this.__controller.cursor.workingGroupChange();
    return this;
  };
  _.moveToLeftEnd = function() { return this.moveToDirEnd(L); };
  _.moveToRightEnd = function() { return this.moveToDirEnd(R); };

  _.keystroke = function(key, evt) {
    this.__controller.keystroke(key, evt);
    return this;
  };
  _.typedText = function(text) {
    for (var i = 0; i < text.length; i += 1) this.__controller.typedText(text.charAt(i));
    return this;
  };
  _.cut = function(e) { this.__controller.cut(e); return this; }
  _.copy = function(e) { this.__controller.copy(e); return this; }
  _.paste = function(text) { this.__controller.paste(text); return this; }
  _.contextMenu = function(e) {
    return this.__controller.contextMenu(e);
  }
  _.cursorX = function() {
    if(this.__controller.cursor.jQ && this.__controller.cursor.jQ.offset()) return this.__controller.cursor.jQ.offset().left;
    return undefined;
  }
  _.mouseDown = function(e) {
    this.__controller.mouseDown(e);
  }
  _.mouseMove = function(e) {
    this.__controller.mouseMove(e);
  }
  _.mouseUp = function(e) {
    this.__controller.mouseUp(e);
  }
  _.mouseOut = function(e) {
    this.__controller.mouseOut(e);
  }
});

function RootBlockMixin(_) {
  var names = 'moveOutOf deleteOutOf selectOutOf upOutOf downOutOf reflow'.split(' ');
  for (var i = 0; i < names.length; i += 1) (function(name) {
    _[name] = function(dir) { this.controller.handle(name, dir); };
  }(names[i]));
}
