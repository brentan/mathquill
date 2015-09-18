var Modulus =
LatexCmds.mod = 
LatexCmds['%'] =
P(MathCommand, function(_, super_) {
  _.ctrlSeq = '\\mod';
  _.htmlTemplate =
      '<span class="mq-non-leaf">'
    +   '<span class="mq-scaled mq-paren">(</span>'
    +   '<span class="mq-non-leaf"><span>&0</span>'
    +   '<span style="display:inline-block;" class="mq-logic-operator">mod</span>'
    +   '<span>&1</span></span>'
    +   '<span class="mq-scaled mq-paren">)</span>'
    + '</span>'
  ;
  _.textTemplate = ['irem(', ',', ')'];
  _.latex = function() {
    return this.ctrlSeq + '{' + this.blocks[0].latex() + '}{' + this.blocks[1].latex() + '}';
  }
  _.reflow = function() {
    var delimjQs = this.jQ.children(':first').add(this.jQ.children(':last'));
    var contentjQ = this.jQ.children(':eq(1)');
    var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
    scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
  };
  _.createLeftOf = function(cursor) {
    if (!this.replacedFragment) {
      var leftward = cursor[L];
      var all_numeric = (leftward.ctrlSeq && leftward.ctrlSeq.match(/^[0-9\.]$/)) ? true : false;
      while (leftward &&
        !(
          leftward instanceof BinaryOperator ||
          leftward instanceof (LatexCmds.text || noop) ||
          leftward.ctrlSeq === '\\ ' ||
          /^[,;:]$/.test(leftward.ctrlSeq)
        ) //lookbehind for operator
      ) {
        if(all_numeric) all_numeric = (leftward.ctrlSeq && leftward.ctrlSeq.match(/^[0-9\.]$/)) ? true : false;
        leftward = leftward[L];
      }

      if (leftward !== cursor[L]) {
        if(all_numeric) {
          // Maybe they are trying to do 45%, not 45 mod x, so create that.  If not item is NOT a binary operator, it will become a mod
          var per = Percent();
          per.replaces(Fragment(leftward[R] || cursor.parent.ends[L], cursor[L]));
          cursor[L] = leftward;
          per.createLeftOf(cursor);
          cursor.insRightOf(per);
          return;
        } else {
          this.replaces(Fragment(leftward[R] || cursor.parent.ends[L], cursor[L]));
          cursor[L] = leftward;
        }
      }
    }
    super_.createLeftOf.call(this, cursor);
  };
});

var Percent =
LatexCmds.percent =
P(MathCommand, function(_, super_) {
  _.ctrlSeq = '\\percent';
  _.htmlTemplate =
      '<span>'
    +   '<span>&0</span>'
    +   '<span style="display:inline-block;">%</span>'
    + '</span>'
  ;
  _.textTemplate = ['((', ')*0.01)'];
  _.latex = function() {
    return this.ctrlSeq + '{' + this.blocks[0].latex() + '}';
  }
});