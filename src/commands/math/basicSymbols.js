/*********************************
 * Symbols for Basic Mathematics
 ********************************/

var Variable = P(Symbol, function(_, super_) {
  _.init = function(ch, html) {
    super_.init.call(this, ch, '<var>'+(html || ch)+'</var>');
  };
  _.text = function(opts) {
    return this.textTemplate;
  };
  _.autoUnItalicize = function(cursor) {
    // want longest possible operator names, so join together entire contiguous
    // sequence of letters
    var str = '';
    var to_remove = [];
    for (var l = this; l instanceof Variable; l = l[L]) {
      str = l.ctrlSeq + str;
      to_remove.push(l);
    }
    // See if we were in a substring...if so, jump to the main part of the variable name and keep going
    if(cursor.parent && (cursor.parent.parent instanceof SupSub) && (cursor.parent.parent.supsub === 'sub')) {
      str = '_' + str;
      to_remove = [ cursor.parent.parent ];
      for (var l = cursor.parent.parent[L]; l instanceof Variable; l = l[L]) {
        str = l.ctrlSeq + str;
        to_remove.push(l);
      }
      cursor.insRightOf(cursor.parent.parent);
    }
    var block = OperatorName();
    block.createLeftOf(cursor);
    for(var i = 0; i < to_remove.length; i++) {
      // f is annoying and must be dealt with
      if(to_remove[i].ctrlSeq === 'f') 
        to_remove[i].jQ.removeClass('mq-florin').html('f');
      if((to_remove[i] instanceof SupSub) && (to_remove[i].supsub === 'sub')) {
        for(var node = to_remove[i].blocks[0].ends[L]; node !== 0; node = node[R]) {
          if(node.ctrlSeq === 'f') 
            node.jQ.removeClass('mq-florin').html('f');
        }
      }
      to_remove[i].disown();
      to_remove[i].adopt(block.ends[L], 0, block.ends[L].ends[L]);
      to_remove[i].jQ.prependTo(block.ends[L].jQ);
    }
    block.ends[L].jQ.removeClass('mq-empty');
  };
});

Options.p.autoCommands = { _maxLength: 0 };
optionProcessors.autoCommands = function(cmds) {
  if (!/^[a-z]+(?: [a-z]+)*$/i.test(cmds)) {
    throw '"'+cmds+'" not a space-delimited list of only letters';
  }
  var list = cmds.split(' '), dict = {}, maxLength = 0;
  for (var i = 0; i < list.length; i += 1) {
    var cmd = list[i];
    if (cmd.length < 2) {
      throw 'autocommand "'+cmd+'" not minimum length of 2';
    }
    if (LatexCmds[cmd] === OperatorName) {
      throw '"' + cmd + '" is a built-in operator name';
    }
    dict[cmd] = 1;
    maxLength = max(maxLength, cmd.length);
  }
  dict._maxLength = maxLength;
  return dict;
};

var Letter = P(Variable, function(_, super_) {
  _.init = function(ch) { return super_.init.call(this, this.letter = ch); };
  _.autoOperator = function(cursor) {
    var autoCmds = cursor.options.autoCommands;
    // join together longest sequence of letters
    var str = cursor[L].letter, l = cursor[L][L], i = 1;
    while (l instanceof Letter) {
      str = l.letter + str, l = l[L], i += 1;
    }
    // check for an autocommand, going thru substrings longest to shortest
    if(str.length > 1) {
      if (autoCmds.hasOwnProperty(str)) {
        for (var i = 1, l = cursor[L]; i < str.length; i += 1, l = l[L]);
        Fragment(l, cursor[L]).remove();
        cursor[L] = l[L];
        LatexCmds[str](str).createLeftOf(cursor);
        return true;
      }
    }
    return false;
  };
});
var BuiltInOpNames = {}; // http://latex.wikia.com/wiki/List_of_LaTeX_symbols#Named_operators:_sin.2C_cos.2C_etc.
(function() {
  var autoOps = Options.p.autoOperatorNames = { _maxLength: 9 };
  var mostOps = ('arg deg det dim exp gcd hom inf ker lg lim ln log max min sup'
                 + ' limsup liminf injlim projlim Pr').split(' ');
  for (var i = 0; i < mostOps.length; i += 1) {
    BuiltInOpNames[mostOps[i]] = autoOps[mostOps[i]] = 1;
  }

  var builtInTrigs = // why coth but not sech and csch, LaTeX?
    'sin cos tan arcsin arccos arctan sinh cosh tanh sec csc cot coth'.split(' ');
  for (var i = 0; i < builtInTrigs.length; i += 1) {
    BuiltInOpNames[builtInTrigs[i]] = 1;
  }

  var autoTrigs = 'sin cos tan sec cosec csc cotan cot ctg'.split(' ');
  for (var i = 0; i < autoTrigs.length; i += 1) {
    autoOps[autoTrigs[i]] =
    autoOps['arc'+autoTrigs[i]] =
    autoOps[autoTrigs[i]+'h'] =
    autoOps['ar'+autoTrigs[i]+'h'] =
    autoOps['arc'+autoTrigs[i]+'h'] = 1;
  }
}());
optionProcessors.autoOperatorNames = function(cmds) {
  if (!/^[a-z]+(?: [a-z]+)*$/i.test(cmds)) {
    throw '"'+cmds+'" not a space-delimited list of only letters';
  }
  var list = cmds.split(' '), dict = {}, maxLength = 0;
  for (var i = 0; i < list.length; i += 1) {
    var cmd = list[i];
    if (cmd.length < 2) {
      throw '"'+cmd+'" not minimum length of 2';
    }
    dict[cmd] = 1;
    maxLength = max(maxLength, cmd.length);
  }
  dict._maxLength = maxLength;
  return dict;
};
var OperatorName = LatexCmds.operatorname = P(MathCommand, function(_, super_) {
  _.htmlTemplate = '<span><span class="mq-operator-name">&0</span>'
        + '<span class="mq-non-leaf">'
        + '<span class="mq-scaled mq-paren">(</span>'
        + '<span class="mq-non-leaf">&1</span>'
        + '<span class="mq-scaled mq-paren">)</span>'
        + '</span></span>';
  _.init = function(fn) { 
    super_.init.call(this, fn);
  };
  _.createLeftOf = function(cursor) {
    super_.createLeftOf.apply(this, arguments);
    cursor.insAtRightEnd(this.blocks[1]);
  };
  _.reflow = function() {
    var delimjQs = this.jQ.children(':last').children(':first').add(this.jQ.children(':last').children(':last'));
    var contentjQ = this.jQ.children(':last').children(':eq(1)');
    var height = contentjQ.outerHeight() / parseInt(contentjQ.css('fontSize'), 10);
    scale(delimjQs, min(1 + .2*(height - 1), 1.2), 1.05*height);
  };
  _.text = function(opts) {
    return this.blocks[0].text(opts) + '(' + this.blocks[1].text(opts) + ')';
  };
  _.latex = function() {
    if(BuiltInOpNames.hasOwnProperty(this.blocks[0].text())) //This is a built-in latex command
      return '\\' + this.blocks[0].latex() + '\\left({' + this.blocks[1].latex() + '}\\right)';
    else
      return '\\operatorname{' + this.blocks[0].latex() + '}\\left({' + this.blocks[1].latex() + '}\\right)';
  };
  _.parser = function() {
    var string = Parser.string;
    var optWhitespace = Parser.optWhitespace;
    var succeed = Parser.succeed;
    var block = latexMathParser.block;
    var fn = this.ctrlSeq;

    var self = this;
    var blocks = self.blocks = [ MathBlock(), MathBlock() ];
    for (var i = 0; i < blocks.length; i += 1) {
      blocks[i].adopt(self, self.ends[R], 0);
    }

    if(BuiltInOpNames.hasOwnProperty(this.ctrlSeq)) {
      for (var i = 0; i < fn.length; i += 1) {
        Letter(fn.charAt(i)).adopt(this.ends[L], this.ends[L].ends[R], 0);
      }
      return optWhitespace.then(string('\\left(')).then(function() {
        var child = blocks[1];
        return block.then(function (block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).then(string('\\right)')).result(self);
    } else {
      return optWhitespace.then(function() {
        var child = blocks[0];
        return block.then(function(block) {
          block.children().adopt(child, child.ends[R], 0);
          for(var node = block.ends[L]; node !== 0; node = node[R]) {
            if(node.ctrlSeq === 'f') 
              node.htmlTemplate = '<var>f</var>';
            else if((node instanceof SupSub) && (node.supsub === 'sub')) {
              for(var node2 = node.blocks[0].ends[L]; node2 !== 0; node2 = node2[R]) {
                if(node2.ctrlSeq === 'f') 
                  node2.htmlTemplate = '<var>f</var>';
              }
            }
          }
          return succeed(self);
        });
      }).then(string('\\left(')).then(function() {
        var child = blocks[1];
        return block.then(function (block) {
          block.children().adopt(child, child.ends[R], 0);
          return succeed(self);
        });
      }).then(string('\\right)')).result(self);
    }
  };
});
for (var fn in BuiltInOpNames) if (BuiltInOpNames.hasOwnProperty(fn)) {
  LatexCmds[fn] = OperatorName;
}

LatexCmds.f = P(Letter, function(_, super_) {
  _.init = function() {
    Symbol.p.init.call(this, this.letter = 'f', '<var class="mq-florin">&fnof;</var>');
  };
  _.createLeftOf = function(cursor) {
    if(cursor.parent && (cursor.parent.parent instanceof OperatorName) && (cursor.parent === cursor.parent.parent.blocks[0]))
      Letter('f').createLeftOf(cursor);
    else if(cursor.parent && cursor.parent.parent && (cursor.parent.parent instanceof SupSub) && (cursor.parent.parent.supsub === 'sub') && cursor.parent.parent.parent && (cursor.parent.parent.parent.parent instanceof OperatorName) && (cursor.parent.parent.parent === cursor.parent.parent.parent.parent.blocks[0]))
      Letter('f').createLeftOf(cursor);
    else
      super_.createLeftOf.call(this, cursor);
  };
});

// VanillaSymbol's
LatexCmds[' '] = LatexCmds.space = bind(VanillaSymbol, '\\ ', ' ');

LatexCmds["'"] = LatexCmds.prime = bind(VanillaSymbol, "'", '&prime;');

LatexCmds.backslash = bind(VanillaSymbol,'\\backslash ','\\');
if (!CharCmds['\\']) CharCmds['\\'] = LatexCmds.backslash;

var Currency = P(MathCommand, function(_, super_) {
  _.init = function(ch, text) {
    this.htmlTemplate = '<span><span>' + text + '</span><span>&0</span></span>';
    this.textTemplate = [' ' + text, ' ']; // BRENTAN- Determine how currency fits in to units?
    super_.init.call(this, ch);
  };
  _.finalizeTree = function() {
    this.ends[L].write = function(cursor, ch) {
      if (!RegExp(/[0-9\.]/).test(ch)) {
        cursor.insRightOf(this.parent);
      }
      MathBlock.p.write.apply(this, arguments);
    };
  };
});
LatexCmds.$ = bind(Currency,'\\$', '$');

// does not use Symbola font
var NonSymbolaSymbol = P(Variable, function(_, super_) {
  _.init = function(ch, html) {
    super_.init.call(this, ch, '<span class="mq-nonSymbola">'+(html || ch)+'</span>');
  };
});

LatexCmds['@'] = NonSymbolaSymbol;
LatexCmds['&'] = bind(NonSymbolaSymbol, '\\&', '&amp;');
LatexCmds['%'] = bind(NonSymbolaSymbol, '\\%', '%');


//the following are all Greek to me, but this helped a lot: http://www.ams.org/STIX/ion/stixsig03.html

//lowercase Greek letter variables
LatexCmds.alpha =
LatexCmds.beta =
LatexCmds.gamma =
LatexCmds.delta =
LatexCmds.zeta =
LatexCmds.eta =
LatexCmds.theta =
LatexCmds.iota =
LatexCmds.kappa =
LatexCmds.mu =
LatexCmds.nu =
LatexCmds.xi =
LatexCmds.rho =
LatexCmds.sigma =
LatexCmds.tau =
LatexCmds.chi =
LatexCmds.psi =
LatexCmds.omega = P(Variable, function(_, super_) {
  _.init = function(latex) {
    super_.init.call(this,'\\'+latex+' ','&'+latex+';');
  };
});

//why can't anybody FUCKING agree on these
LatexCmds.phi = //W3C or Unicode?
  bind(Variable,'\\phi ','&#981;');

LatexCmds.phiv = //Elsevier and 9573-13
LatexCmds.varphi = //AMS and LaTeX
  bind(Variable,'\\varphi ','&phi;');

LatexCmds.epsilon = //W3C or Unicode?
  bind(Variable,'\\epsilon ','&#1013;');

LatexCmds.epsiv = //Elsevier and 9573-13
LatexCmds.varepsilon = //AMS and LaTeX
  bind(Variable,'\\varepsilon ','&epsilon;');

LatexCmds.piv = //W3C/Unicode and Elsevier and 9573-13
LatexCmds.varpi = //AMS and LaTeX
  bind(Variable,'\\varpi ','&piv;');

LatexCmds.sigmaf = //W3C/Unicode
LatexCmds.sigmav = //Elsevier
LatexCmds.varsigma = //LaTeX
  bind(Variable,'\\varsigma ','&sigmaf;');

LatexCmds.thetav = //Elsevier and 9573-13
LatexCmds.vartheta = //AMS and LaTeX
LatexCmds.thetasym = //W3C/Unicode
  bind(Variable,'\\vartheta ','&thetasym;');

LatexCmds.upsilon = //AMS and LaTeX and W3C/Unicode
LatexCmds.upsi = //Elsevier and 9573-13
  bind(Variable,'\\upsilon ','&upsilon;');

//these aren't even mentioned in the HTML character entity references
LatexCmds.gammad = //Elsevier
LatexCmds.Gammad = //9573-13 -- WTF, right? I dunno if this was a typo in the reference (see above)
LatexCmds.digamma = //LaTeX
  bind(Variable,'\\digamma ','&#989;');

LatexCmds.kappav = //Elsevier
LatexCmds.varkappa = //AMS and LaTeX
  bind(Variable,'\\varkappa ','&#1008;');

LatexCmds.rhov = //Elsevier and 9573-13
LatexCmds.varrho = //AMS and LaTeX
  bind(Variable,'\\varrho ','&#1009;');

//Greek constants, look best in non-italicized Times New Roman
LatexCmds.pi = LatexCmds['π'] = bind(NonSymbolaSymbol,'\\pi ','&pi;');
LatexCmds.lambda = bind(NonSymbolaSymbol,'\\lambda ','&lambda;');

//uppercase greek letters

LatexCmds.Upsilon = //LaTeX
LatexCmds.Upsi = //Elsevier and 9573-13
LatexCmds.upsih = //W3C/Unicode "upsilon with hook"
LatexCmds.Upsih = //'cos it makes sense to me
  bind(Symbol,'\\Upsilon ','<var style="font-family: serif">&upsih;</var>'); //Symbola's 'upsilon with a hook' is a capital Y without hooks :(

//other symbols with the same LaTeX command and HTML character entity reference
LatexCmds.Gamma =
LatexCmds.Delta =
LatexCmds.Theta =
LatexCmds.Lambda =
LatexCmds.Xi =
LatexCmds.Pi =
LatexCmds.Sigma =
LatexCmds.Phi =
LatexCmds.Psi =
LatexCmds.Omega =
LatexCmds.forall = P(VanillaSymbol, function(_, super_) {
  _.init = function(latex) {
    super_.init.call(this,'\\'+latex+' ','&'+latex+';');
  };
});

// symbols that aren't a single MathCommand, but are instead a whole
// Fragment. Creates the Fragment from a LaTeX string
var LatexFragment = P(MathCommand, function(_) {
  _.init = function(latex) { this.latex = latex; };
  _.createLeftOf = function(cursor) {
    var block = latexMathParser.parse(this.latex);
    block.children().adopt(cursor.parent, cursor[L], cursor[R]);
    cursor[L] = block.ends[R];
    block.jQize().insertBefore(cursor.jQ);
    block.finalizeInsert(cursor.options, cursor);
    if (block.ends[R][R].siblingCreated) block.ends[R][R].siblingCreated(cursor.options, L);
    if (block.ends[L][L].siblingCreated) block.ends[L][L].siblingCreated(cursor.options, R);
    cursor.parent.bubble('reflow');
  };
  _.parser = function() {
    var frag = latexMathParser.parse(this.latex).children();
    return Parser.succeed(frag);
  };
});

// for what seems to me like [stupid reasons][1], Unicode provides
// subscripted and superscripted versions of all ten Arabic numerals,
// as well as [so-called "vulgar fractions"][2].
// Nobody really cares about most of them, but some of them actually
// predate Unicode, dating back to [ISO-8859-1][3], apparently also
// known as "Latin-1", which among other things [Windows-1252][4]
// largely coincides with, so Microsoft Word sometimes inserts them
// and they get copy-pasted into MathQuill.
//
// (Irrelevant but funny story: Windows-1252 is actually a strict
// superset of the "closely related but distinct"[3] "ISO 8859-1" --
// see the lack of a dash after "ISO"? Completely different character
// set, like elephants vs elephant seals, or "Zombies" vs "Zombie
// Redneck Torture Family". What kind of idiot would get them confused.
// People in fact got them confused so much, it was so common to
// mislabel Windows-1252 text as ISO-8859-1, that most modern web
// browsers and email clients treat the MIME charset of ISO-8859-1
// as actually Windows-1252, behavior now standard in the HTML5 spec.)
//
// [1]: http://en.wikipedia.org/wiki/Unicode_subscripts_andsuper_scripts
// [2]: http://en.wikipedia.org/wiki/Number_Forms
// [3]: http://en.wikipedia.org/wiki/ISO/IEC_8859-1
// [4]: http://en.wikipedia.org/wiki/Windows-1252
LatexCmds['¹'] = bind(LatexFragment, '^1');
LatexCmds['²'] = bind(LatexFragment, '^2');
LatexCmds['³'] = bind(LatexFragment, '^3');
LatexCmds['¼'] = bind(LatexFragment, '\\frac14');
LatexCmds['½'] = bind(LatexFragment, '\\frac12');
LatexCmds['¾'] = bind(LatexFragment, '\\frac34');

var PlusMinus = P(BinaryOperator, function(_) {
  _.init = VanillaSymbol.prototype.init;

  _.contactWeld = _.siblingCreated = _.siblingDeleted = function(opts, dir) {
    if (dir === R) return; // ignore if sibling only changed on the right
    this.jQ[0].className =
      (!this[L] || this[L] instanceof BinaryOperator ? '' : 'mq-binary-operator');
    return this;
  };
});
var Multiplication = P(BinaryOperator, function(_, super_) {
  _.finalizeTree = function() {
    if(this[L] && (this[L].ctrlSeq === '.')) {
      var to_remove = [this[L]];
      if(this[L][L] && this[L][L][L] && (this[L][L].ctrlSeq === '0') && (this[L][L][L].ctrlSeq === '\\cdot ')) {
        // Deal with added 0 and implicit multiplication
        to_remove.push(this[L][L]);
        to_remove.push(this[L][L][L]);
      }
      for(var i=0; i < to_remove.length; i++)
        to_remove[i].remove();
      this.jQ.html("&#8857;");
      this.jQ.addClass("mq-multiply-elementWise");
      this.ctrlSeq = '.' + this.ctrlSeq;
      this.textTemplate = '.' + this.textTemplate;
    }
  }
});

LatexCmds['+'] = bind(PlusMinus, '+', '+');
//yes, these are different dashes, I think one is an en dash and the other is a hyphen
LatexCmds['–'] = LatexCmds['-'] = bind(PlusMinus, '-', '&minus;');
LatexCmds['±'] = LatexCmds.pm = LatexCmds.plusmn = LatexCmds.plusminus =
  bind(PlusMinus,'\\pm ','&plusmn;');
LatexCmds.mp = LatexCmds.mnplus = LatexCmds.minusplus =
  bind(PlusMinus,'\\mp ','&#8723;');

CharCmds['*'] = LatexCmds.sdot = LatexCmds.cdot =
  bind(Multiplication, '\\cdot ', '&middot;', '*');
//semantically should be &sdot;, but &middot; looks better

var Inequality = P(BinaryOperator, function(_, super_) {
  _.init = function(data, strict) {
    this.data = data;
    this.strict = strict;
    var strictness = (strict ? 'Strict' : '');
    super_.init.call(this, data['ctrlSeq'+strictness], data['html'+strictness],
                     data['text'+strictness]);
  };
  _.swap = function(strict) {
    this.strict = strict;
    var strictness = (strict ? 'Strict' : '');
    this.ctrlSeq = this.data['ctrlSeq'+strictness];
    this.jQ.html(this.data['html'+strictness]);
    this.textTemplate = [ this.data['text'+strictness] ];
  };
  _.deleteTowards = function(dir, cursor) {
    if (dir === L && !this.strict) {
      this.swap(true);
      return;
    }
    super_.deleteTowards.apply(this, arguments);
  };
});

var less = { ctrlSeq: '\\le ', html: '&le;', text: ' <= ',
             ctrlSeqStrict: '<', htmlStrict: '&lt;', textStrict: ' < ' };
var greater = { ctrlSeq: '\\ge ', html: '&ge;', text: ' >= ',
                ctrlSeqStrict: '>', htmlStrict: '&gt;', textStrict: ' > ' };
var factorial = { ctrlSeq: '\\ne ', html: '&ne;', text: ' != ',
                  ctrlSeqStrict: '!', htmlStrict: '!', textStrict: '!' };

LatexCmds['<'] = LatexCmds.lt = bind(Inequality, less, true);
LatexCmds['>'] = LatexCmds.gt = bind(Inequality, greater, true);
LatexCmds['≤'] = LatexCmds.le = LatexCmds.leq = bind(Inequality, less, false);
LatexCmds['≥'] = LatexCmds.ge = LatexCmds.geq = bind(Inequality, greater, false);
LatexCmds['!'] = bind(Inequality, factorial, true);
LatexCmds['≠'] = LatexCmds.ne = LatexCmds.neq = bind(Inequality, factorial, false);

var Equality = P(Inequality, function(_, super_) {
  _.init = function(data, strict) {
    super_.init.call(this, data, strict);
  };
  _.createLeftOf = function(cursor) {
    if (((cursor[L] instanceof Inequality) || (cursor[L] instanceof Equality)) && cursor[L].strict) {
      cursor[L].swap(false);
      return;
    }
    super_.createLeftOf.apply(this, arguments);
  };
});
var equal = { ctrlSeq: '\\eq ', html: '==', text: ' == ',
              ctrlSeqStrict: '=', htmlStrict: '=', textStrict: ' := ' };
LatexCmds['='] = bind(Equality, equal, true);
LatexCmds.eq = bind(Equality, equal, false);

LatexCmds.times = bind(BinaryOperator, '\\times ', '&times;', '[x]');

LatexCmds['÷'] = LatexCmds.div = LatexCmds.divide = LatexCmds.divides =
  bind(BinaryOperator,'\\div ','&divide;', '[/]');
