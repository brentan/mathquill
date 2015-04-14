
// Not truly latex appropriate, but useful for making scientific notation appear pretty 
var ScientificNotation = LatexCmds.scientificNotation = P(DerivedMathCommand, function(_, super_) {
  _.ctrlSeq = 'ScientificNotation{...}{...}';
  _.htmlTemplate =
      '<span>'
    +   '<span>&0</span>'
    +   '<span style="font-size:0.7em;">&times;</span><span>10</span>'
    +   '<span class="mq-supsub mq-non-leaf mq-sup-only"><span class="mq-sup">&1</span></span>'
    + '</span>'
  ;
  _.init = function(ch) {
    if(ch !== 'scientificNotation')
      this.incorporate_previous = ch;
    super_.init.call(this);
  };
  _.text = function(opts) {
    return this.blocks[0].text(opts) + 'e' + this.blocks[1].text(opts);
  }
  _.latex = function() {
    return '\\scientificNotation{' + this.blocks[0].latex() + '}{' + this.blocks[1].latex() + '}';
  }
  _.finalizeTree = function() {
    this.downInto = this.ends[L];
    this.upInto = this.ends[R];
    this.ends[L].upOutOf = this.ends[R];
    this.ends[R].downOutOf = this.ends[L];
    this.ends[L].write = function(cursor, ch) {
      if (!RegExp(/[0-9]/).test(ch)) {
        cursor.insRightOf(this.parent);
        cursor.parent.write(cursor, ch);
      } else
        MathBlock.p.write.apply(this, arguments);
    };
    this.ends[R].write = function(cursor, ch) {
      if (!RegExp(/[0-9\+\-]/).test(ch)) {
        cursor.insRightOf(this.parent);
        cursor.parent.write(cursor, ch);
      }
      else if((ch === '+') || (ch === '-')) {
        //See if we are at Left most position and see if to the right is a + or - sign
        //or See if we are in position 2, and if the thing next to us is a + or - sign
        if((cursor[L] === 0) && (cursor[R] !== 0) && ((cursor[R].ctrlSeq === '-') || (cursor[R].ctrlSeq === '+'))) {
          cursor[R].ctrlSeq = ch;
          cursor[R].textTemplate = ch;
          cursor[R].jQ.html(ch);
          return;
        }
        else if((cursor[L] !== 0) && (cursor[L][L] === 0) && ((cursor[L].ctrlSeq === '-') || (cursor[L].ctrlSeq === '+'))) {
          cursor[L].ctrlSeq = ch;
          cursor[L].textTemplate = ch;
          cursor[L].jQ.html(ch);
          return;
        }
        else if(cursor[L] !== 0) {
          cursor.insRightOf(this.parent);
          cursor.parent.write(cursor, ch);
        }
      } else
        MathBlock.p.write.apply(this, arguments);
    };
  }
  _.createLeftOf = function(cursor) {
    super_.createLeftOf.apply(this, arguments);
    if(typeof this.incorporate_previous !== 'undefined') {
      // If this is set, it means we were automagically created from a 1e3 type of syntax.
      // We need to roll up the previous digits into this element and place the cursor
      var e = this[L];
      if(e === 0) return; //this shouldn't happen....
      if(e[L] === 0) return; //nor should this...
      // Zip up all the preceding digits
      for(next = e[L]; (next !== 0) && (typeof next.ctrlSeq !== 'undefined') && next.ctrlSeq.match(/^[0-9\.]$/); next = e[L]) {
        next.disown().adopt(this.ends[L], 0, this.ends[L].ends[L]);
        next.jQ.prependTo(this.ends[L].jQ);
      }
      // Remove the preceeding 'e'
      e.remove();

      // Insert the last command into the exponent and place the cursor
      cursor.insAtLeftEnd(this.ends[R]);
      this.ends[R].write(cursor, this.incorporate_previous);
    }
  };
});