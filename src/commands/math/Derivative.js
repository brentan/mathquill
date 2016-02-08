
var Derivative = P(MathCommand, function(_, super_) {
  _.symbol = 'd';
  _.init = function(ch, power, partial) {
    if(partial) this.symbol = '&#8706;';
    var htmlTemplate = '<span class="mq-fraction mq-non-leaf">'
      + '<span class="mq-numerator">' + this.symbol 
      + '<span>&0</span></span>'
      + '<span class="mq-denominator">' + this.symbol + '<span>&1</span>' 
      + '</span>'
      + '<span style="display:inline-block;width:0">&nbsp;</span>'
      + '</span>'
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.latex = function() {
    return this.ctrlSeq + '_{' + this.blocks[1].latex() +
        '}\\left({' + this.blocks[0].latex() + '}\\right)';
  };
  _.textOutput = function(opts) {
    return [{text: ' diff('},{text:this.blocks[0].text(opts), obj: this.blocks[0]},{text:' , '},{text:this.blocks[1].text(opts), obj:this.blocks[1]},{text:')'}];
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
    this.ends[R].upOutOf = this.ends[L];
    this.ends[L].downOutOf = this.ends[R];
    this.ends[R].suppressAutoUnit = true;
  };
});

LatexCmds.derivative = bind(Derivative,'\\derivative ', 1, false);
LatexCmds.pderivative = bind(Derivative,'\\pderivative ', 1, true);

var MultiDerivative = P(Derivative, function(_, super_) {
  _.init = function(ch, partial) {
    if(partial) this.symbol = '&#8706;';
    var htmlTemplate = '<span class="mq-fraction mq-non-leaf">'
      +   '<span class="mq-numerator" style="padding-top:9px;">' + this.symbol 
      +   '<sup>&0</sup><span>&1</span></span>'
      +   '<span class="mq-denominator" style="padding-top:9px;">' + this.symbol + '<span>&2</span>' 
      +   '<sup class="mq-denominator-power"></sup></span>'
      +   '<span style="display:inline-block;width:0">&nbsp;</span>'
      + '</span>'
    Symbol.prototype.init.call(this, ch, htmlTemplate);
  };
  _.latex = function() {
    return this.ctrlSeq + '_{' + this.blocks[0].latex() + '}_{' + this.blocks[2].latex() +
        '}\\left({' + this.blocks[1].latex() + '}\\right)';
  };
  _.textOutput = function(opts) {
    return [{text:' diff('},{text:this.blocks[1].text(opts), obj:this.blocks[1]},{text:' , '},{text: this.blocks[2].text(opts), obj:this.blocks[2]},{text:'$'},{text: this.blocks[0].text(opts), obj:this.blocks[0]},{text:')'}];
  }
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var whitespace = Parser.whitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;

    var self = this;
    var blocks = self.blocks = [ MathBlock(), MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

    return optWhitespace.then(string('_')).then(function() {
      var child = blocks[0];
      return block.then(function(block) {
        block.children().adopt(child, child.ends[R], 0);
        return succeed(self);
      });
    }).then(string('_')).then(function() {
      var child = blocks[2];
      return block.then(function (block) {
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
    this.downInto = this.ends[L];
    this.upInto = this.ends[R];
    this.ends[R].upOutOf = this.ends[L][R];
    this.ends[L].downOutOf = this.ends[L][R];
    this.ends[L][R].upOutOf = this.ends[L];
    this.ends[L][R].downOutOf = this.ends[R];
    this.ends[R].suppressAutoUnit = true;
    var _this = this;
    this.ends[L].write = function(cursor, ch, replacedFragment) {
      if (ch.match(/^[0-9]$/i)) {
        cmd = VanillaSymbol(ch);
        if (replacedFragment) cmd.replaces(replacedFragment);
        cmd.createLeftOf(cursor);
        _this.jQ.find(".mq-denominator-power").html(_this.ends[L].text({}));
      } else
        this.flash();
    }
    this.ends[L].keystroke = function(key, e, ctrlr) {
      var to_return = super_.keystroke.apply(this, arguments);
      _this.jQ.find(".mq-denominator-power").html(_this.ends[L].text({}));
      return to_return;
    };
    this.jQ.find(".mq-denominator-power").html(this.ends[L].text({}));
  };
});

LatexCmds.derivatived = bind(MultiDerivative,'\\derivatived ', false);
LatexCmds.pderivatived = bind(MultiDerivative,'\\pderivatived ', true);




