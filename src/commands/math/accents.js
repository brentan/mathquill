
var Accent = P(MathCommand, function(_, super_) {
  _.init = function(ctrlSeq, htmlcode, klass) {
    this.klass = klass;
    this.htmlcode = htmlcode;
    var htmlTemplate =
      '<span class="mq-non-leaf ' + klass + '">'
    +   '<span class="mq-vector-prefix">'+htmlcode+'</span>'
    +   '<span class="mq-vector-stem">&0</span>'
    + '</span>'
    super_.init.call(this, ctrlSeq, htmlTemplate);
  }
  _.textOutput = function(opts) {
    return [{text: this.ends[L].text(opts), obj:this.ends[L]}, {text:'~'}, {text:this.ctrlSeq.replace(/\\over/,''), obj:this}, {text:'~'}];
  }
  _.fullWord = function() {
    if(!this.controller) this.getController();
    return this.controller.findFullWord(this);
  };
  _.autoUnItalicize = function(cursor) {
    if(!this.controller) this.getController();
    return this.controller.autoUnItalicize(this, cursor);
  };
  _.removeFlorin = function() {
    for(var node = this.blocks[0].ends[L]; node !== 0; node = node[R]) {
      if(node instanceof Accent) node.removeFlorin();
      else if(node.ctrlSeq === 'f') node.jQ.removeClass('mq-florin').html('f');
    }
  }
  _.autoComplete = function() {
    if(this.ends[R].ends[R] instanceof Variable) this.ends[R].ends[R].autoComplete();
  }
  _.finalizeTree = function() {
    this.ends[L].write = function(cursor, ch, replacedFragment) {
      var check_auto = false;
      if (ch.match(/^[a-z0-9]$/i))
        cmd = Letter(ch); 
      else {
        if(cursor[L] && cursor[R]) return this.flash();
        else if(cursor[L]) cursor.insRightOf(this.parent);
        else cursor.insLeftOf(this.parent);
        return cursor.parent.write(cursor, ch, replacedFragment);
      }
      if (replacedFragment) cmd.replaces(replacedFragment);
      cmd.createLeftOf(cursor);
    };
  }
  _.createLeftOf = function(cursor) {
    if (this.replacedFragment) {
      // We never actually overwrite the fragment, so put it back in place
      this.replacedFragment.adopt(cursor.parent, cursor[L], cursor[R]);
      this.replacedFragment.jQ.insertAfter(cursor.jQ);
      cursor.insLeftOf(this.replacedFragment.ends[L]);
    }
    if(cursor.parent && (cursor.parent.parent instanceof SupSub) && (cursor.parent.parent.supsub == 'sub')) {
      //I'm in a subscript...so bubble this up a level
      cursor.insLeftOf(cursor.parent.parent);
      return this.createLeftOf(cursor);
    }/*
    if(cursor.parent && (cursor.parent.parent instanceof Accent)) {
      //I'm in another symbol decoration...replace it
      var el = cursor.parent.parent;
      el.ctrlSeq = this.ctrlSeq;
      el.klass = this.klass;
      el.htmlcode = this.htmlcode;
      el.jQ.removeClass().addClass("mq-non-leaf").addClass(this.klass);
      el.jQ.children("mq-vector-prefix").html(this.htmlcode);
      return;
    }*/
    if(this.replacedFragment) {
      var all_letters = true;
      var remove_last = false;
      for(el = this.replacedFragment.ends[L]; el != this.replacedFragment.ends[R]; el = el[R]) {
        if(!(el instanceof Variable || el instanceof Accent)) all_letters = false;
      }
      if(all_letters) {
        if(((el instanceof SupSub) && (el.supsub == 'sub')) || (el instanceof Variable) || (el instanceof Accent)) {
          this.replacedFragment = false;
          // We just call it again so that we correctly place the item over the whole word
          return this.createLeftOf(cursor);
        }
      }
      cursor.startSelection();
      cursor.insRightOf(this.replacedFragment.ends[R]);
      cursor.select();
      if(this.replacedFragment.ends[R] instanceof NumberSymbol) this.replacedFragment.ends[R].redrawComma();
      else if(this.replacedFragment.ends[L] instanceof NumberSymbol) this.replacedFragment.ends[L].redrawComma();
      return showNotice("Variable decorations only valid on variable names","red");
    }
    if(cursor[L] instanceof Variable || (cursor[L] instanceof SupSub && cursor[L].supsub=='sub') || cursor[L] instanceof Accent || cursor[R] instanceof Variable || cursor[R] instanceof Accent) {
      var target = cursor[L];
      var insRightOf = target;
      var insLeftOf = false;
      if(target instanceof SupSub && target.supsub == 'sub') 
        target = target[L];
      if(!(target instanceof Variable || target instanceof Accent)) {
        target = cursor[R];
        insRightOf = false;
        insLeftOf = target;
      }
      for(var startL = target;startL[L] instanceof Variable || startL[L] instanceof Accent;startL = startL[L]);
      for(var startR = target;startR[R] instanceof Variable || startR[R] instanceof Accent;startR = startR[R]);
      cursor.insLeftOf(startL);
      cursor.startSelection();
      cursor.insRightOf(startR);
      cursor.select();
      this.replaces(cursor.replaceSelection());
      // Not sure why I have to do this, but need to re-attach cursor jQ to make things appear
      cursor.show();
      super_.createLeftOf.call(this, cursor);
      if(insRightOf) cursor.insRightOf(insRightOf);
      else if(insLeftOf) cursor.insLeftOf(insLeftOf);
      return cursor.workingGroupChange();
    }
    return showNotice("Variable decorations only valid on variable names","red");
  };
});

var symbolNames = "vdeftbchs".split("");
for(var i = 0; i < symbolNames.length; i++)
  LatexCmds["over" + symbolNames[i]] = bind(Accent, "\\over"+symbolNames[i], accentCodes(symbolNames[i]),'');


var AccentCommandInput =
CharCmds['~'] = P(MathCommand, function(_, super_) {
  _.ctrlSeq = '~';
  _.replaces = function(replacedFragment) {
    this._replacedFragment = replacedFragment.disown();
    this.isEmpty = function() { return false; };
  };
  _.htmlTemplate = '<span class="mq-latex-command-input mq-non-leaf">~<span>&0</span></span>';
  _.textTemplate = [''];
  _.createBlocks = function() {
    super_.createBlocks.call(this);
    this.ends[L].focus = function() {
      this.parent.jQ.addClass('mq-hasCursor');
      this.jQ.removeClass('mq-empty');
      this.parent.ends[L].blur = function() {
        this.parent.ends[L].focus = function() { };
        this.parent.ends[L].blur = function() { };
        this.parent.dropCommand(false);
      }
      return this;
    };
    this.ends[L].write = function(cursor, ch, replacedFragment) {
      if (replacedFragment) replacedFragment.remove();
      if (ch.match(/[a-z]/i)) VanillaSymbol(ch).createLeftOf(cursor);
      else {
        this.parent.renderCommand();
        if (ch !== '~' || !this.isEmpty()) this.parent.parent.write(cursor, ch);
      }
    };
    this.ends[L].keystroke = function(key, e, ctrlr) {
      if (key === 'Tab' || key === 'Enter' || key === 'Spacebar') {
        this.parent.renderCommand();
        e.preventDefault();
        return;
      }
      return super_.keystroke.apply(this, arguments);
    };
  };
  _.createLeftOf = function(cursor) {
    super_.createLeftOf.call(this, cursor);
    if (this._replacedFragment) {
      var el = this.jQ[0];
      this.jQ = this._replacedFragment.jQ.addClass('mq-blur').insertBefore(this.jQ).add(this.jQ);
    }
  };
  _.latex = function() {
    return '';
  };
  _.textOutput = function(opts) {
    return [{text: ''}];
  }
  _.renderCommand = function() {
    this.ends[L].focus = function() { };
    this.ends[L].blur = function() { };
    if(!this.controller) this.getController();
    cursor = this.controller.cursor;
    var latex = this.ends[L].latex().trim();
    if (!latex) latex = ' ';
    switch(latex) {
      case 'vec':
      case 'vector':
        latex = 'v';
        break;
      case 'dot':
        latex = 'd';
        break;
      case 'ddot':
        latex = 'e';
        break;
      case 'tdot':
        latex = 'f';
        break;
      case 'tilde':
        latex = 't';
        break;
      case 'bar':
        latex = 'b';
        break;
      case 'check':
        latex = 'c';
        break;
      case 'hat':
        latex = 'h';
        break;
      case 'star':
        latex = 's';
        break;
    }
    if(latex.match(/^[a-z]$/)) {
      var cmd = LatexCmds["over" + latex];
      if (cmd) {
        this.jQ = this.jQ.last();
        this.remove();
        cmd = cmd();
        if (this._replacedFragment) cmd.replaces(this._replacedFragment);
        if (this[R]) {
          cursor.insLeftOf(this[R]);
        } else {
          cursor.insAtRightEnd(this.parent);
        }
        cmd.createLeftOf(cursor);
        cursor.workingGroupChange();
        return;
      }
    }
    showNotice("Unrecognized accent code","red");
    this.dropCommand(true);
  }
  _.dropCommand = function(place_cursor) {
    if(!this.controller) this.getController();
    cursor = this.controller.cursor;
    this.jQ = this.jQ.last();
    this.remove();
    if (this._replacedFragment) {
      // We never actually overwrite the fragment, so put it back in place
      this._replacedFragment.adopt(this.parent, this[L], this[R]);
      if (this[R]) 
        this._replacedFragment.jQ.insertBefore(this[R].jQ).removeClass('mq-blur');
      else
        this._replacedFragment.jQ.appendTo(this.parent.jQ).removeClass('mq-blur');
      if(place_cursor) {
        cursor.insLeftOf(this._replacedFragment.ends[L]);
        cursor.startSelection();
        cursor.insRightOf(this._replacedFragment.ends[R]);
        if(this._replacedFragment.ends[R] instanceof NumberSymbol) this._replacedFragment.ends[R].redrawComma();
        else if(this._replacedFragment.ends[L] instanceof NumberSymbol) this._replacedFragment.ends[L].redrawComma();
        cursor.select();
        cursor.workingGroupChange();
      }
    } else if(place_cursor) {
      if (this[R]) {
        cursor.insLeftOf(this[R]);
      } else {
        cursor.insAtRightEnd(this.parent);
      }
      cursor.workingGroupChange();
    }
  };
});

