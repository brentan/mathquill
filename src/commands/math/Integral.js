
var Integral = P(MathCommand, function(_, super_) {
  _.init = function(ch) {
    var htmlTemplate =
        '<span style="margin-top:0.9em;"><span class="mq-large-operator mq-non-leaf" style="display:block;float:left;position:relative;top:-0.9em;">'
        +   '<span class="mq-to">&nbsp;<span>&1</span></span>'
        +   '<big>&int;</big>'
        +   '<span class="mq-from"><span>&0</span></span>'
        + '</span>'
        + '<span class="mq-non-leaf">'
        + '<span class="mq-non-leaf">&2</span>'
        + 'd'
        + '<span class="mq-non-leaf">&3</span>'
        + '</span></span>';
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.reflow = function() {
    var delimjQs = this.jQ.children(':first').children('big');
    var contentjQ = this.jQ.children(':last').children(':first');
    var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
    //scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
    //BRENTAN: Above scaling is wrong, and doesn't move the limits.  Needs to be fixed at some point
  };
  _.latex = function() {
    function simplify(latex) {
      return latex.length === 1 ? latex : '{' + (latex || ' ') + '}';
    }
    return this.ctrlSeq + '_{' + this.blocks[0].latex() +
        '}^{' + this.blocks[1].latex() + '}_{' + this.blocks[3].latex() +'}\\left({' + this.blocks[2].latex() + '}\\right)';
  };
  _.text = function(opts) {
    return ' int(' + this.blocks[2].text(opts) + ' , ' + this.blocks[3].text(opts) + ',' + this.blocks[0].text(opts) + ',' + this.blocks[1].text(opts) + ')';
  }
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var whitespace = Parser.whitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;

    var self = this;
    var blocks = self.blocks = [ MathBlock(), MathBlock(), MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

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
      var child = blocks[3];
      return block.then(function(block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('\\left(')).then(function() {
      var child = blocks[2];
      return block.then(function (block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('\\right)')).result(self);
  };
  _.finalizeTree = function() {
    this.downInto = this.ends[L];
    this.upInto = this.ends[R];
    this.ends[L].upOutOf = this.ends[R];
    this.ends[R].downOutOf = this.ends[L];
  };
});

LatexCmds['∫'] =
LatexCmds['int'] =
LatexCmds.integral = bind(Integral,'\\int ');

var IntegralNoLimit = P(MathCommand, function(_, super_) {
  _.init = function(ch) {
    var htmlTemplate =
        '<span><span class="mq-large-operator mq-non-leaf">'
        +   '<big>&int;</big>'
        + '</span>'
        + '<span class="mq-non-leaf">'
        + '<span class="mq-non-leaf">&0</span>'
        + 'd'
        + '<span class="mq-non-leaf">&1</span>'
        + '</span></span>';
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.reflow = function() {
    var delimjQs = this.jQ.children(':first').children('big');
    var contentjQ = this.jQ.children(':last').children(':first');
    var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
    //scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
    //BRENTAN: Above scaling is wrong, and doesn't move the limits.  Needs to be fixed at some point
  };
  _.latex = function() {
    function simplify(latex) {
      return latex.length === 1 ? latex : '{' + (latex || ' ') + '}';
    }
    return this.ctrlSeq + '_{' + this.blocks[1].latex() +'}\\left({' + this.blocks[0].latex() + '}\\right)';
  };
  _.text = function(opts) {
    return ' int(' + this.blocks[0].text(opts) + ' , ' + this.blocks[1].text(opts) + ')';
  }
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var whitespace = Parser.whitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;

    var self = this;
    var blocks = self.blocks = [ MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

    return optWhitespace.then(string('_')).then(function() {
      var child = blocks[1];
      return block.then(function(block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('\\left(')).then(function() {
      var child = blocks[0];
      return block.then(function (block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('\\right)')).result(self);
  };
  _.finalizeTree = function() {
    this.downInto = this.ends[L];
    this.upInto = this.ends[R];
    this.ends[L].upOutOf = this.ends[R];
    this.ends[R].downOutOf = this.ends[L];
  };
});

LatexCmds.intn = bind(IntegralNoLimit,'\\intn ');



