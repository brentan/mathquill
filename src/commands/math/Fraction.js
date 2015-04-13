

var Fraction =
LatexCmds.frac =
LatexCmds.dfrac =
LatexCmds.cfrac =
LatexCmds.fraction = P(MathCommand, function(_, super_) {
  _.ctrlSeq = '\\frac';
  _.htmlTemplate =
      '<span class="mq-fraction mq-non-leaf">'
    +   '<span class="mq-numerator">&0</span>'
    +   '<span class="mq-denominator">&1</span>'
    +   '<span style="display:inline-block;width:0">&nbsp;</span>'
    + '</span>'
  ;
  _.textTemplate = ['((', ')/(', '))'];
  _.finalizeTree = function() {
    this.setUnit();
    this.jQ.closest('.mq-editable-field').children('.mq-popup').remove();
    this.upInto = this.ends[R].upOutOf = this.ends[L];
    this.downInto = this.ends[L].downOutOf = this.ends[R];
    if(this.blocks[1].ends[L] && (this.blocks[1].ends[L].ctrlSeq === '.')) {
      // There is no latex elementWise operator...so we just add a '.' to the front of the numerator to represent it.  Note since we auto-add a '0' before '.' in numbers, it means a leading '.' should only indicate elementwise math
      this.blocks[1].ends[L].remove();
      this.elementWise = true;
    }
    if(this.elementWise) {
      this.jQ.wrap("<span class='mq-fraction-elementwise'></span>");
      this.jQ = this.jQ.parent();
    }
  };
  _.text = function(opts) {
    return '((' + this.blocks[0].text(opts) + ')' + (this.elementWise ? '.' : '') + '/(' + this.blocks[1].text(opts) + '))';
  }
  _.latex = function() {
    return this.ctrlSeq + '{' + this.blocks[0].latex() + '}{' + (this.elementWise ? '.' : '') + this.blocks[1].latex() + '}';
  }
});

var LiveFraction =
LatexCmds.over =
CharCmds['/'] = P(Fraction, function(_, super_) {
  _.createLeftOf = function(cursor) {
    if (!this.replacedFragment) {
      // Test for elementwise operator .^
      if(cursor[L] && (cursor[L].ctrlSeq === '.') && (cursor[L][L])) {
        var to_remove = [cursor[L]];
        if(cursor[L][L] && cursor[L][L][L] && cursor[L][L][L][L] && (cursor[L][L].ctrlSeq === '0') && (cursor[L][L][L].ctrlSeq === '\\cdot ')) {
          // Deal with added 0 and implicit multiplication
          to_remove.push(cursor[L][L]);
          to_remove.push(cursor[L][L][L]);
          var ins = cursor[L][L][L][L];
        } else
          var ins = cursor[L][L];
        for(var i=0; i < to_remove.length; i++)
          to_remove[i].remove();
        this.elementWise = true;
        cursor.insRightOf(ins);
      }
      var leftward = cursor[L];
      while (leftward &&
        !(
          leftward instanceof BinaryOperator ||
          leftward instanceof (LatexCmds.text || noop) ||
          leftward instanceof SummationNotation ||
          leftward.ctrlSeq === '\\ ' ||
          /^[,;:]$/.test(leftward.ctrlSeq)
        ) //lookbehind for operator
      ) leftward = leftward[L];

      if (leftward instanceof SummationNotation && leftward[R] instanceof SupSub) {
        leftward = leftward[R];
        if (leftward[R] instanceof SupSub && leftward[R].ctrlSeq != leftward.ctrlSeq)
          leftward = leftward[R];
      }

      if (leftward !== cursor[L]) {
        this.replaces(Fragment(leftward[R] || cursor.parent.ends[L], cursor[L]));
        cursor[L] = leftward;
      }
    }
    super_.createLeftOf.call(this, cursor);
  };
});


var Choose =
LatexCmds.choose = P(Binomial, function(_) {
  _.createLeftOf = LiveFraction.prototype.createLeftOf;
});
