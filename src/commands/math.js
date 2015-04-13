/*************************************************
 * Abstract classes of math blocks and commands.
 ************************************************/

/**
 * Math tree node base class.
 * Some math-tree-specific extensions to Node.
 * Both MathBlock's and MathCommand's descend from it.
 */
var MathElement = P(Node, function(_, super_) {
  _.finalizeInsert = function(options, cursor) { // `cursor` param is only for
      // SupSub::contactWeld, and is deliberately only passed in by writeLatex,
      // see ea7307eb4fac77c149a11ffdf9a831df85247693
    var self = this;
    self.postOrder('finalizeTree', options);
    self.postOrder('contactWeld', cursor);

    // note: this order is important.
    // empty elements need the empty box provided by blur to
    // be present in order for their dimensions to be measured
    // correctly by 'reflow' handlers.
    self.postOrder('blur');

    self.postOrder('reflow');
    if (self[R].siblingCreated) self[R].siblingCreated(options, L);
    if (self[L].siblingCreated) self[L].siblingCreated(options, R);
    self.bubble('reflow');
  };
  _.contextMenu = function(cursor, event) {
    // Default context menu to call.  
    // BRENTAN: Need to make this do something, especially if you have some stuff selected (expand/factor/simplify would be good base options?  Evaluate?)
    // This will likely need to be a passed in handler since evaluation etc lives outside the scope of mathquill
  }
});

/**
 * Commands and operators, like subscripts, exponents, or fractions.
 * Descendant commands are organized into blocks.
 */
var MathCommand = P(MathElement, function(_, super_) {
  _.init = function(ctrlSeq, htmlTemplate, textTemplate) {
    var cmd = this;
    super_.init.call(cmd);

    if (!cmd.ctrlSeq) cmd.ctrlSeq = ctrlSeq;
    if (htmlTemplate) cmd.htmlTemplate = htmlTemplate;
    if (textTemplate) cmd.textTemplate = textTemplate;
  };

  // obvious methods
  _.replaces = function(replacedFragment) {
    replacedFragment.disown();
    this.replacedFragment = replacedFragment;
  };
  _.isEmpty = function() {
    return this.foldChildren(true, function(isEmpty, child) {
      return isEmpty && child.isEmpty();
    });
  };

  _.parser = function() {
    var block = latexMathParser.block;
    var self = this;

    return block.times(self.numBlocks()).map(function(blocks) {
      self.blocks = blocks;
      for (var i = 0; i < blocks.length; i += 1) {
        blocks[i].adopt(self, self.ends[R], 0);
      }

      return self;
    });
  };

  // createLeftOf(cursor) and the methods it calls
  _.createLeftOf = function(cursor) {
    var cmd = this;

    if(!(this instanceof Variable) && (this.supsub !== 'sub'))
      cursor.container.children('.mq-popup').remove();

    // Test for matrix specific commands
    if((typeof cursor.parent !== 'undefined') &&
        (cursor.parent.parent instanceof Matrix)) {
      if(cmd.ctrlSeq == ',')
        return cursor.parent.parent.moveOrInsertColumn(cursor);
      else if(cmd.ctrlSeq == ';')
        return cursor.parent.parent.insertRow(cursor);
      else if(cmd.ctrlSeq == ':')
        return cursor.parent.parent.deleteRow(cursor);
      else if(cmd.ctrlSeq == '<')
        return cursor.parent.parent.deleteColumn(cursor);
      else if(cmd.ctrlSeq == '>')
        return cursor.parent.parent.insertColumn(cursor);
    } // Similar to matrix commands, see if we are in square brackets and have added a comma (new column command!).  Transform into Matrix 
    else if((typeof cursor.parent !== 'undefined') &&
        (cursor.parent.parent instanceof Bracket) &&
        (cursor.parent.parent.ctrlSeq === '\\left[') && 
        ((cmd.ctrlSeq == ',') || (cmd.ctrlSeq == ';'))) {
      var bracket = cursor.parent.parent
      //Move the cursor
      if(bracket[L] !== 0)
        cursor.insRightOf(bracket[L]);
      else
        cursor.insAtLeftEnd(bracket.parent);
      //Insert the Matrix at this position
      var new_mat = Matrix('\\bmatrix',1,1);
      new_mat.createLeftOf(cursor);
      //Move what was in the brackets into the new matrix
      bracket.ends[L].children().disown().adopt(new_mat.ends[L], 0, 0).jQ.appendTo(new_mat.ends[L].jQ);
      bracket.remove();
      if(cmd.ctrlSeq == ',')
        return new_mat.insertColumn(cursor);
      else
        return new_mat.insertRow(cursor);
    }

    var replacedFragment = cmd.replacedFragment;

    cmd.createBlocks();
    super_.createLeftOf.call(cmd, cursor);
    if (replacedFragment) {
      replacedFragment.adopt(cmd.ends[L], 0, 0);
      replacedFragment.jQ.appendTo(cmd.ends[L].jQ);
    }
    cmd.finalizeInsert(cursor.options);
    cmd.placeCursor(cursor);
    if((this instanceof BinaryOperator) ||
        (this instanceof Fraction) ||
        (this instanceof SupSub) ||
        (this instanceof SquareRoot))
      cursor.workingGroupChange();
  };
  _.createBlocks = function() {
    var cmd = this,
      numBlocks = cmd.numBlocks(),
      blocks = cmd.blocks = Array(numBlocks);

    for (var i = 0; i < numBlocks; i += 1) {
      var newBlock = blocks[i] = MathBlock();
      newBlock.adopt(cmd, cmd.ends[R], 0);
    }
  };
  _.placeCursor = function(cursor) {
    //insert the cursor at the right end of the first empty child, searching
    //left-to-right, or if none empty, the right end child
    cursor.insAtRightEnd(this.foldChildren(this.ends[L], function(leftward, child) {
      return leftward.isEmpty() ? leftward : child;
    }));
  };

  // editability methods: called by the cursor for editing, cursor movements,
  // and selection of the MathQuill tree, these all take in a direction and
  // the cursor
  _.moveTowards = function(dir, cursor, updown) {
    var updownInto = updown && this[updown+'Into'];
    cursor.insAtDirEnd(-dir, updownInto || this.ends[-dir]);
  };
  _.deleteTowards = function(dir, cursor) {
    cursor.startSelection();
    this.selectTowards(dir, cursor);
    cursor.select();
  };
  _.selectTowards = function(dir, cursor) {
    cursor[-dir] = this;
    cursor[dir] = this[dir];
  };
  _.selectChildren = function() {
    return Selection(this, this);
  };
  _.unselectInto = function(dir, cursor) {
    cursor.insAtDirEnd(-dir, cursor.anticursor.ancestors[this.id]);
  };
  _.seek = function(pageX, cursor) {
    function getBounds(node) {
      var bounds = {}
      bounds[L] = node.jQ.offset().left;
      bounds[R] = bounds[L] + node.jQ.outerWidth();
      return bounds;
    }

    var cmd = this;
    var cmdBounds = getBounds(cmd);

    if (pageX < cmdBounds[L]) return cursor.insLeftOf(cmd);
    if (pageX > cmdBounds[R]) return cursor.insRightOf(cmd);

    var leftLeftBound = cmdBounds[L];
    cmd.eachChild(function(block) {
      var blockBounds = getBounds(block);
      if (pageX < blockBounds[L]) {
        // closer to this block's left bound, or the bound left of that?
        if (pageX - leftLeftBound < blockBounds[L] - pageX) {
          if (block[L]) cursor.insAtRightEnd(block[L]);
          else cursor.insLeftOf(cmd);
        }
        else cursor.insAtLeftEnd(block);
        return false;
      }
      else if (pageX > blockBounds[R]) {
        if (block[R]) leftLeftBound = blockBounds[R]; // continue to next block
        else { // last (rightmost) block
          // closer to this block's right bound, or the cmd's right bound?
          if (cmdBounds[R] - pageX < pageX - blockBounds[R]) {
            cursor.insRightOf(cmd);
          }
          else cursor.insAtRightEnd(block);
        }
      }
      else {
        block.seek(pageX, cursor);
        return false;
      }
    });
  }

  // methods involved in creating and cross-linking with HTML DOM nodes
  /*
    They all expect an .htmlTemplate like
      '<span>&0</span>'
    or
      '<span><span>&0</span><span>&1</span></span>'

    See html.test.js for more examples.

    Requirements:
    - For each block of the command, there must be exactly one "block content
      marker" of the form '&<number>' where <number> is the 0-based index of the
      block. (Like the LaTeX \newcommand syntax, but with a 0-based rather than
      1-based index, because JavaScript because C because Dijkstra.)
    - The block content marker must be the sole contents of the containing
      element, there can't even be surrounding whitespace, or else we can't
      guarantee sticking to within the bounds of the block content marker when
      mucking with the HTML DOM.
    - The HTML not only must be well-formed HTML (of course), but also must
      conform to the XHTML requirements on tags, specifically all tags must
      either be self-closing (like '<br/>') or come in matching pairs.
      Close tags are never optional.

    Note that &<number> isn't well-formed HTML; if you wanted a literal '&123',
    your HTML template would have to have '&amp;123'.
  */
  _.numBlocks = function() {
    var matches = this.htmlTemplate.match(/&\d+/g);
    return matches ? matches.length : 0;
  };
  _.html = function() {
    // Render the entire math subtree rooted at this command, as HTML.
    // Expects .createBlocks() to have been called already, since it uses the
    // .blocks array of child blocks.
    //
    // See html.test.js for example templates and intended outputs.
    //
    // Given an .htmlTemplate as described above,
    // - insert the mathquill-command-id attribute into all top-level tags,
    //   which will be used to set this.jQ in .jQize().
    //   This is straightforward:
    //     * tokenize into tags and non-tags
    //     * loop through top-level tokens:
    //         * add #cmdId attribute macro to top-level self-closing tags
    //         * else add #cmdId attribute macro to top-level open tags
    //             * skip the matching top-level close tag and all tag pairs
    //               in between
    // - for each block content marker,
    //     + replace it with the contents of the corresponding block,
    //       rendered as HTML
    //     + insert the mathquill-block-id attribute into the containing tag
    //   This is even easier, a quick regex replace, since block tags cannot
    //   contain anything besides the block content marker.
    //
    // Two notes:
    // - The outermost loop through top-level tokens should never encounter any
    //   top-level close tags, because we should have first encountered a
    //   matching top-level open tag, all inner tags should have appeared in
    //   matching pairs and been skipped, and then we should have skipped the
    //   close tag in question.
    // - All open tags should have matching close tags, which means our inner
    //   loop should always encounter a close tag and drop nesting to 0. If
    //   a close tag is missing, the loop will continue until i >= tokens.length
    //   and token becomes undefined. This will not infinite loop, even in
    //   production without pray(), because it will then TypeError on .slice().

    var cmd = this;
    var blocks = cmd.blocks;
    var cmdId = ' mathquill-command-id=' + cmd.id;
    var tokens = cmd.htmlTemplate.match(/<[^<>]+>|[^<>]+/g);

    pray('no unmatched angle brackets', tokens.join('') === this.htmlTemplate);

    // add cmdId to all top-level tags
    for (var i = 0, token = tokens[0]; token; i += 1, token = tokens[i]) {
      // top-level self-closing tags
      if (token.slice(-2) === '/>') {
        tokens[i] = token.slice(0,-2) + cmdId + '/>';
      }
      // top-level open tags
      else if (token.charAt(0) === '<') {
        pray('not an unmatched top-level close tag', token.charAt(1) !== '/');

        tokens[i] = token.slice(0,-1) + cmdId + '>';

        // skip matching top-level close tag and all tag pairs in between
        var nesting = 1;
        do {
          i += 1, token = tokens[i];
          pray('no missing close tags', token);
          // close tags
          if (token.slice(0,2) === '</') {
            nesting -= 1;
          }
          // non-self-closing open tags
          else if (token.charAt(0) === '<' && token.slice(-2) !== '/>') {
            nesting += 1;
          }
        } while (nesting > 0);
      }
    }
    return tokens.join('').replace(/>&(\d+)/g, function($0, $1) {
      return ' mathquill-block-id=' + blocks[$1].id + '>' + blocks[$1].join('html');
    });
  };

  // methods to export a string representation of the math tree
  _.latex = function() {
    return this.foldChildren(this.ctrlSeq, function(latex, child) {
      return latex + '{' + (child.latex() || ' ') + '}';
    });
  };
  _.textTemplate = [''];
  _.text = function(opts) {
    var cmd = this, i = 0;
    return cmd.foldChildren(cmd.textTemplate[i], function(text, child) {
      i += 1;
      var child_text = child.text(opts);
      if (text && cmd.textTemplate[i] === '('
          && child_text[0] === '(' && child_text.slice(-1) === ')')
        return text + child_text.slice(1, -1) + cmd.textTemplate[i];
      return text + child.text(opts) + (cmd.textTemplate[i] || '');
    });
  };
  _.setUnit = function() {
    // determine if I'm in a unit, and do the same to all my children
    if(this.parent.unit) {
      this.unit = this.parent.unit;
      if((this.parent instanceof SupSub) || (this.parent.unitsup)) this.unitsup = true;
    }
    if(this.parent.parent && this.parent.parent.unit) {
      this.unit = this.parent.parent.unit;
      if((this.parent.parent instanceof SupSub) || (this.parent.parent.unitsup)) this.unitsup = true;
    }
  }
  _.recursiveSetUnit = function() {
    this.setUnit();
    this.eachChild(function (child) { if(child.recursiveSetUnit) child.recursiveSetUnit(); });
  };
});

/**
 * Lightweight command without blocks or children.
 */
var Symbol = P(MathCommand, function(_, super_) {
  _.init = function(ctrlSeq, html, text) {
    if (!text) text = (ctrlSeq && ctrlSeq.length > 1 ? ctrlSeq.slice(1) : ctrlSeq).trim();

    super_.init.call(this, ctrlSeq, html, [ text ]);
  };

  _.parser = function() { return Parser.succeed(this); };
  _.numBlocks = function() { return 0; };

  _.replaces = function(replacedFragment) {
    replacedFragment.remove();
  };
  _.createBlocks = noop;

  _.moveTowards = function(dir, cursor) {
    cursor.jQ.insDirOf(dir, this.jQ);
    cursor[-dir] = this;
    cursor[dir] = this[dir];
  };
  _.deleteTowards = function(dir, cursor) {
    cursor[dir] = this.remove()[dir];
  };
  _.seek = function(pageX, cursor) {
    // insert at whichever side the click was closer to
    if (pageX - this.jQ.offset().left < this.jQ.outerWidth()/2)
      cursor.insLeftOf(this);
    else
      cursor.insRightOf(this);
  };

  _.latex = function(){ return this.ctrlSeq; };
  _.text = function(){ return this.textTemplate; };
  _.placeCursor = noop;
  _.isEmpty = function(){ return true; };
});
var VanillaSymbol = P(Symbol, function(_, super_) {
  _.init = function(ch, html, textTemplate) {
    super_.init.call(this, ch, '<span>'+(html || ch)+'</span>', (textTemplate || ch));
  };
  _.createLeftOf = function(cursor) {
    if(this.ctrlSeq === '.') {
      if((cursor[L] === 0 ) || (cursor[L] instanceof BinaryOperator)) //Implicit multiplication will take care of other cases and 'make' cursor[L] a binaryoperator
        VanillaSymbol('0').createLeftOf(cursor);
      else if((cursor[L] !== 0) && (cursor[L].ctrlSeq === '.')) {// ellipses
        cursor[L].ctrlSeq = '…';
        cursor[L].jQ.html('<span class="mq-nonSymbola" style="font-size:0.6em;">&#8230;</span>');
        cursor[L].textTemplate = '..';
        return;
      } 
    }
    super_.createLeftOf.call(this, cursor);
  }
});
var BinaryOperator = P(Symbol, function(_, super_) {
  _.init = function(ctrlSeq, html, text) {
    super_.init.call(this,
      ctrlSeq, '<span class="mq-binary-operator">'+html+'</span>', text
    );
  };
});
/**
 * Children and parent of MathCommand's. Basically partitions all the
 * symbols and operators that descend (in the Math DOM tree) from
 * ancestor operators.
 */
var MathBlock = P(MathElement, function(_, super_) {
  _.join = function(methodName) {
    return this.foldChildren('', function(fold, child) {
      return fold + child[methodName]();
    });
  };
  _.html = function() { return this.join('html'); };
  _.latex = function() { return this.join('latex'); };
  _.text = function(opts) {
    if ((this.ends[L] === 0) && (this.ends[R] === 0)) return '';
    return this.ends[L] === this.ends[R] ?
      this.ends[L].text(opts) :
      this.foldChildren('', function(text, child) {
        return text + child.text(opts);
      })
    ;
  };

  _.keystroke = function(key, e, ctrlr) {
    if (ctrlr.API.__options.spaceBehavesLikeTab
        && (key === 'Spacebar' || key === 'Shift-Spacebar')) {
      var el = ctrlr.container.children('.mq-popup');
      if(el.length > 0) {
        //Find the element that is currently selected
        el.find('li.mq-popup-selected').click();
      } else {
        var cursor = ctrlr.cursor;
        // Test for autocommands 
        if(cursor[L] instanceof Letter)
          cursor[L].autoOperator(cursor);
        ctrlr.escapeDir(key === 'Shift-Spacebar' ? L : R, key, e);
      }
      e.preventDefault();
      return;
    } else if(key === 'Tab') {
      // Test for autocommands 
      var cursor = ctrlr.cursor;
      if(cursor[L] instanceof Letter)
        cursor[L].autoOperator(cursor);
    } else if((key === 'Backspace') || (key === 'Del')) {
      var out = super_.keystroke.apply(this, arguments);
      var cursor = ctrlr.cursor;
      if(cursor[L] && (cursor[L] instanceof Variable))
        cursor[L].autoComplete();
      else if((cursor[L] === 0) && cursor.parent && (cursor.parent.parent instanceof SupSub) && (cursor.parent.parent.supsub === 'sub') && cursor.parent.parent[L])
        cursor.parent.parent[L].autoComplete();
      else
        ctrlr.closePopup();
      return out;
    }
    return super_.keystroke.apply(this, arguments);
  };

  // editability methods: called by the cursor for editing, cursor movements,
  // and selection of the MathQuill tree, these all take in a direction and
  // the cursor
  _.moveOutOf = function(dir, cursor, updown) {
    var updownInto = updown && this.parent[updown+'Into'];
    if (!updownInto && this[dir]) cursor.insAtDirEnd(-dir, this[dir]);
    else cursor.insDirOf(dir, this.parent);
  };
  _.selectOutOf = function(dir, cursor) {
    cursor.insDirOf(dir, this.parent);
  };
  _.deleteOutOf = function(dir, cursor) {
    cursor.unwrapGramp();
  };
  _.seek = function(pageX, cursor) {
    var node = this.ends[R];
    if (!node || node.jQ.offset().left + node.jQ.outerWidth() < pageX) {
      return cursor.insAtRightEnd(this);
    }
    if (pageX < this.ends[L].jQ.offset().left) return cursor.insAtLeftEnd(this);
    while (pageX < node.jQ.offset().left) node = node[L];
    return node.seek(pageX, cursor);
  };
  _.flash = function() {
    var el = this.jQ.closest('.mq-root-block');
    el.css('background-color','#ffe0e0');
    window.setTimeout(function() { el.css('background-color','#ffffff'); }, 100);
  }
  _.write = function(cursor, ch, replacedFragment) {
    var cmd;
    if (ch.match(/^[a-eg-zA-Z]$/)) //exclude f because want florin
      cmd = Letter(ch);
    else if(ch.match(/^[0-9\+\-]$/) && (cursor[L] instanceof Variable) && (cursor[L].ctrlSeq === 'e') && (cursor[L][L] !== 0) && (typeof cursor[L][L] !== 'undefined') && cursor[L][L].ctrlSeq.match(/^[0-9]$/)) // this should match scientific notation
      cmd = ScientificNotation(ch);
    else if(ch.match(/^[0-9\+\-]$/) && (cursor[L] instanceof Variable) && (cursor[L].ctrlSeq === 'e') && (cursor[L][L] !== 0) && (cursor[L][L].ctrlSeq === '\\cdot ') && (cursor[L][L][L] !== 0) && (typeof cursor[L][L][L] !== 'undefined') && cursor[L][L][L].ctrlSeq.match(/^[0-9]$/)) {// this should match scientific notation
      cursor[L][L].remove(); // Remove the implicit multiplication
      cmd = ScientificNotation(ch);
    } else if(ch.match(/^[0-9\.]$/) && !(cursor.parent && cursor.parent.unit) && !(cursor.parent && cursor.parent.parent && cursor.parent.parent.unit) && ((cursor[L] instanceof Variable) || (cursor.parent && (cursor.parent.parent instanceof SupSub) && (cursor.parent.parent.supsub === 'sub')))) // Numbers after letters are 'letters' as they are part of a var name
      cmd = Letter(ch);
    else if (cmd = CharCmds[ch] || LatexCmds[ch])
      cmd = cmd(ch);
    else
      cmd = VanillaSymbol(ch);

    // Units...if we are in a unit box, drastically reduce what we are allowed to type (other things will push us out of the box)
    if(cursor.parent && cursor.parent.parent && cursor.parent.parent.unitsup) {
      // We are in a deep fraction in a unit
      if(!ch.match(/^[0-9\.\+\-\*\^\/\(\)]$/)) { if (replacedFragment) replacedFragment.remove(); this.flash(); return; }
    } else if(cursor.parent && cursor.parent.parent && cursor.parent.parent.unit) {
      // We are in a supsub or first level fraction
      if(cursor.parent.parent instanceof SupSub) {
        if(!ch.match(/^[0-9\.\+\-\*\^\/\(\)]$/)) { if (replacedFragment) replacedFragment.remove(); this.flash(); return; }
        else if(((ch === '/') || (ch === '^')) && !(cursor[L] instanceof VanillaSymbol) && !(cursor[L] instanceof Variable)) { if (replacedFragment) replacedFragment.remove(); this.flash(); return; }
      } else {
        if(!ch.match(/^[a-zµ2\^\*\/\(\)]$/i)) { if (replacedFragment) replacedFragment.remove(); this.flash(); return; }
        else if(((ch === '/') || (ch === '^')) && !(cursor[L] instanceof VanillaSymbol) && !(cursor[L] instanceof Variable)) { if (replacedFragment) replacedFragment.remove(); this.flash(); return; }
      }
    } 

    if (replacedFragment) cmd.replaces(replacedFragment);

    // Test for autocommands 
    if(!(cmd instanceof Variable) && (cursor[L] instanceof Letter)) {
      if(cursor[L].autoOperator(cursor) && (cmd instanceof Bracket) && (cmd.side === L))
        return;
    }

    // Only allow variables (letters basically) in a operatorname
    if(cursor.parent && (cursor.parent.parent instanceof OperatorName) && (cursor.parent === cursor.parent.parent.ends[L])) {
      if(!((cmd instanceof Variable) || ((ch === '_') && cursor[R] === 0))) return this.flash(); 
      if((cursor[L] instanceof SupSub) || ((ch === '_') && cursor[L] === 0)) return this.flash(); 
    }

    // Test for implicit multiplication
    if(((cmd instanceof Variable) || (cmd instanceof Currency)) && ((cursor[L] instanceof VanillaSymbol) || (cursor[L] instanceof Unit) || (cursor[L] instanceof Currency)) && !cursor[L].ctrlSeq.match(/^[\,…]$/) && !(cursor.parent && cursor.parent.parent instanceof SupSub))
      LatexCmds.cdot().createLeftOf(cursor);
    else if(!(cmd instanceof BinaryOperator || cmd instanceof Fraction || cmd instanceof Unit || cmd instanceof SupSub || (cmd instanceof Bracket && (cmd.side === R))) && (cursor[L] !== 0) && ((cursor[L] instanceof Fraction) || (cursor[L] instanceof Bracket) || (cursor[L] instanceof ScientificNotation) || ((cursor[L] instanceof SupSub) && !(cmd instanceof Bracket))))
      LatexCmds.cdot().createLeftOf(cursor);
    
    cmd.createLeftOf(cursor);
  };

  _.focus = function() {
    this.jQ.addClass('mq-hasCursor');
    this.jQ.removeClass('mq-empty');
    if(this.unit) this.unit.focus();
    if(this.parent && this.parent.unit) this.parent.unit.focus();

    return this;
  };
  _.blur = function() {
    this.jQ.removeClass('mq-hasCursor');
    if (this.isEmpty())
      this.jQ.addClass('mq-empty');
    if(this.unit) this.unit.blur();
    if(this.parent && this.parent.unit) this.parent.unit.blur();

    return this;
  };
  _.recursiveSetUnit = function() {
    this.eachChild(function (child) { if(child.recursiveSetUnit) child.recursiveSetUnit(); });
    this.eachChild(function (child) { 
      if((child instanceof VanillaSymbol) && ((child.ctrlSeq == 'µ') || (child.ctrlSeq == '2'))) { 
        var newnode = Letter(child.ctrlSeq);
        newnode.jQize();
        newnode.jQ.insDirOf(R, child.jQ);
        child[R] = newnode.adopt(child.parent, child, child[R]);
        child.remove();
      } 
    });
  };
});

var RootMathBlock = P(MathBlock, RootBlockMixin);
MathQuill.MathField = APIFnFor(P(EditableField, function(_, super_) {
  _.init = function(el, opts) {
    el.addClass('mq-editable-field mq-math-mode');
    this.initRootAndEvents(RootMathBlock(), el, opts);
  };
}));
