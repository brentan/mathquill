/*********************************
 * Symbols for Basic Mathematics
 ********************************/

// VanillaSymbol's
LatexCmds[','] = bind(BinaryOperator, ',', ',&nbsp;');
LatexCmds.whitespace = bind(VanillaSymbol, '\\space ', '&nbsp;');
LatexCmds.percentSymbol = bind(VanillaSymbol, '\\percentSymbol ', '%');

LatexCmds.backslash = bind(VanillaSymbol,'\\backslash ','\\');
if (!CharCmds['\\']) CharCmds['\\'] = LatexCmds.backslash;


// does not use Symbola font
var NonSymbolaSymbol = P(Variable, function(_, super_) {
  _.init = function(ch, html) {
    super_.init.call(this, ch, '<span class="mq-nonSymbola">'+(html || ch)+'</span>');
  };
});

LatexCmds['@'] = NonSymbolaSymbol;
LatexCmds['&'] = bind(NonSymbolaSymbol, '\\&', '&amp;');
//LatexCmds['%'] = bind(NonSymbolaSymbol, '\\%', '%');


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

// Temperatures
LatexCmds.deltaF = bind(Variable, '\\deltaF', "&Delta;&deg;F","deltaF");
LatexCmds.deltaC = bind(Variable, '\\deltaC', "&Delta;&deg;C","deltaC");
LatexCmds.deltaK = bind(Variable, '\\deltaK', "K","deltaK");
LatexCmds.deltaRankine = bind(Variable, '\\deltaRankine', "Rankine","deltaRankine");
LatexCmds.degF = bind(Variable, '\\degF', "&deg;F","degF");
LatexCmds.degC = bind(Variable, '\\degC', "&deg;C","degC");

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
LatexCmds.forall = P(Variable, function(_, super_) {
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
var DotPlus = P(PlusMinus, function(_) {
  _.textOutput = function(opts) {
    if(!this[L] || (this[L] instanceof BinaryOperator))
      return [{text: '+'}]
    return [{text: ' .+'}]
  }
});
var DotMinus = P(PlusMinus, function(_) {
  _.textOutput = function(opts) {
    if(!this[L] || (this[L] instanceof BinaryOperator))
      return [{text: '-'}]
    return [{text: " .-"}]
  }
});
var Multiplication = P(BinaryOperator, function(_, super_) {
  _.addedImplicitly = false;
  _.finalizeTree = function() {
    if(this[L] && (this[L].ctrlSeq === '.') && !this.addedImplicitly) {
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
    } else if(this[L] && (this[L].ctrlSeq === '.')) {
      this[L].remove();
    }
  }
  _.implicit = function() {
    this.addedImplicitly = true;
    return this;
  }
});

LatexCmds['+'] = bind(DotPlus, '+', '+');
//yes, these are different dashes, I think one is an en dash and the other is a hyphen
LatexCmds['–'] = LatexCmds['-'] = bind(DotMinus, '-', '&minus;');
LatexCmds['±'] = LatexCmds.pm = LatexCmds.plusmn = LatexCmds.plusminus =
  bind(PlusMinus,'\\pm ','&plusmn;');
LatexCmds.mp = LatexCmds.mnplus = LatexCmds.minusplus =
  bind(PlusMinus,'\\mp ','&#8723;');

CharCmds['*'] = LatexCmds.sdot = LatexCmds.cdot =
  bind(Multiplication, '\\cdot ', '&middot;', '*');
//semantically should be &sdot;, but &middot; looks better

var EqualityInequality = P(BinaryOperator, function(_, super_) {
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
    this.htmlTemplate = '<span class="mq-binary-operator">' + this.data['html'+strictness] + '</span>';
    this.jQ.html(this.data['html'+strictness]);
    this.textTemplate = [ this.data['text'+strictness] ];
  };
  _.deleteTowards = function(dir, cursor) {
    if (!(this instanceof Equality) && (dir === L) && !this.strict) {
      this.swap(true);
      return;
    }
    super_.deleteTowards.apply(this, arguments);
  };
});
var Inequality = P(EqualityInequality, function(_, super_) {
  _.textOutput = function(opts) {
    // Test if this is 1<x<3 type of format...text output should convert to 1<x && x<3 format that emgiac understands
    // Move left and see if we ever hit another inequality
    var inequality_string = false;
    var to_add = [];
    for (var l = this[L]; l != 0; l = l[L]) { 
      if(l instanceof Inequality) {
        inequality_string = true;
        break;
      } else if(l instanceof LogicOperator) break; // x<3 and y<5 shouldn't by caught by this
      else if(l instanceof Equality) break; 
      else if((l instanceof BinaryOperator) && (l.ctrlSeq == ',')) break;
      to_add.push(l);
    }
    var repeat_word = [];
    // If we are a sandwhiched inequality, we can add these together now
    if(inequality_string) {
      repeat_word.push({text: " and "});
      for(var i = (to_add.length-1); i >= 0; i--) {
        var textout = to_add[i].textOutput(opts)
        for(var j = 0; j < textout.length; j++)
          repeat_word.push(textout[j]);
      }
    }
    repeat_word.push({text: this.textTemplate[0]});
    return repeat_word;
  }
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

var Equality = P(EqualityInequality, function(_, super_) {
  _.init = function(data, strict) {
    super_.init.call(this, data, strict);
  };
  _.convertToAssignment = function(cursor) {
    if(!cursor.controller.API.__options.expression_mode && (cursor.parent == cursor.controller.root)) {
      if((cursor[L] instanceof OperatorName) && (cursor[L][L] === 0)) return true;
      else if((cursor[L] instanceof FunctionCommand) && (cursor[L][L] === 0)) {
        var start_test = cursor[L].blocks[1].ends[R];
        var all_letters = true;
        if((start_test instanceof SupSub) && (start_test.supsub == 'sub')) start_test = start_test[L];
        else if((start_test instanceof Bracket) && (start_test.sides[L].ctrlSeq == '[')) start_test = start_test[L];
        else if((start_test instanceof Matrix) && (start_test.row == 1)) start_test = start_test[L];
        else if((start_test instanceof Accent)) {
          start_test = start_test.ends[R] ? start_test.ends[R].ends[R] : start_test.ends[R];
          if((start_test instanceof SupSub) && (start_test.supsub == 'sub')) start_test = start_test[L];
        }
        if(start_test === 0) all_letters = false;
        for(var l = start_test; l !== 0; l = l[L]) {
          if(l instanceof Accent) l = l.ends[R] ? l.ends[R].ends[R] : l.ends[R];
          if(!(l instanceof Variable) && !(l instanceof NonSymbolaSymbol)) { all_letters = false; break }
          if((l[L] == 0) && (l.parent && l.parent.parent instanceof Accent)) l = l.parent.parent;
        }
        if(all_letters) return true;
      } else {
        var start_test = cursor[L];
        var all_letters = true;
        if((start_test instanceof SupSub) && (start_test.supsub == 'sub')) start_test = start_test[L];
        else if((start_test instanceof Bracket) && (start_test.sides[L].ctrlSeq == '[')) start_test = start_test[L];
        else if((start_test instanceof Matrix) && (start_test.row == 1)) start_test = start_test[L];
        else if((start_test instanceof Accent)) {
          start_test = start_test.ends[R] ? start_test.ends[R].ends[R] : start_test.ends[R];
          if((start_test instanceof SupSub) && (start_test.supsub == 'sub')) start_test = start_test[L];
        }
        if(start_test === 0) all_letters = false;
        for(var l = start_test; l !== 0; l = l[L]) {
          if(l instanceof Accent) l = l.ends[R] ? l.ends[R].ends[R] : l.ends[R];
          if(!(l instanceof Variable) && !(l instanceof NonSymbolaSymbol)) { all_letters = false; break }
          if((l[L] == 0) && (l.parent && l.parent.parent instanceof Accent)) l = l.parent.parent;
        }
        if(all_letters) return true;
      }
    } 
    return false;
  }
  _.createLeftOf = function(cursor) {
    if ((cursor[L] instanceof Inequality) && cursor[L].strict) {
      cursor[L].swap(false);
      return;
    } 
    if(cursor[L] instanceof Equality) {
      cursor[L].swap(!cursor[L].strict);
      return;
    }
    if(!this.convertToAssignment(cursor))
      this.swap(false);
    super_.createLeftOf.apply(this, arguments);
  };
  _.textOutput = function(opts) {
    var repeat_word = [];
    if(!this.controller) this.getController();
    if(this.controller.API.__options.expression_mode)
      repeat_word.push({text: " == "}); // Force in expression mode
    else
      repeat_word.push({text: this.textTemplate[0]});
    return repeat_word;
  }
});
var equal = { ctrlSeq: '\\eq ', html: '=', text: ' == ',
              ctrlSeqStrict: '=', htmlStrict: '&#8801;', textStrict: ' := ' };
LatexCmds['='] = bind(Equality, equal, true);
LatexCmds.eq = bind(Equality, equal, false);

LatexCmds.times = bind(BinaryOperator, '\\times ', '&times;', '[x]');

LatexCmds['÷'] = LatexCmds.div = LatexCmds.divide = LatexCmds.divides =
  bind(BinaryOperator,'\\div ','&divide;', '[/]');
