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
  _.mathquill = true;
  _.last_action = 'none';
  _.needs_touch = true;
  _.init = function() { throw "don't call me, I'm 'abstract'"; };
  _.initRoot = function(root, el, opts) {
    this.__options = Options();
    this.config(opts);

    var ctrlr = Controller(this, root, el);
    ctrlr.createTextarea();

    var contents = el.contents().detach();
    root.jQ =
      $('<span class="mq-root-block"/>').attr(mqBlockId, root.id).attr('data-ghost', '').addClass('show_ghost').appendTo(el);
    this.latex(contents.text());
    if(opts && opts.ghost && (contents.text().trim() == ''))
      this.setGhost(opts.ghost);

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
    if(this.__options['default']) this.touched = true;
    if(this.__options['noWidth']) this.setWidth = false;
    return this;
  };
  _.setElement = function(el) { this.__controller.element = el; this.__controller.showPopups = true; return this; };
  _.showPopups = function() { this.__controller.showPopups = true; return this; };
  _.setUnitMode = function(val) { this.__controller.captiveUnitMode = val; this.__controller.captiveMode = val; return this; };
  _.setCaptiveMode = function(val) { this.__controller.captiveMode = val; return this; };
  _.setUnitsOnly = function(val) { this.__controller.units_only = val; return this; };
  _.setStaticMode = function(val) { this.__controller.staticMode = val; return this; };
  _.el = function() { return this.__controller.container[0]; };
  var setOpts = function(opts, _this) {
    if(opts)
      opts = jQuery.extend(opts, _this.__options);
    else
      opts = _this.__options;
    if(_this.__controller.captiveUnitMode)
      opts.captiveUnitMode = true;
    if(_this.__controller.captiveMode)
      opts.captiveMode = true;
    if(_this.__controller.units_only)
      opts.units_only = true;
    return opts;
  }
  _.text = function(opts) { 
    opts = setOpts(opts, this);
    var out = this.__controller.exportText(opts); 
    // Transform 1...2 and 1, 3...6 into appropriate emgiac 'matrix()' call
      // KEPT FOR BACKWARDS COMPATIBILITY 2/7/16.  PROBABLY SHOULD BE REMOVE AT SOME POINT IN FUTURE
    out = out.replace(/(-?[a-z0-9_.]+) *, *(-?[a-z0-9_.]+) *\.\.\. *(-?[a-z0-9_.]+)/ig, " makevector(seq($1, $3, $2-$1))").replace(/(-?[a-z0-9_.]+) *\.\.\. *(-?[a-z0-9_.]+)/ig, " makevector(seq($1, $2, 1))")
    if(opts['check_for_array'] && !out.match(/\[.*\]/) && out.match(/,/))
      out = '[' + out + ']'; 
    if(opts['default'] && (out.trim() == '')) return opts['default'];
    return out;
  };
  _.highlightError = function(error_index, opts) {
    if(error_index < 0) return false;
    opts = setOpts(opts, this);
    // If check for array is enabled, we have to see if it happened, and if so, update the error_index
    if(opts['check_for_array']) {
      opts['check_for_array'] = false;
      var out = this.__controller.exportText(opts); 
      if(!out.match(/\[.*\]/) && out.match(/,/))
        error_index++;
      opts['check_for_array'] = true;
    }
    // call highlightError
    return this.__controller.highlightError(opts, error_index); 
  }
  _.setWidth = function(w) {
    this.jQ.css('maxWidth', w + 'px');
    return this;
  }
  _.empty = function() {
    return this.__controller.exportText(this.__options).trim() == '';
  }
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

var EditableField = MathQuill.EditableField = P(AbstractMathQuill, function(_) {
  _.initRootAndEvents = function(root, el, opts) {
    this.initRoot(root, el, opts);
    this.__controller.editable = true;
    this.__controller.editablesTextareaEvents();
  };
  _.focus = function(dir) { 
    //The other hacky unit mode thing.  If the parent element is in unitmode but im not, ignore focus events
    if(!this.__controller.captiveUnitMode && this.__controller.element && this.__controller.element.captiveUnitMode) return this;
    this.jQ.find('.mq-selection').removeClass('mq-selection');
    this.__controller.focus(); 
    if(dir && (dir < 2)) {
      if(this.__controller.units_only || this.__controller.captiveUnitMode) {
        this.moveToDirEnd(R);
        this.keystroke('Left',{preventDefault: function() { } });
        if(dir == L) {
          while(this.__controller.cursor[L]) this.__controller.cursor.insLeftOf(this.__controller.cursor[L]);
        }
      } else
        this.moveToDirEnd(dir);
    } else if(dir) {
      this.__controller.seek(false, dir, 0);
    } else if(this.__controller.cursor.anticursor)
      this.__controller.cursor.select();
    else this.__controller.cursor.show();
    this.scrollToMe(dir);
    return this; 
  };
  _.scrollToMe = function(dir) {
    if(this.jQ && this.__controller.element) {
      var top = this.jQ.position().top;
      var bottom = top + this.jQ.height();
      var to_move_top = Math.min(0, top);
      var to_move_bot = Math.max(0, bottom - this.__controller.element.worksheet.jQ.height()+20);
      if((to_move_bot > 0) && (to_move_top < 0)) {
        if(dir === R)
          this.__controller.element.worksheet.jQ.scrollTop(this.__controller.element.worksheet.jQ.scrollTop() + to_move_bot);
        else
          this.__controller.element.worksheet.jQ.scrollTop(this.__controller.element.worksheet.jQ.scrollTop() + to_move_top);
      } else
        this.__controller.element.worksheet.jQ.scrollTop(this.__controller.element.worksheet.jQ.scrollTop() + to_move_top + to_move_bot);
    }
    return this;
  }
  _.blur = function() { this.__controller.blur(); return this; };
  _.windowBlur = function() { this.__controller.windowBlur(); return this; };
  _.inFocus = function() { return !this.__controller.blurred; };
  _.write = function(latex) {
    this.last_action = 'write: ' + latex;
    if(this.__controller.staticMode) return this;
    if (latex.slice(0,6) === 'latex{' && latex.slice(-1) === '}') 
      latex = latex.slice(6, -1);
    this.__controller.scheduleUndoPoint();
    this.__controller.writeLatex(latex);
    this.__controller.notifyElementOfChange();
    if (this.__controller.blurred) this.__controller.cursor.hide().parent.blur();
    return this;
  };
  _.setExpressionMode = function(val) { 
    this.__controller.API.__options.expression_mode = val;
  }
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
  _.flash = function() {
    this.__controller.cursor.parent.flash();
    return this;
  }
  _.command = function(cmd, option) {
    this.last_action = 'command: ' + cmd;
    if(this.__controller.staticMode) return this;
    // A bit hacky...but if attached element is in 'unitMode', pass the command on to that element
    if(!this.__controller.captiveUnitMode && this.__controller.element && this.__controller.element.unitMode) return this.__controller.element.unitMode.command(cmd, option);

    // Are we in a unit box?  If so, we limit our options
    if(this.__controller.cursor.parent.unit || (this.__controller.cursor.parent.parent && this.__controller.cursor.parent.parent.unit)) {
      var allow = false;
      if(cmd == 'unit') allow = true;
      if(cmd == '\\mu') allow = true;
      if(cmd.match(/^[\/^\(]$/)) allow = true;
      if(!allow) return this.flash();
    }

    // Toolbar command
    switch(cmd) {
      case 'matrix_add_column_before':
      case 'matrix_add_column_after':
        var mat = 0;
        for(mat = this.__controller.cursor; mat !== 0; mat = mat.parent) if(mat instanceof Matrix) break;
        if(!mat) return;
        this.__controller.scheduleUndoPoint();
        mat.insertColumn(this.__controller.cursor, cmd === 'matrix_add_column_before' ? L : R);
        this.__controller.notifyElementOfChange();
        break;
      case 'matrix_add_row_before':
      case 'matrix_add_row_after':
        var mat = 0;
        for(mat = this.__controller.cursor; mat !== 0; mat = mat.parent) if(mat instanceof Matrix) break;
        if(!mat) return;
        this.__controller.scheduleUndoPoint();
        mat.insertRow(this.__controller.cursor, cmd === 'matrix_add_row_before' ? L : R);
        this.__controller.notifyElementOfChange();
        break;
      case 'matrix_remove_column':
        var mat = 0;
        for(mat = this.__controller.cursor; mat !== 0; mat = mat.parent) if(mat instanceof Matrix) break;
        if(!mat) return;
        this.__controller.scheduleUndoPoint();
        mat.deleteColumn(this.__controller.cursor);
        this.__controller.notifyElementOfChange();
        break;
      case 'matrix_remove_row':
        var mat = 0;
        for(mat = this.__controller.cursor; mat !== 0; mat = mat.parent) if(mat instanceof Matrix) break;
        if(!mat) return;
        this.__controller.scheduleUndoPoint();
        mat.deleteRow(this.__controller.cursor);
        this.__controller.notifyElementOfChange();
        break;
      case 'unit':
        var unit = 0;
        var leave_unit = false;
        var blur_me = false;
        if(this.__controller.blurred) {
          blur_me = true; 
          this.focus();
        }
        for(unit = this.__controller.cursor; unit !== 0; unit = unit.parent) if(unit instanceof Unit) break;
        if(!unit) {
          var to_replace = this.__controller.cursor.show().replaceSelection();
          unit = Unit();
          if(to_replace) unit.replaces(to_replace);
          unit.createLeftOf(this.__controller.cursor);
          leave_unit = true;
        }
        this.typedText(option);
        this.__controller.closePopup();
        if(leave_unit) {
          this.__controller.cursor.insRightOf(unit);
          this.__controller.cursor.workingGroupChange();
        }
        this.__controller.notifyElementOfChange();
        if(blur_me) this.blur();
        break;
      case 'textMode':
        if((this.text().trim() == '') && this.__controller.element.changeToText)
          this.__controller.element.changeToText('');
        else 
          this.__controller.element.AppendText();
        break;
      case 'command':
        for(var i = 0; i < option.length; i++)
          this.typedText(option[i]);
        break;
      default:
        this.cmd(cmd);
    }
  }
  _.cmd = function(cmd) {
    this.last_action = 'cmd: ' + cmd;
    var ctrlr = this.__controller.notify(), cursor = ctrlr.cursor.show();
    if (/^\\[a-z]+$/i.test(cmd)) {
      cmd = cmd.slice(1);
      var klass = LatexCmds[cmd];
      if (klass) {
        cmd = klass(cmd);
        this.__controller.scheduleUndoPoint();
        if (cursor.selection) cmd.replaces(cursor.replaceSelection());
        cmd.createLeftOf(cursor);
        this.__controller.notifyElementOfChange();
        this.__controller.removeGhost();
      }
      else /* TODO: API needs better error reporting */;
    }
    else {
      this.__controller.scheduleUndoPoint();
      cursor.parent.write(cursor, cmd, cursor.replaceSelection());
    }
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
    this.__controller.setUndoPoint();
    this.__controller.cursor.clearSelection();
    this.__controller.notifyElementOfChange();
    return this;
  };
  _.getSelection = function() {
    if (this.__controller.cursor.selection) 
      return this.__controller.cursor.selection.join('latex');
    return '';
  }
  _.clear = function() {
    this.select();
    this.typedText('0'); // If we dont do it this way, we could be highlighting nothing and then backspacing out of the element, removing it
    this.__controller.backspace();
    this.__controller.notifyElementOfChange();
    return this;
  }
  _.hideCursor = function() {
    this.__controller.cursor.hide();
    this.__controller.cursor.workingGroupChange();
    this.__controller.root.jQ.find('.mq-active').removeClass('mq-active');
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
    this.last_action = 'keystroke: ' + key;
    if(this.__controller.staticMode) return this;
    this.__controller.keystroke(key, evt);
    return this;
  };
  _.typedText = function(text) {
    this.last_action = 'typedText: ' + text;
    if(this.__controller.staticMode) return this;
    this.__controller.scheduleUndoPoint();
    this.__controller.notifyElementOfChange();
    for (var i = 0; i < text.length; i += 1) this.__controller.typedText(text.charAt(i));
    return this;
  };
  _.cut = function(e) { 
    if(this.__controller.staticMode) {
      this.copy(e);
    } else {
      this.__controller.setUndoPoint();
      this.__controller.cut(e); 
      this.__controller.notifyElementOfChange(); 
    }
    return this; 
  }
  _.setGhost = function(text) {
    this.__controller.root.jQ.attr('data-ghost', text); 
    return this;
  }
  _.copy = function(e) { this.__controller.copy(e); return this; }
  _.paste = function(text) { 
    this.last_action = 'paste: ' + text;
    if(this.__controller.staticMode) return this;
    this.__controller.setUndoPoint();
    this.__controller.paste(text); 
    this.__controller.closePopup(); 
    return this; 
  }
  _.closePopup = function() {
    this.__controller.closePopup();
    return this;
  }
  _.contextMenu = function(e) {
    return this.__controller.contextMenu(e);
  }
  _.cursorX = function() {
    if(this.__controller.cursor.jQ && this.__controller.cursor.jQ.offset()) return this.__controller.cursor.jQ.offset().left;
    return undefined;
  }
  _.mouseDown = function(e) {
    this.last_action = 'mouseDown';
    this.__controller.mouseDown(e);
  }
  _.mouseMove = function(e) {
    this.last_action = 'mouseMove';
    this.__controller.mouseMove(e);
  }
  _.mouseUp = function(e) {
    this.last_action = 'mouseUp';
    this.__controller.mouseUp(e);
  }
  _.mouseOut = function(e) {
    this.last_action = 'mouseOut';
    this.__controller.mouseOut(e);
  }
  // Undo/Redo manager API points
  _.restoreState = function(d) {
    this.last_action = 'restoreState';
    this.__controller.restoreState(d);
  }
  _.currentState = function() {
    this.last_action = 'currentState';
    return this.__controller.currentState();
  }
});

function RootBlockMixin(_) {
  var names = 'moveOutOf deleteOutOf selectOutOf upOutOf downOutOf reflow'.split(' ');
  for (var i = 0; i < names.length; i += 1) (function(name) {
    _[name] = function(dir) { this.controller.handle(name, dir); };
  }(names[i]));
}
