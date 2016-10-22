/**********************************
 * Input box to type units commands
 **********************************/
// Not truly latex appropriate, but useful for making units work

 // BRENTAN: Far future: giac has an '8th' unit type, which is currency.  Consider adding more currency to giac if we have a way to set exchange rates programmatically
 // BRENTAN: Temperature is not well handled by giac, due to confusion over absolute or relative.  Add something in 'text' that converts C -> K and F -> R, and add a warning to the output box or something

var Unit = LatexCmds.Unit = 
CharCmds['"'] = P(DerivedMathCommand, function(_, super_) {
  _.autoOperator = false;
  _.ctrlSeq = 'Unit{...}';
  _.replaces = function(replacedFragment) { 
    this._replacedFragment = replacedFragment;
  };
  _.htmlTemplate = '<span><span class="mq-unit mq-non-leaf">&0</span></span>';
  _.finalizeTree = function() {
    // Change any fancy 'f' back into normal f
    this.jQ.find('.mq-florin').removeClass('.mq-florin').html('f');
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
      if(!ch.match(/^[a-zµ2\^\*\/\(\)]$/i)) { 
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
      if((child instanceof VanillaSymbol) && ((child.ctrlSeq == 'µ') || (child.ctrlSeq == '2'))) { 
        var newnode = Letter(child.ctrlSeq);
        newnode.jQize();
        newnode.jQ.insDirOf(R, child.jQ);
        child[R] = newnode.adopt(child.parent, child, child[R]);
        child.remove();
      } 
    });
    this.ends[R].deleteOutOf = function(dir, cursor) {
      if(cursor.controller.captiveUnitMode) return;
      if(cursor.controller.units_only) return;
      for(var el= this.ends[L]; el !== 0; el = el[R])
        el.remove();
      cursor.insAtRightEnd(this);
      cursor.unwrapGramp();
    };
  };
  _.createLeftOf = function(cursor) {
    if (this._replacedFragment) {
      var add_parens = false;
      this._replacedFragment.each(function(el) {
        if(el instanceof BinaryOperator) add_parens = true;
      });
      if(add_parens) {
        var parens = CharCmds['(']();
        parens.replaces(this._replacedFragment);
        parens.createLeftOf(cursor);
        cursor.insRightOf(parens);
      } else {
        cursor.clearSelection();
        cursor.insRightOf(this._replacedFragment.ends[R]);
        this._replacedFragment.clear();
      }
      this._replacedFragment = undefined;
      super_.createLeftOf.call(this, cursor);
    } else {
      // See if im being added next to a number or other item, or if I should prepend a '1'
      var implicit_one = false;
      if((cursor[L] == 0) || (cursor[L] instanceof BinaryOperator)) {
        implicit_one = VanillaSymbol('1');
        implicit_one.createLeftOf(cursor);
      }
      super_.createLeftOf.call(this, cursor);
      if(implicit_one && (this.getController().captiveUnitMode || this.getController().units_only)) implicit_one.remove();
    }
    cursor.insAtRightEnd(this.ends[R]);
    cursor.workingGroupChange();
    return this;
  };
  _.deleteTowards = function(dir, cursor) {
    if(this.autoOperator) {
      var unwrap = true;
      for(var i = this.blocks[0].ends[L]; i != 0; i = i[R])
        unwrap = unwrap && (i instanceof Letter)
      // Unit was auto-created and is only a single unit, so if we delete-towards we should unwrap it 
      if(unwrap && this.blocks[0].ends[L]) {
        var symb = [];
        for(var i = this.blocks[0].ends[L]; i != 0; i = i[R])
          symb.push(i.text({}));
        if(this[L] && !(this[L] instanceof BinaryOperator)) LatexCmds.cdot().createLeftOf(cursor);
        var last_letter = false;
        for(var i = 0; i < symb.length; i++) {
          last_letter = Letter(symb[i])
          last_letter.createLeftOf(cursor);
        }
        last_letter.force_no_unit = true;
        this.remove();
        cursor.insRightOf(last_letter);
        return;
      }
    }
    cursor.startSelection();
    this.selectTowards(dir, cursor);
    cursor.select();
  };
  _.latex = function() {
    return '\\Unit{' + this.blocks[0].latex() + '}';
  }
  _.textOutput = function(opts) { 
    if(opts && (opts.captiveUnitMode || opts.units_only)) return [{text:this.blocks[0].text(jQuery.extend({unit: true}, opts)), obj:this.blocks[0]}];
    if((this[L] == 0) || (this[L] instanceof BinaryOperator))
      return [{text:'1*('},{text:this.blocks[0].text(jQuery.extend({unit: true}, opts)), obj:this.blocks[0]},{text:')'}];
    else
      return [{text:'*('},{text:this.blocks[0].text(jQuery.extend({unit: true}, opts)), obj:this.blocks[0]},{text:')'}];
  }
});
