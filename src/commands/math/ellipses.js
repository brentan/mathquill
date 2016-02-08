
// Create the matrix assessor command '..'
LatexCmds['…'] = P(VanillaSymbol, function(_, super_) {  
  _.init = function() {
    super_.init.call(this, '…', '<span class="mq-nonSymbola" style="font-size:0.6em;">&#8230;</span>', '..');
  }
  _.textOutput = function(opts) {
    if((this.parent && this.parent.parent && (this.parent.parent instanceof Matrix) && (this.parent.parent.row == 1)) || (this.parent && this.parent.parent && (this.parent.parent instanceof Bracket) && (this.parent.parent.sides[L].ctrlSeq == '['))) {
      var out = '';
      if(!this[L] || (this[L] instanceof BinaryOperator))
        out += 'i__s';
      out += '..';
      if(!this[R] || (this[R] instanceof BinaryOperator))
        out += 'i__e';
      return [{text: out}];
    } else {
      // Not in a matrix assessor.  In this context, turn into a matrix of increasing numbers.
      // KEPT FOR BACKWARDS COMPATIBILITY 2/7/16.  PROBABLY SHOULD BE REMOVE AT SOME POINT IN FUTURE
      return [{text: '...'}];
    }
  }
});

// This is the sequence ellipses command, also created with '..'
LatexCmds['ellipses'] = P(MathCommand, function(_, super_) { 
  _.ctrlSeq = '\\ellipses';
  _.htmlTemplate = // be set by createLeftOf or parser
      '<span class="mq-non-leaf">'
    +   '<span class="mq-scaled mq-paren mq-ghost">[</span><span>'
    +     '<span class="mq-non-leaf">&0</span>'
    +     '<span class="mq-nonSymbola" style="font-size:0.7em;padding:0 0.4em;">&#8230;</span>'
    +     '<span class="mq-non-leaf">&1</span>'
    +   '</span><span class="mq-scaled mq-paren mq-ghost">]</span>'
    + '</span>'
  ;
  _.createLeftOf = function(cursor) {
    if (!this.replacedFragment) {
      if(cursor[L] && (cursor[L].ctrlSeq === '.') && (cursor[L][L])) {
        // Check if we still have the preceeding '.' in place from typing '..'
        var to_remove = [cursor[L]];
        if(cursor[L][L] && cursor[L][L][L] && (cursor[L][L].ctrlSeq === '\\cdot ')) {
          // Deal with added implicit multiplication
          to_remove.push(cursor[L][L]);
          var ins = cursor[L][L][L];
        } else
          var ins = cursor[L][L];
        for(var i=0; i < to_remove.length; i++)
          to_remove[i].remove();
        cursor.insRightOf(ins);
      } else if(cursor[L] && (cursor[L].ctrlSeq === '.')) {
        // Check if we are first block added to parent (aka '..' first thing typed)
        super_.createLeftOf.call(this, cursor);
        this[L].remove();
        return;
      }
      // Test leftware for valid blocks to pull in to the ellipses
      var leftward = cursor[L];
      while (leftward &&
        !(
          ((leftward instanceof BinaryOperator) && (leftward.ctrlSeq != ',')) ||
          leftward instanceof (LatexCmds.text || noop) ||
          leftward instanceof SummationNotation ||
          leftward.ctrlSeq === '\\ ' ||
          /^[;:]$/.test(leftward.ctrlSeq)
        ) //lookbehind for operator
      ) leftward = leftward[L];

      if (leftward !== cursor[L]) {
        this.replaces(Fragment(leftward[R] || cursor.parent.ends[L], cursor[L]));
        cursor[L] = leftward;
      }
    }
    super_.createLeftOf.call(this, cursor);
  };
  _.jQadd = function() {
    super_.jQadd.apply(this, arguments);
    this.delimjQs = this.jQ.children(':first').add(this.jQ.children(':last'));
    this.contentjQ = this.jQ.children(':eq(1)');
  };
  _.reflow = function() {
    var height = this.contentjQ.outerHeight() / parseInt(this.contentjQ.css('fontSize'), 10);
    scale(this.delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
  };
  _.textOutput = function(opts) {
    // We use the makevector and seq commands in giac to transform this into a command.  One trick is that if the first argument
    // contains a ',', this indicates a sequence with more ordering (1,3..5) and we re-arrange to account for this
    var left = this.ends[L].text(opts) + '';
    if(left.match(/,/)) {
      // Non unit step size provided
      var start = left.replace(/^(.*),(.*)$/,"$1");
      var second = left.replace(/^(.*),(.*)$/,"$2");
      var end = this.ends[R].text(opts);
      return [{text: "makevector(seq(f__x, f__x=("},{text: start, obj:this.ends[L]},{text:")..("},{text: end, obj:this.ends[R]},{text:"),(("},{text: second, obj: this.ends[L], offset:(start.length + 1)},{text:")-(" + start + "))))"}];
    } else {
      // unit step size assumed
      var start = left;
      var end = this.ends[R].text(opts);
      return [{text: "makevector(seq(f__x, f__x=("},{text: start, obj:this.ends[L]},{text:")..("},{text: end, obj:this.ends[R]},{text:")))"}];
    }
  }
});