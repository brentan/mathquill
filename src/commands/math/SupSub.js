

function insLeftOfMeUnlessAtEnd(cursor) {
  // cursor.insLeftOf(cmd), unless cursor at the end of block, and every
  // ancestor cmd is at the end of every ancestor block
  var cmd = this.parent, ancestorCmd = cursor;
  do {
    if (ancestorCmd[R]) return cursor.insLeftOf(cmd);
    ancestorCmd = ancestorCmd.parent.parent;
  } while (ancestorCmd !== cmd);
  cursor.insRightOf(cmd);
}

// BRENTAN: The exponent is not always high enough.  Something like ( cos(1+3)/4 / (4 + cos(1) ^ 2) ) will produce the low exponent.  Should eventually be fixed.
var SupSub = P(MathCommand, function(_, super_) {
  _.ctrlSeq = '_{...}^{...}';
  _.replaces = function(replacedFragment) {
    this.replacedFragment = replacedFragment;
  }
  _.createLeftOf = function(cursor) {
    if(this.supsub === 'sub') {
      if(this.replacedFragment) { 
        //Ignore highlighting
        cursor.insRightOf(this.replacedFragment.ends[R]);
        this.replacedFragment.clear();
        this.replacedFragment = false; 
      }
      // Only add subscript to a variable name (aka letter) 
      if (!(cursor[L] instanceof Variable || cursor[L] instanceof Accent)) return cursor.parent.flash();
      if(cursor[L] instanceof Letter) cursor[L].autoOperator(cursor, false, false, true);
      // Inserting in a string for some reason...
      if((cursor[L] instanceof Variable) && (cursor[R] instanceof Variable)) {
        var cdot = LatexCmds.cdot()
        cdot.createLeftOf(cursor);
        cursor.insLeftOf(cdot);
      }
    } else {
      if(!this.replacedFragment) {
        // Only add superscript to actual math stuff (digits, variables, brackets, etc)
        if((cursor[L] === 0) || (cursor[L] instanceof BinaryOperator)) return cursor.parent.flash();
        // Test for elementwise operator .^
        if((cursor[L].ctrlSeq === '.') && (cursor[L][L])) {
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
        if(((cursor[L] instanceof Fraction) || (cursor[L] instanceof DerivedMathCommand)) && !(cursor[L] instanceof Unit)) {
          // Some items should be wrapped in brackets before we add the exponent
          var bracket = CharCmds['(']();
          var to_move = cursor[L];
          bracket.createLeftOf(cursor);
          to_move.disown();
          to_move.adopt(bracket.ends[L], 0, 0);
          to_move.jQ.prependTo(bracket.ends[L].jQ);
          var close_it = CharCmds[')']();
          close_it.createLeftOf(cursor);
          bracket.reflow();
        }
        if((cursor[L] instanceof SupSub) && (cursor[L].supsub === 'sup')) {
          // Also wrap, but SupSub does not 'have' its operand as part of it, so we have to march backwards to find what we need to wrap
          var bracket = CharCmds['(']();
          var to_move = [cursor[L]];
          for(var el = cursor[L]; !(el instanceof BinaryOperator) && (el !== 0); el = el[L])
            to_move.push(el);
          bracket.createLeftOf(cursor);
          for(var i=0; i < to_move.length; i++) {
            to_move[i].disown();
            to_move[i].adopt(bracket.ends[L], 0, bracket.ends[L].ends[L]);
            to_move[i].jQ.prependTo(bracket.ends[L].jQ);
          }
          var close_it = CharCmds[')']();
          close_it.createLeftOf(cursor);
          bracket.reflow();
        }
      } else {
        var brackets = false;
        if((this.replacedFragment.ends[L] == this.replacedFragment.ends[R]) && (this.replacedFragment.ends[L] instanceof BinaryOperator)) {
          // Same start/end item, no need for brackets, but make sure its not a BinaryOperator
          cursor.insLeftOf(this.replacedFragment.ends[L]);
          cursor.startSelection();
          cursor.insRightOf(this.replacedFragment.ends[R]);
          cursor.select(); 
          this.replacedFragment.clear();
          return this.flash();
        }
        //Loop fragment in search of non-letter/number and then add a bracket, insert into the bracket.
        for(var el = this.replacedFragment.ends[L]; el !== this.replacedFragment.ends[R][R]; el = el[R]) {
          if(!(el instanceof VanillaSymbol) && !(el instanceof Variable) && !(el instanceof OperatorName)) {
            brackets = true;
            break;
          }
        }
        if(brackets) {
          var bracket = CharCmds['(']();
          bracket.replaces(this.replacedFragment);
          bracket.createLeftOf(cursor);
          bracket.reflow();
          this.replacedFragment = false; 
          cursor.insRightOf(bracket);
        } else {
          cursor.insRightOf(this.replacedFragment.ends[R]);
          this.replacedFragment.clear();
          this.replacedFragment = false; 
        }
      }
    }
    return super_.createLeftOf.call(this, cursor);
  };
  Options.p.charsThatBreakOutOfSupSub = '';
  _.finalizeTree = function() {
    var supsub = this.supsub;
    this.setUnit();
    this.unitsup = false;
    this.ends[L].write = function(cursor, ch, replacedFragment) {
      if((supsub == 'sub') && (ch === '_')) {
        if(replacedFragment) {
          cursor.insLeftOf(replacedFragment.ends[L]);
          cursor.startSelection();
          cursor.insRightOf(replacedFragment.ends[R]);
          cursor.select(); 
          replacedFragment.clear();
        }
        return this.flash();
      }
      if(replacedFragment) replacedFragment.clear();
      if (cursor.options.charsThatBreakOutOfSupSub.indexOf(ch) > -1) {
        if(cursor[L] instanceof Letter) cursor[L].autoOperator(cursor, undefined, false, true);
        cursor.insRightOf(this.parent);
        cursor.parent.write(cursor, ch);
      } else if ((supsub == 'sub') && !RegExp(/[A-Za-z0-9~]/).test(ch)) {
        if(cursor[L] instanceof Letter) cursor[L].autoOperator(cursor, false, false, true);
        cursor.insRightOf(this.parent);
        cursor.parent.write(cursor, ch);
      } else
        MathBlock.p.write.apply(this, arguments);
    };
    if(this.sup && (this.sup.ends[L] && this.sup.ends[L].ctrlSeq === '@')) {
      // There is no latex elementWise operator...so we just add a '@' to the front to represent it.  
      this.sup.ends[L].remove();
      this.elementWise = true;
    }
    if(this.elementWise)
      this.jQ.addClass('mq-elementwise');
    if(this.sub) {
      var el = this.jQ.closest('.mq-editable-field').children('.mq-autocomplete').first();
      if(el.length > 0) {
        var topBlock = this.jQ;
        var topOffset = topBlock.position();
        if(!this.controller) this.getController();
        var scrollTop = (this.controller.element && controller.element.worksheet) ? this.controller.element.worksheet.jQ.scrollTop() : 0;
        if(topBlock.closest('.tutorial_block').length)
          scrollTop = topBlock.closest('.tutorial_block').scrollTop();
        el.css({top: Math.ceil(topOffset.top + topBlock.height() + scrollTop) + 'px'});
      }
    }
  };
  _.latex = function() {
    var elementWise = this.elementWise;
    function latex(prefix, block) {
      var l = block && block.latex();
      return block ? prefix + ((l.length === 1) && !elementWise ? l : '{' + (elementWise ? '@' : '') + (l || ' ') + '}') : '';
    }
    return latex('_', this.sub) + latex('^', this.sup);
  };
  _.textOutput = function(opts) {
    //subscript first
    var tex = [];
    if(this.sub) {
      // subscripts should create variable names like 'r_outer', not 'r_(outer)'
      tex.push({text: '_'});
      if(this.sub && (this.sub.ends[L] !== 0) && (this.sub.ends[L] === this.sub.ends[R])) {
        tex.push({text: this.sub.ends[L].text(opts), obj: this.sub.ends[L]});
      } else {
        tex = tex.concat(this.sub.foldChildren([], function (text, child) {
          text.push({text: child.text(opts), obj: child});
          return text;
        }));
      }
    }
    if(this.sup) {
      if(this.elementWise) tex.push({text:'.'});
      tex.push({text:'^'});
      tex.push({text:'('});
      if(this.sup && (this.sup.ends[L] !== 0) && (this.sup.ends[L] === this.sup.ends[R])) {
        tex.push({text:this.sup.ends[L].text(opts), obj:this.sup.ends[L]});
      } else {
        tex = tex.concat(this.sup.foldChildren([], function (text, child) {
          text.push({text:child.text(opts), obj: child});
          return text;
        }));
      }
      tex.push({text:')'});
    }
    return tex;
  };
  _.respace = _.siblingCreated = _.siblingDeleted = function(opts, dir) {
    if (dir === R) return; // ignore if sibling only changed on the right
    this.jQ.toggleClass('mq-limit', this[L].ctrlSeq === '\\int ');
  };
  _.addBlock = function(block) {
    if (this.supsub === 'sub') {
      this.sup = this.upInto = this.sub.upOutOf = block;
      block.adopt(this, this.sub, 0).downOutOf = this.sub;
      block.jQ = $('<span class="mq-sup"/>').append(block.jQ.children())
        .attr(mqBlockId, block.id).prependTo(this.jQ);
    }
    else {
      this.sub = this.downInto = this.sup.downOutOf = block;
      block.adopt(this, 0, this.sup).upOutOf = this.sup;
      block.jQ = $('<span class="mq-sub"></span>').append(block.jQ.children())
        .attr(mqBlockId, block.id).appendTo(this.jQ.removeClass('mq-sup-only'));
      this.jQ.append('<span style="display:inline-block;width:0">&nbsp;</span>');
    }
    // like 'sub sup'.split(' ').forEach(function(supsub) { ... });
    for (var i = 0; i < 2; i += 1) (function(cmd, supsub, oppositeSupsub, updown) {
      cmd[supsub].deleteOutOf = function(dir, cursor) {
        cursor.insDirOf(dir, this.parent);
        if (!this.isEmpty()) {
          cursor[-dir] = this.ends[dir];
          this.children().disown()
            .withDirAdopt(dir, cursor.parent, cursor[dir], this.parent)
            .jQ.insDirOf(dir, this.parent.jQ);
        }
        cmd.supsub = oppositeSupsub;
        delete cmd[supsub];
        delete cmd[updown+'Into'];
        cmd[oppositeSupsub][updown+'OutOf'] = insLeftOfMeUnlessAtEnd;
        delete cmd[oppositeSupsub].deleteOutOf;
        if (supsub === 'sub') $(cmd.jQ.addClass('mq-sup-only')[0].lastChild).remove();
        this.remove();
      };
    }(this, 'sub sup'.split(' ')[i], 'sup sub'.split(' ')[i], 'down up'.split(' ')[i]));
  };
});


LatexCmds.subscript =
LatexCmds._ = P(SupSub, function(_, super_) {
  _.supsub = 'sub';
  _.ctrlSeq = '_';
  _.htmlTemplate =
      '<span class="mq-supsub mq-non-leaf">'
    +   '<span class="mq-sub">&0</span>'
    +   '<span style="display:inline-block;width:0">&nbsp;</span>'
    + '</span>'
  ;
  _.textTemplate = [ '_' ];
  _.finalizeTree = function() {
    this.downInto = this.sub = this.ends[L];
    this.sub.upOutOf = insLeftOfMeUnlessAtEnd;
    super_.finalizeTree.call(this);
  };
});

LatexCmds.superscript =
LatexCmds.supscript =
LatexCmds['^'] = P(SupSub, function(_, super_) {
  _.supsub = 'sup';
  _.ctrlSeq = '^';
  _.htmlTemplate =
      '<span class="mq-supsub mq-non-leaf mq-sup-only">'
    +   '<span class="mq-sup">&0</span>'
    + '</span>'
  ;
  _.textTemplate = [ '^' ];
  _.finalizeTree = function() {
    this.upInto = this.sup = this.ends[R];
    this.sup.downOutOf = insLeftOfMeUnlessAtEnd;
    super_.finalizeTree.call(this);
  };
});