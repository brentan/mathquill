
function DelimsMixin(_, super_) {
  _.jQadd = function() {
    super_.jQadd.apply(this, arguments);
    this.delimjQs = this.jQ.children(':first').add(this.jQ.children(':last'));
    this.contentjQ = this.jQ.children(':eq(1)');
  };
  _.reflow = function() {
    var height = this.contentjQ.outerHeight() / parseInt(this.contentjQ.css('fontSize'), 10);
    scale(this.delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
  };
}

// Round/Square/Curly/Angle Brackets (aka Parens/Brackets/Braces)
//   first typed as one-sided bracket with matching "ghost" bracket at
//   far end of current block, until you type an opposing one
var Bracket = P(P(MathCommand, DelimsMixin), function(_, super_) {
  _.init = function(side, open, close, ctrlSeq, end, textTemplate, textEnd) {
    super_.init.call(this, '\\left'+ctrlSeq, undefined, [open, close]);
    this.side = side;
    this.sides = {};
    this.sides[L] = { ch: open, ctrlSeq: ctrlSeq, textTemplate: textTemplate };
    this.sides[R] = { ch: close, ctrlSeq: end, textTemplate: textEnd };
  };
  _.numBlocks = function() { return 1; };
  _.html = function() { // wait until now so that .side may
    this.htmlTemplate = // be set by createLeftOf or parser
        '<span class="mq-non-leaf">'
      +   '<span class="mq-scaled mq-paren'+(this.side === R ? ' mq-ghost' : '')+'">'
      +     this.sides[L].ch
      +   '</span>'
      +   '<span class="mq-non-leaf">&0</span>'
      +   '<span class="mq-scaled mq-paren'+(this.side === L ? ' mq-ghost' : '')+'">'
      +     this.sides[R].ch
      +   '</span>'
      + '</span>'
    ;
    return super_.html.call(this);
  };
  _.latex = function() {
    return '\\left'+this.sides[L].ctrlSeq+this.ends[L].latex()+'\\right'+this.sides[R].ctrlSeq;
  };
  _.textOutput = function(opts) {
    // Brackets are a tricky one...they may represent matrix indeces on a variable name, in which
    // case we want to use [], or they may just be a 'pretty' bracket, in which case we want to use
    // ().  Vectors should already be transformed into Matrix by use of ','
    if((this.ctrlSeq !== '\\left[') || (this[L] instanceof Variable) || ((this[L] instanceof SupSub) && (this[L].supsub == 'sub'))) {
      var left = this.sides[L].textTemplate;
      var right = this.sides[R].textTemplate;
    } else {
      var left = '(';
      var right = ')';
    }
    return [{text: left}, {text: this.ends[L].text(opts), obj: this.ends[L]}, {text: right}]
  }
  _.oppBrack = function(node, expectedSide) {
    // node must be 1-sided bracket of expected side (if any, may be undefined),
    // and unless I'm a pipe, node and I must be opposite-facing sides
    return node instanceof Bracket && node.side && node.side !== -expectedSide
      && (this.sides[this.side].ch === '|' || node.side === -this.side) && node;
  };
  _.closeOpposing = function(brack) {
    brack.side = 0;
    brack.sides[this.side] = this.sides[this.side]; // copy over my info (may be
    brack.delimjQs.eq(this.side === L ? 0 : 1) // mis-matched, like [a, b))
      .removeClass('mq-ghost').html(this.sides[this.side].ch);
  };
  _.createLeftOf = function(cursor) {
    if (!this.replacedFragment) { // unless wrapping seln in brackets,
        // check if next to or inside an opposing one-sided bracket
      var brack = this.oppBrack(cursor[L], L) || this.oppBrack(cursor[R], R);
      var not_first = false;
      for(var node = cursor.parent; (node !== 0) && !brack; node = node.parent) {
        if(not_first) brack = this.oppBrack(node);
        not_first = true;
        if((this.side === R) && (this.ctrlSeq === '\\left(')) {
          // Some objects have 'built in' brackets that to the user look (and should operate) like normal brackets.  If so, escape out of them
          if((node instanceof OperatorName) || (node instanceof SummationNotation)) { cursor.insRightOf(node); return cursor.workingGroupChange(); }
        } else if((this.side === R) && (this.ctrlSeq === '\\left[') && (node instanceof Matrix)) { cursor.insRightOf(node); return cursor.workingGroupChange(); }
      }

      // Upon '(', we check if we should un-italicize a variable name (as its now a function handle).  
      if((!brack) && (this.ctrlSeq === '\\left(') && (cursor[L] instanceof Variable) && (this.side === L)) 
        return cursor[L].autoUnItalicize(cursor);
      else if((!brack) && (this.ctrlSeq === '\\left(') && (cursor[L] instanceof VanillaSymbol) && (cursor[L].ctrlSeq.match(/^[0-9]$/)) && (this.side === L)) 
        LatexCmds.cdot().implicit().createLeftOf(cursor);
      else if((!brack) && (this.ctrlSeq === '\\left(') && (cursor[L] instanceof SupSub) && (this.side === L) && (cursor[L].supsub === 'sub') && (cursor[L]['sub'].ends[R] instanceof Variable)) {
        cursor.insAtRightEnd(cursor[L]['sub'])
        return cursor[L].autoUnItalicize(cursor); 
      }
      else if((!brack) && 
        (this.ctrlSeq === '\\left[') &&
        (cursor[L] === 0) && 
        (cursor[R] === 0) && 
        (typeof cursor.parent.parent !== 'undefined') && 
        (cursor.parent.parent.ctrlSeq === this.ctrlSeq)) {
          var left_item = cursor.parent.parent[L];
          var parent_item = cursor.parent.parent.parent;
          //This is a double bracket entry [[.  We want to replace with a Matrix
          //First remove the brackets
          cursor.parent.parent.unwrap();
          //Repalce the cursor
          if(left_item !== 0)
            cursor.insRightOf(left_item);
          else
            cursor.insAtLeftEnd(parent_item);
          //Insert the Matrix at this position
          var new_mat = Matrix('\\bmatrix',1,1);
          new_mat.createLeftOf(cursor);
          return;
      }
      else if((!brack) && (this.ctrlSeq === '\\left\\{') && (cursor[L] instanceof Equality) && (cursor[L].strict) && cursor.controller.element && cursor.controller.element.changeToText) {
        //This is a conditional if.  x = { 
        if(cursor.controller.element.changeToText(cursor.controller.API.text() + '{')) return;
      }
    }
    if (brack) {
      var side = this.side = -brack.side; // may be pipe with .side not yet set
      this.closeOpposing(brack);
      if (brack === cursor.parent.parent && cursor[side]) { // move the stuff between
        Fragment(cursor[side], cursor.parent.ends[side], -side) // me and ghost outside
          .disown().withDirAdopt(-side, brack.parent, brack, brack[side])
          .jQ.insDirOf(side, brack.jQ);
        brack.bubble('reflow');
      }
    }
    else {
      brack = this, side = brack.side;
      if (brack.replacedFragment) brack.side = 0; // wrapping seln, don't be one-sided
      else if (cursor[-side]) { // elsewise, auto-expand so ghost is at far end
        brack.replaces(Fragment(cursor[-side], cursor.parent.ends[-side], side));
        cursor[-side] = 0;
      }
      super_.createLeftOf.call(brack, cursor);
    }
    if (side === L) cursor.insAtLeftEnd(brack.ends[L]);
    else cursor.insRightOf(brack);
    cursor.workingGroupChange();
  };
  _.placeCursor = noop;
  _.unwrap = function() {
    this.ends[L].children().disown().adopt(this.parent, this, this[R])
      .jQ.insertAfter(this.jQ);
    this.remove();
  };
  _.deleteSide = function(side, outward, cursor) {
    var parent = this.parent, sib = this[side], farEnd = parent.ends[side];

    if (side === this.side) { // deleting non-ghost of one-sided bracket, unwrap
      this.unwrap();
      sib ? cursor.insDirOf(-side, sib) : cursor.insAtDirEnd(side, parent);
      return;
    }

    this.side = -side;
    // check if like deleting outer close-brace of [(1+2)+3} where inner open-
    if (this.oppBrack(this.ends[L].ends[this.side], side)) { // paren is ghost,
      this.closeOpposing(this.ends[L].ends[this.side]); // if so become [1+2)+3
      var origEnd = this.ends[L].ends[side];
      this.unwrap();
      if (origEnd.siblingCreated) origEnd.siblingCreated(cursor.options, side);
      sib ? cursor.insDirOf(-side, sib) : cursor.insAtDirEnd(side, parent);
    }
    else { // check if like deleting inner close-brace of ([1+2}+3) where
      if (this.oppBrack(this.parent.parent, side)) { // outer open-paren is
        this.parent.parent.closeOpposing(this); // ghost, if so become [1+2+3)
        this.parent.parent.unwrap();
      }
      else { // deleting one of a pair of brackets, become one-sided
        this.sides[side] = { ch: OPP_BRACKS[this.sides[this.side].ch],
                             ctrlSeq: OPP_BRACKS[this.sides[this.side].ctrlSeq] };
        this.delimjQs.removeClass('mq-ghost')
          .eq(side === L ? 0 : 1).addClass('mq-ghost').html(this.sides[side].ch);
      }
      if (sib) { // auto-expand so ghost is at far end
        var origEnd = this.ends[L].ends[side];
        Fragment(sib, farEnd, -side).disown()
          .withDirAdopt(-side, this.ends[L], origEnd, 0)
          .jQ.insAtDirEnd(side, this.ends[L].jQ.removeClass('mq-empty'));
        if (origEnd.siblingCreated) origEnd.siblingCreated(cursor.options, side);
        cursor.insDirOf(-side, sib);
      } // didn't auto-expand, cursor goes just outside or just inside parens
      else (outward ? cursor.insDirOf(side, this)
                    : cursor.insAtDirEnd(side, this.ends[L]));
    }
  };
  _.deleteTowards = function(dir, cursor) {
    this.deleteSide(-dir, false, cursor);
  };
  _.finalizeTree = function(opts) {
    this.setUnit();
    this.ends[L].deleteOutOf = function(dir, cursor) {
      this.parent.deleteSide(dir, true, cursor);
    };
    // FIXME HACK: after initial creation/insertion, finalizeTree would only be
    // called if the paren is selected and replaced, e.g. by LiveFraction
    this.finalizeTree = this.intentionalBlur = function() {
      this.delimjQs.eq(this.side === L ? 1 : 0).removeClass('mq-ghost');
      this.side = 0;
    };
  };
  _.siblingCreated = function(opts, dir) { // if something typed between ghost and far
    if (dir === -this.side) this.finalizeTree(); // end of its block, solidify
  };
});

var OPP_BRACKS = {
  '(': ')',
  ')': '(',
  '[': ']',
  ']': '[',
  '{': '}',
  '}': '{',
  '\\{': '\\}',
  '\\}': '\\{',
  '&lang;': '&rang;',
  '&rang;': '&lang;',
  '\\langle ': '\\rangle ',
  '\\rangle ': '\\langle ',
  '|': '|'
};

function bindCharBracketPair(open, ctrlSeq) {
  var ctrlSeq = ctrlSeq || open, close = OPP_BRACKS[open], end = OPP_BRACKS[ctrlSeq];
  CharCmds[open] = bind(Bracket, L, open, close, ctrlSeq, end, ctrlSeq, end);
  CharCmds[close] = bind(Bracket, R, open, close, ctrlSeq, end, ctrlSeq, end);
}
bindCharBracketPair('(');
bindCharBracketPair('[');
LatexCmds.langle = bind(Bracket, L, '&lang;', '&rang;', '\\langle ', '\\rangle ', '(', ')');
LatexCmds.rangle = bind(Bracket, R, '&lang;', '&rang;', '\\langle ', '\\rangle ', '(', ')');
CharCmds['|'] = LatexCmds.abs = bind(Bracket, L, '|', '|', '|', '|', 'abs(', ')');
CharCmds['{'] = bind(Bracket, L, '{', '}', '\\{', '\\}', '(', ')');
CharCmds['}'] = bind(Bracket, R, '{', '}', '\\{', '\\}', '(', ')');

LatexCmds.left = P(MathCommand, function(_) {
  _.parser = function() {
    var regex = Parser.regex;
    var string = Parser.string;
    var succeed = Parser.succeed;
    var optWhitespace = Parser.optWhitespace;

    return optWhitespace.then(regex(/^(?:[([|]|\\\{)/))
      .then(function(ctrlSeq) { // TODO: \langle, \rangle
        var open = (ctrlSeq.charAt(0) === '\\' ? ctrlSeq.slice(1) : ctrlSeq);
        return latexMathParser.then(function (block) {
          return string('\\right').skip(optWhitespace)
            .then(regex(/^(?:[\])|]|\\\})/)).map(function(end) {
              var close = (end.charAt(0) === '\\' ? end.slice(1) : end);
              var textOpen = open === '[' ? '[' : (open === '|' ? 'abs(' : '(');
              var textClose = open === '[' ? ']' : ')';
              var cmd = Bracket(0, open, close, ctrlSeq, end, textOpen, textClose);
              cmd.blocks = [ block ];
              block.adopt(cmd, 0, 0);
              return cmd;
            })
          ;
        });
      })
    ;
  };
});

LatexCmds.right = P(MathCommand, function(_) {
  _.parser = function() {
    return Parser.fail('unmatched \\right');
  };
});

var Binomial =
LatexCmds.binom =
LatexCmds.binomial = P(P(MathCommand, DelimsMixin), function(_, super_) {
  _.ctrlSeq = '\\binom';
  _.htmlTemplate =
      '<span class="mq-non-leaf">'
    +   '<span class="mq-paren mq-scaled">(</span>'
    +   '<span class="mq-non-leaf">'
    +     '<span class="mq-array mq-non-leaf">'
    +       '<span>&0</span>'
    +       '<span>&1</span>'
    +     '</span>'
    +   '</span>'
    +   '<span class="mq-paren mq-scaled">)</span>'
    + '</span>'
  ;
  _.textTemplate = ['choose(',',',')'];
});
