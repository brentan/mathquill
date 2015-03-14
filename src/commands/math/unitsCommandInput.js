/**********************************
 * Input box to type units commands
 **********************************/

 // BRENTAN: Need to now start doing the autocomplete.  This is already there in 'variable' but
 // we need to hijack it since it should know we are actually a unit, and so the autocomplete form
 // and the options in it will be different.  Get the list based on giac unit list in the C code (the
 // location is mentioned in an email with the french dude).  
 // Once that is done, we need to work on the text output function, which needs to add a '_' before each unit name

var Unit = LatexCmds.Unit = 
CharCmds["'"] = P(MathCommand, function(_, super_) {
  _.ctrlSeq = 'Unit{...}{...}';
  _.replaces = function(replacedFragment) {
    replacedFragment.disown();
    this._replacedFragment = replacedFragment;
  };
  _.htmlTemplate = '<span><span>&0</span><span class="mq-unit mq-non-leaf">&1</span></span>';
  _.finalizeTree = function() {
    this.ends[R].focus = function() {
      this.jQ.addClass('mq-active');
      if (this.isEmpty())
        this.jQ.removeClass('mq-empty');

      return this;
    };
    this.ends[R].blur = function() {
      this.jQ.removeClass('mq-active').removeClass('mq-hasCursor');
      if (this.isEmpty())
        this.jQ.addClass('mq-empty');

      return this;
    };
    this.ends[R].write = function(cursor, ch, replacedFragment) {
      
      if (ch.match(/^[a-z]$/i))
        cmd = Letter(ch); 
      else if (cmd = CharCmds[ch] || LatexCmds[ch])
        cmd = cmd(ch);
      else
        cmd = VanillaSymbol(ch);
      if(!ch.match(/^[a-z\^\*\/\(\)]$/i)) { 
        if (replacedFragment) 
          replacedFragment.remove();
        this.flash();
        return; 
       }

      if (replacedFragment) cmd.replaces(replacedFragment);
      cmd.createLeftOf(cursor);
    };
    this.ends[R].unit = this.ends[R];
    this.ends[R].eachChild(function (child) {
      if(child.recursiveSetUnit) child.recursiveSetUnit();
    });
    this.ends[R].deleteOutOf = function(dir, cursor) {
      for(var el= this.ends[L]; el !== 0; el = el[R])
        el.remove();
      cursor.insAtRightEnd(this);
      cursor.unwrapGramp();
    };
    this.ends[L].deleteOutOf = function(dir, cursor) {
      for(var el= this.parent.ends[R].ends[L]; el !== 0; el = el[R])
        el.remove();
      cursor.insAtRightEnd(this);
      cursor.unwrapGramp();
    };
  };
  _.createLeftOf = function(cursor) {
    if (this._replacedFragment) {

      // Determine if the fragment is just numbers.  If so, add units
      var just_a_number = true;
      for(var el = this._replacedFragment.ends[L]; el !== 0; el = el[R]) {
        if(!((el instanceof VanillaSymbol) && el.ctrlSeq.match(/[0-9\.]/))) {
          just_a_number = false;
          break;
        }
      }
      // Determine if its scientific notation ONLY
      if((this._replacedFragment.ends[L] === this._replacedFragment.ends[R]) && (this._replacedFragment.ends[L] instanceof ScientificNotation)) just_a_number = true;
      if(just_a_number) {
        super_.createLeftOf.call(this, cursor);
        this._replacedFragment.adopt(this.ends[L], 0, 0);
        this._replacedFragment.jQ.appendTo(this.ends[L].jQ);
      } else {
        var bracket = CharCmds['(']();
        bracket.replaces(this._replacedFragment);
        bracket.createLeftOf(cursor);
        bracket.reflow();
        cursor.insRightOf(bracket);
        LatexCmds.cdot().createLeftOf(cursor);
        super_.createLeftOf.call(this, cursor);
        cursor.insAtRightEnd(this.ends[L]);
        VanillaSymbol('1').createLeftOf(cursor);
      }
    } else {
      // See if im being added next to a number.  If so, start walking left until the start of the number is found, then move this into the unit
      var to_move = [];
      if(cursor[L] instanceof ScientificNotation) to_move.push(cursor[L]);
      for(var el = cursor[L]; el !== 0; el = el[L]) {
        if((el instanceof VanillaSymbol) && el.ctrlSeq.match(/[0-9\.]/)) to_move.push(el);
        else break;
      }
      if(to_move.length === 0) {
        if((cursor[L] instanceof BinaryOperator) || (cursor[L] === 0))
          VanillaSymbol('1').createLeftOf(cursor);
        else {
          LatexCmds.cdot().createLeftOf(cursor);
          VanillaSymbol('1').createLeftOf(cursor);
        }
        to_move.push(cursor[L]);
      }
      super_.createLeftOf.call(this, cursor);
      for(var i=0; i < to_move.length; i++) {
        to_move[i].disown();
        to_move[i].adopt(this.ends[L], 0, this.ends[L].ends[L]);
        to_move[i].jQ.prependTo(this.ends[L].jQ);
      }
    }
    cursor.insAtRightEnd(this.ends[R]);
    cursor.workingGroupChange();
  };
  _.latex = function() {
    return '\\Unit{' + this.blocks[0].latex() + '}{' + this.blocks[1].latex() + '}';
  }
  _.text = function(opts) { //BRENTAN: Update me
    return 'UNIT(' + this.blocks[0].text(opts) + ',' + this.blocks[1].text(opts) + ')';
  }
});