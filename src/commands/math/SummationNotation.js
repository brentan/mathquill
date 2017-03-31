

var SummationNotation = P(MathCommand, function(_, super_) {
  _.hide_limits = false;
  _.hide_index = false;
  _.init = function(ch, html) {
    var htmlTemplate =
        '<span' + (this.hide_limits ? '' : ' style="margin-top:0.9em;"') + '><span class="mq-large-operator mq-non-leaf" style="display:block;float:left;'
        +   (this.hide_limits ? '' : 'position:relative;top:-0.9em;') + '">'
        +   (this.hide_limits ? '' : '<span class="mq-to"><span>&2</span></span>')
        +   '<big>'+html+'</big>'
        +   (this.hide_index ? '' : '<span class="mq-from"><span>&0</span>' + (this.hide_limits ? '' : '=<span>&1</span>') + '</span>')
        + '</span>'
        + '<span class="mq-non-leaf">'
        + '<span class="mq-scaled mq-paren">(</span>'
        + '<span class="mq-non-leaf">' + (this.hide_index ? '&0' : (this.hide_limits ? '&1' : '&3')) + '</span>'
        + '<span class="mq-scaled mq-paren">)</span>'
        + '</span></span>';
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.insertFragment = function(replacedFragment) {
    if(this.hide_index) {
      replacedFragment.adopt(this.blocks[0], 0, 0);
      replacedFragment.jQ.appendTo(this.blocks[0].jQ);
    } else if(this.hide_limits) {
      replacedFragment.adopt(this.blocks[1], 0, 0);
      replacedFragment.jQ.appendTo(this.blocks[1].jQ);
    } else {
      replacedFragment.adopt(this.blocks[3], 0, 0);
      replacedFragment.jQ.appendTo(this.blocks[3].jQ);
    }
  }
  _.reflow = function() {
    var sumjQ = this.jQ.children(':first').children('big');
    var delimjQs = this.jQ.children(':last').children(':first').add(this.jQ.children(':last').children(':last'));
    var contentjQ = this.jQ.children(':last').children(':eq(1)');
    var limitjQ = this.jQ.children(':first');
    this.jQ.css('margin-top','0px').css('margin-bottom','0px');
    limitjQ.css('top','0px');
    contentjQ.css('top','0px');
    var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
    scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
    sumjQ.css('fontSize', 1.05*height + 'em');
    var off1 = sumjQ.offset();
    var off2 = contentjQ.offset();
    if(off1.top < off2.top)
      contentjQ.css('top',(off1.top - off2.top) + 'px').css('position','relative');
    else {
      limitjQ.css('top',(off2.top - off1.top) + 'px').css('position','relative');
      this.jQ.css('margin-top', (off1.top - off2.top) + 'px').css('margin-bottom', (off2.top - off1.top) + 'px');
    }
  };
  _.latex = function() {
    if(this.hide_index) 
      return this.ctrlSeq + '_{' + this.blocks[0].latex() + '}';
    else if(this.hide_limits) 
      return this.ctrlSeq + '_{' + this.blocks[0].latex() + '}\\left({' + this.blocks[1].latex() + '}\\right)';
    else
      return this.ctrlSeq + '_{' + this.blocks[0].latex() + '}^{' + this.blocks[1].latex() + '}_{' + this.blocks[2].latex() + '}\\left({' + this.blocks[3].latex() + '}\\right)';
  };
  _.textOutput = function(opts) {
    if(this.hide_index)
      return [{text:(' ' + (this.ctrlSeq == '\\sumi ' ? 'sum' : 'product') + '(')},{text:this.blocks[0].text(opts), obj:this.blocks[0]},{text:')'}];
    else if(this.hide_limits) 
      return [{text:(' ' + (this.ctrlSeq == '\\sumn ' ? 'sum' : 'product') + '(')},{text:this.blocks[1].text(opts), obj:this.blocks[1]},{text:', '},{text:this.blocks[0].text(opts), obj:this.blocks[0]},{text:')'}];
    else
      return [{text:(' ' + (this.ctrlSeq == '\\sum ' ? 'sum' : 'product') + '(')},{text:this.blocks[3].text(opts), obj:this.blocks[3]},{text:', '},{text:this.blocks[0].text(opts), obj:this.blocks[0]},{text:' , '},{text:this.blocks[1].text(opts), obj:this.blocks[1]},{text:' , '},{text:this.blocks[2].text(opts), obj:this.blocks[2]},{text:')'}];
  }
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var whitespace = Parser.whitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;

    var self = this;
    if(this.hide_index) 
      var blocks = self.blocks = [ MathBlock()];
    else if(this.hide_limits) 
      var blocks = self.blocks = [ MathBlock(), MathBlock()];
    else
      var blocks = self.blocks = [ MathBlock(), MathBlock(), MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

    if(this.hide_index) 
      return optWhitespace.then(string('_')).then(function() {
        var child = blocks[0];
        return block.then(function(block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).result(self);
    else if(!this.hide_limits) 
      return optWhitespace.then(string('_')).then(function() {
        var child = blocks[0];
        return block.then(function(block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).then(optWhitespace).then(string('^')).then(function() {
        var child = blocks[1];
        return block.then(function(block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).then(optWhitespace).then(string('_')).then(function() {
        var child = blocks[2];
        return block.then(function(block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).then(string('\\left(')).then(function() {
        var child = blocks[3];
        return block.then(function (block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).then(string('\\right)')).result(self);
    else
      return optWhitespace.then(string('_')).then(function() {
        var child = blocks[0];
        return block.then(function(block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).then(string('\\left(')).then(function() {
        var child = blocks[1];
        return block.then(function (block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).then(string('\\right)')).result(self);
  };
  _.finalizeTree = function() {
    if(!this.hide_limits && !this.hide_index) {
      this.blocks[0].upOutOf = this.blocks[2];
      this.blocks[1].upOutOf = this.blocks[2];
      this.blocks[2].downOutOf = this.blocks[0];
      this.ends[L].suppressAutoUnit = true;
    }
  };
});

var SummationNotationNoLimits = P(SummationNotation, function(_, super_) {
  _.init = function(ch, html) {
    this.hide_limits = true;
    super_.init.apply(this, arguments);
  };
});
var SummationNotationNoIndex = P(SummationNotation, function(_, super_) {
  _.init = function(ch, html) {
    this.hide_limits = true;
    this.hide_index = true;
    super_.init.apply(this, arguments);
  };
});

LatexCmds['∑'] =
LatexCmds.sum =
LatexCmds.summation = bind(SummationNotation,'\\sum ','&sum;');
LatexCmds.sumn = bind(SummationNotationNoLimits,'\\sumn ','&sum;');
LatexCmds.sumi = bind(SummationNotationNoIndex,'\\sumi ','&sum;');

LatexCmds['∏'] =
LatexCmds.prod =
LatexCmds.product = bind(SummationNotation,'\\prod ','&prod;');
LatexCmds.prodi = bind(SummationNotationNoIndex,'\\prodi ','&prod;');

LatexCmds.coprod =
LatexCmds.coproduct = bind(SummationNotation,'\\coprod ','&#8720;');

