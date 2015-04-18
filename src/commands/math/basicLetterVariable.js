
var Variable = P(Symbol, function(_, super_) {
  _.init = function(ch, html, text) {
    super_.init.call(this, ch, '<var>'+(html || ch)+'</var>');
  };
  _.text = function(opts) {
    if(opts && opts.unit && !(this[L] instanceof Variable) && !(this[L] && this[L].ctrlSeq == 'µ')) return "_" + this.textTemplate;
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
  _.fullWord = function() {
    var word = this.text({})+'';
    var letters = [this];
    // Move to the left
    for (var l = this[L]; l instanceof Variable; l = l[L]) {
      letters.unshift(l);
      word = l.text({}) + word;
    }
    // Are we in a substring?
    if(this.parent && (this.parent.parent instanceof SupSub) && (this.parent.parent.supsub === 'sub')) {
      word = '_' + word;
      letters = [this.parent.parent];
      for (var l = this.parent.parent[L]; l instanceof Variable; l = l[L]) {
        letters.unshift(l);
        word = l.text({}) + word;
      }
    }
    // Move to the right
    for (var l = this[R]; l instanceof Variable; l = l[R]) {
      letters.push(l);
      word += l.text({});
    }
    // Did we hit a substring section?
    if((l instanceof SupSub) && (l.supsub === 'sub')) {
      word += '_';
      letters.push(l);
      for (var l = l.ends[L].ends[L]; l instanceof Variable; l = l[R]) 
        word += l.text({});
    }
    return [word, letters];
  };
  _.finalizeTree = function() {
    this.autoComplete();
  }
  _.autoComplete = function() {
    // Autocomplete functionality.  Look for autocomplete options and, if found, show in popup that can be navigated
    if(!this.controller) this.getController();
    var output = this.fullWord();
    var word = output[0];
    var letters = output[1];
    var matchList = [];
    var regex = new RegExp("^" + word + ".*$", "i");
    if((this.parent.unit) || (this.parent.parent && this.parent.parent.unit)) {
      // Units
      if(word.length == 1) regex = new RegExp("^" + word + "$", ""); // Exact match for 1 letter autocomplete (for things like 'm' -> meter)
      if(word.length > 0) {
        prefix_to_ignore = ['micro', 'yocto', 'zepto', 'atto', 'femto', 'pico', 'nano', 'milli', 'centi', 'deci', 'deca', 'hecto', 'kilo', 'mega', 'giga', 'tera', 'peta', 'exa', 'zetta', 'yotta'];
        skip_this = false;
        var capitalize = function(s) {
          return s[0].toUpperCase() + s.slice(1);
        };
        for(var i = 0; i < prefix_to_ignore.length; i++) 
          if(prefix_to_ignore[i].match(regex)) { skip_this = true; break; }
        if(!skip_this) {
          var unitList = this.controller.API.__options.unitList || {names: [], symbols: []};
          var already_added = {};
          for(var i = 0; i < unitList.symbols.length; i++)
            if(unitList.symbols[i].match(regex)) {
              matchList.push("<li data-word='" + unitList.symbols[i] + "'><span class='mq-operator-name'>" + unitList.symbols[i] + " (" + capitalize(unitList.symbol_to_name[unitList.symbols[i]]) + ")</span></li>");
              already_added[unitList.symbols[i]] = true;
            }
          for(var i = 0; i < unitList.names.length; i++)
            if(unitList.names[i].match(regex) && !already_added[unitList.name_to_symbol[unitList.names[i]]]) matchList.push("<li data-word='" + unitList.name_to_symbol[unitList.names[i]] + "'><span class='mq-operator-name'>" + unitList.name_to_symbol[unitList.names[i]] + " (" + capitalize(unitList.names[i]) + ")</span></li>");
        }
      }
    } else {
      // Variable or Function name
      if(word.length > 0) {
        var wordList = [];
        var commandList = [];
        var pretext = '';
        if(this.parent && (this.parent.parent instanceof FunctionCommand) && (this.parent === this.parent.parent.ends[R])) {
          // In a FunctionCommand, we only autocomplete the method calls that are public for that object
          wordList = this.parent.parent.getObject().propertyList;
          commandList = this.parent.parent.getObject().methodList;
          pretext = this.parent.parent.objectName() + '.';
        } else {
          if(word.length < 3) return; // Only autocomplete on 3 characters or more
          // Get the provided list of words and commands to autocomplete
          wordList = this.controller.API.__options.autocomplete || [];
          commandList = this.controller.API.__options.staticAutocomplete || [];
        }
        var formatter = function(text, self) {
          var autoCommands = Object.keys(self.controller.API.__options.autoCommands);
          for(var i = 0; i < autoCommands.length; i++) {
            if(text === autoCommands[i]) {
              text = LatexCmds[autoCommands[i]](autoCommands[i]).htmlTemplate;
              break;
            } else text = text.replace(new RegExp('^' + autoCommands[i] + '_',''), LatexCmds[autoCommands[i]](autoCommands[i]).htmlTemplate + '_');

          }
          text = (text.indexOf('_') > -1 ? text.replace('_','<sub>')+'</sub>' : text);
          if(text.indexOf('.') > -1) 
            text = text.replace('.','') + ".<span class='mq-inline-box'></span>";  //BRENTAN- better visual than this box after the period?
          return text;
        }
        //Find all matches
        for(var i = 0; i < wordList.length; i++)
          if(wordList[i].match(regex)) matchList.push("<li data-word='" + wordList[i] + "'><span class='mq-nonSymbola'><i>" + pretext + formatter(wordList[i], this) + "</i></span></li>");
        for(var i = 0; i < commandList.length; i++)
          if(commandList[i].match(regex)) matchList.push("<li data-word='" + commandList[i] + "('><span class='mq-nonSymbola'><i>" + pretext + "</i></span><span class='mq-operator-name'>" + (commandList[i].indexOf('_') > -1 ? commandList[i].replace('_','<sub>')+'</sub>' : commandList[i]) + "(<span class='mq-inline-box'></span>)</span></li>");
      }
    }
    if(matchList.length > 0) {
      matchList[0] = matchList[0].replace('<li', '<li class="mq-popup-selected"');
      if(this.parent && (this.parent.parent instanceof FunctionCommand) && (this.parent === this.parent.parent.ends[R]))
        var leftBlock = this.parent.parent.jQ;
      else
        var leftBlock = letters[0].jQ;
      var topBlock = letters[letters.length - 1].jQ;
      var leftOffset = leftBlock.position();
      var topOffset = topBlock.position();
      var _this = this;
      var onclick = function() {
        var word = $(this).attr('data-word');
        var to_replace = _this.fullWord()[1];
        var right_of = to_replace[0][L];
        var right_end_of = to_replace[0].parent;
        for(var i = 0; i < to_replace.length; i++) to_replace[i].remove();
        if(right_of) _this.controller.cursor.insRightOf(right_of);
        else _this.controller.cursor.insAtRightEnd(right_end_of);
        _this.controller.API.typedText(word);
        if(word[word.length - 1] === '.')
          FunctionCommand(true).createLeftOf(_this.controller.cursor);
        _this.controller.closePopup();
        if((word[word.length - 1] !== '(') && (word[word.length - 1] !== '.') && _this.controller.cursor.parent && (_this.controller.cursor.parent.parent instanceof SupSub) && (_this.controller.cursor.parent.parent.supsub === 'sub')) 
          _this.controller.cursor.insRightOf(_this.controller.cursor.parent.parent);
        _this.controller.cursor.workingGroupChange();
      };
      this.controller.createPopup('<ul>' + matchList.join('\n') + '</ul>', topOffset.top + topBlock.height(), leftOffset.left, onclick);
    } else
      this.controller.closePopup();
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
  //dict._maxLength = maxLength;
  return dict;
};

var Letter = P(Variable, function(_, super_) {
  _.init = function(ch) { 
    return super_.init.call(this, this.letter = ch); 
  };
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
  _.createLeftOf = function(cursor) {
    if((this.ctrlSeq == 'u') && (cursor.parent.unit || (cursor.parent.parent && cursor.parent.parent.unit)) && !(cursor[L] instanceof Variable) && !(cursor[L] && (cursor[L].ctrlSeq == 'µ'))) 
      Letter('µ').createLeftOf(cursor);
    else if(cursor[L] && cursor[L][L] && (cursor[L].ctrlSeq === '.') && (cursor[L][L] instanceof Variable)) {
      FunctionCommand(this.ctrlSeq).createLeftOf(cursor);
    } else
      super_.createLeftOf.apply(this, arguments);
  }
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
optionProcessors.unitList = function(units) {
  var by_name = {};
  var by_symbol = {};
  var names = [];
  var symbols = [];
  var prefix = {micro: 'µ', yocto: 'y', zepto: 'z', atto: 'a', femto: 'f', pico: 'p', nano: 'n', milli: 'm', centi: 'c', deci: 'd', deca: 'D', hecto: 'h', kilo: 'k', mega: 'M', giga: 'G', tera: 'T', peta: 'P', exa: 'E', zetta: 'Z', yotta: 'Y' };
  for(var i = 0; i < units.length; i++) {
    names.push(units[i].name);
    symbols.push(units[i].symbol);
    by_name[units[i].name] = units[i].symbol;
    by_symbol[units[i].symbol] = units[i].name;
    if(units[i].prefix) {
      for(var key in prefix) {
        names.push(key + units[i].name);
        symbols.push(prefix[key] + units[i].symbol);
        by_name[key + units[i].name] = prefix[key] + units[i].symbol;
        by_symbol[prefix[key] + units[i].symbol] = key + units[i].name;
      }
    }
  }
  var sortFunction = function (a, b) {
    return a.toLowerCase().localeCompare(b.toLowerCase());
  };
  return { name_to_symbol: by_name, symbol_to_name: by_symbol, names: names.sort(sortFunction), symbols: symbols.sort(sortFunction) }
}

LatexCmds.µ = P(VanillaSymbol, function(_, super_) {  //Do this for units, so that mu becomes a letter in the unit box
  _.init = function() {
    super_.init.call(this, 'µ');
  }
  _.createLeftOf = function(cursor) {
    if(cursor.parent.unit || (cursor.parent.parent && cursor.parent.parent.unit))
      Letter('µ').createLeftOf(cursor);
    else
      super_.createLeftOf.call(this, cursor);
  };
});
LatexCmds['2'] = P(VanillaSymbol, function(_, super_) {  //Do this for units, so that 2 becomes a letter in the unit box (inH2O)
  _.init = function() {
    super_.init.call(this, '2');
  }
  _.createLeftOf = function(cursor) {
    if((cursor.parent && cursor.parent.parent && cursor.parent.parent instanceof Unit) || (cursor.parent && cursor.parent.parent && cursor.parent.parent.unit && !(cursor.parent.parent instanceof SupSub))) {
      if(cursor[L] && (cursor[L].ctrlSeq === 'H'))
        Letter('2').createLeftOf(cursor);
      else
        cursor.parent.flash();
    }
    else
      super_.createLeftOf.call(this, cursor);
  };
});

LatexCmds.f = P(Letter, function(_, super_) {
  _.init = function() {
    Symbol.p.init.call(this, this.letter = 'f', '<var class="mq-florin">&fnof;</var>');
  };
  _.createLeftOf = function(cursor) {
    if(cursor.parent && (cursor.parent.parent instanceof OperatorName) && (cursor.parent === cursor.parent.parent.blocks[0]))
      Letter('f').createLeftOf(cursor);
    else if(cursor.parent && cursor.parent.parent && (cursor.parent.parent instanceof SupSub) && (cursor.parent.parent.supsub === 'sub') && cursor.parent.parent.parent && (cursor.parent.parent.parent.parent instanceof OperatorName) && (cursor.parent.parent.parent === cursor.parent.parent.parent.parent.blocks[0]))
      Letter('f').createLeftOf(cursor);
    else if(cursor.parent.unit || (cursor.parent.parent && cursor.parent.parent.unit))
      Letter('f').createLeftOf(cursor);
    else
      super_.createLeftOf.call(this, cursor);
  };
});
