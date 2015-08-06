

var SummationNotation = P(MathCommand, function(_, super_) {
  _.hide_limits = false;
  _.init = function(ch, html) {
    var htmlTemplate =
        '<span><span class="mq-large-operator mq-non-leaf">'
        +   (this.hide_limits ? '' : '<span class="mq-to"><span>&2</span></span>')
        +   '<big>'+html+'</big>'
        +   '<span class="mq-from"><span>&0</span>' + (this.hide_limits ? '' : '=<span>&1</span>') + '</span>'
        + '</span>'
        + '<span class="mq-non-leaf">'
        + '<span class="mq-scaled mq-paren">(</span>'
        + '<span class="mq-non-leaf">' + (this.hide_limits ? '&1' : '&3') + '</span>'
        + '<span class="mq-scaled mq-paren">)</span>'
        + '</span></span>';
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.reflow = function() {
    var delimjQs = this.jQ.children(':last').children(':first').add(this.jQ.children(':last').children(':last'));
    var contentjQ = this.jQ.children(':last').children(':eq(1)');
    var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
    scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
  };
  _.latex = function() {
    if(this.hide_limits) 
      return this.ctrlSeq + '_{' + this.blocks[0].latex() + '}\\left({' + this.blocks[1].latex() + '}\\right)';
    else
      return this.ctrlSeq + '_{' + this.blocks[0].latex() + '}^{' + this.blocks[1].latex() + '}_{' + this.blocks[2].latex() + '}\\left({' + this.blocks[3].latex() + '}\\right)';
  };
  _.text = function(opts) {
    if(this.hide_limits) 
      return ' ' + (this.ctrlSeq == '\\sumn ' ? 'sum' : 'product') + '(' + this.blocks[1].text(opts) + ', ' + this.blocks[0].text(opts) + ')';
    else
      return ' ' + (this.ctrlSeq == '\\sum ' ? 'sum' : 'product') + '(' + this.blocks[3].text(opts) + ', ' + this.blocks[0].text(opts) + ' , ' + this.blocks[1].text(opts) + ' , ' + this.blocks[2].text(opts) + ')';
  }
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var whitespace = Parser.whitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;

    var self = this;
    if(this.hide_limits) 
      var blocks = self.blocks = [ MathBlock(), MathBlock()];
    else
      var blocks = self.blocks = [ MathBlock(), MathBlock(), MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

    if(!this.hide_limits) 
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
    if(!this.hide_limits) {
      this.blocks[0].upOutOf = this.blocks[2];
      this.blocks[1].upOutOf = this.blocks[2];
      this.blocks[2].downOutOf = this.blocks[0];
    }
  };
});

var SummationNotationNoLimits = P(SummationNotation, function(_, super_) {
  _.init = function(ch, html) {
    this.hide_limits = true;
    super_.init.apply(this, arguments);
  };
});

LatexCmds['∑'] =
LatexCmds.sum =
LatexCmds.summation = bind(SummationNotation,'\\sum ','&sum;');
LatexCmds.sumn = bind(SummationNotationNoLimits,'\\sumn ','&sum;');

LatexCmds['∏'] =
LatexCmds.prod =
LatexCmds.product = bind(SummationNotation,'\\prod ','&prod;');

LatexCmds.coprod =
LatexCmds.coproduct = bind(SummationNotation,'\\coprod ','&#8720;');

