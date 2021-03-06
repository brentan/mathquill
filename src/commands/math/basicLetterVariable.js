var timeout_holder = false;
var Variable = P(Symbol, function(_, super_) {
  _.init = function(ch, html, text) {
    super_.init.call(this, ch, '<var>'+(html || ch)+'</var>');
  };
  _.textOutput = function(opts) {
    var out = this.textTemplate;
    if(opts && opts.unit && !(this[L] instanceof Variable) && !(this[L] && this[L].ctrlSeq == 'µ') && (this.ctrlSeq != '2')) out = "_" + out;
    return [{text: out}];
  };
  _.autoUnItalicize = function(cursor) {
    if(!this.controller) this.getController();
    return this.controller.autoUnItalicize(this, cursor);
  };
  _.renameVariable = function(controller, old_name, new_name) {
    if(this[L] instanceof Variable) return;
    if(this.parent && this.parent.parent && (this.parent.parent instanceof SupSub) && (this.parent.parent.supsub == 'sub')) return;
    if((this.parent.unit) || (this.parent.parent && this.parent.parent.unit)) return;
    if(this.parent && this.parent.parent && (this.parent.parent instanceof FunctionCommand) && (this.parent == this.parent.parent.blocks[1])) return; // Second part of function command
    var fullWord = this.fullWord();
    if(fullWord[0] == old_name) {
      //I need to be renamed!
      controller.cursor.insLeftOf(fullWord[1][0]);
      controller.setUndoPoint();
      controller.cursor.startSelection();
      controller.cursor.insRightOf(fullWord[1][fullWord[1].length-1]);
      controller.cursor.select();
      controller.paste(window.SwiftCalcsLatexHelper.VarNameToLatex(new_name));
      controller.cursor.hide(); 
    }
  }
  _.fullWord = function() {
    if(!this.controller) this.getController();
    return this.controller.findFullWord(this);
  };
  _.finalizeTree = function() {
    this.autoComplete();
  }
  _.autoComplete = function() {
    // Autocomplete functionality.  Look for autocomplete options and, if found, show in popup that can be navigated
    if(!this.controller) this.getController();
    if(!this.controller.showPopups) return;
    if(this.controller.autocompleteTimeout) window.clearTimeout(this.controller.autocompleteTimeout);
    this.controller.autocompleteTimeout = false;
    var output = this.fullWord();
    var word = output[0].replace(/~[a-z]~/,"");
    var letters = output[1];
    var matchList = [];
    var word_regex = new RegExp("(" + word + ")", "gi");
    var regex = new RegExp("^.*" + word + ".*$", "i");
    var regexs = new RegExp("^" + word + ".*$", "i");
    var regexe = new RegExp("^" + word + ".*$", "");
    var capitalize = function(s) {
      return s[0].toUpperCase() + s.slice(1);
    };
    if((this.parent.unit) || (this.parent.parent && this.parent.parent.unit)) {
      // Units
      if(word.length == 1) {
        regexs = new RegExp("^" + word + "$", ""); // Exact match for 1 letter autocomplete (for things like 'm' -> meter)
        regex = new RegExp("^" + word + "$", ""); 
        regexe = new RegExp("^" + word + "$", "");
      } else if(word.length == 2)
        regex = new RegExp("^" + word + ".*$", "i");
      if(word.length > 0) {
        prefix_to_ignore = ['micro', 'yocto', 'zepto', 'atto', 'femto', 'pico', 'nano', 'milli', 'centi', 'deci', 'deca', 'hecto', 'kilo', 'mega', 'giga', 'tera', 'peta', 'exa', 'zetta', 'yotta'];
        skip_this = false;
        for(var i = 0; i < prefix_to_ignore.length; i++) 
          if(prefix_to_ignore[i].match(regex)) { skip_this = true; break; }
        if(!skip_this) {
          var unitList = this.controller.API.__options.unitList || {names: [], symbols: []};
          var already_added = {};
          for(var i = 0; i < unitList.symbols.length; i++)
            if(unitList.symbols[i].match(regex)) {
              matchList.push({match: unitList.symbols[i], html: "<li data-word='" + unitList.symbols[i] + "'><span class='mq-operator-name'>" + unitList.symbols[i].replace(word_regex, "<b>$1</b>").replace(/<b>([a-z]*)_([a-z]*)<\/b>/i,"<b>$1</b>_<b>$2</b>") + " (" + capitalize(unitList.symbol_to_name[unitList.symbols[i]]) + ")</span></li>"});
              already_added[unitList.symbols[i]] = true;
            }
          for(var i = 0; i < unitList.names.length; i++)
            if(unitList.names[i].match(regex) && !already_added[unitList.name_to_symbol[unitList.names[i]]]) matchList.push({match: unitList.names[i], html: "<li data-word='" + unitList.name_to_symbol[unitList.names[i]] + "'><span class='mq-operator-name'>" + unitList.name_to_symbol[unitList.names[i]] + " (" + capitalize(unitList.names[i].replace(word_regex, "<b>$1</b>").replace(/<b>([a-z]*)_([a-z]*)<\/b>/i,"<b>$1</b>_<b>$2</b>")) + ")</span></li>"});
        }
      }
    } else {
      // Variable or Function name
      if(word.length > 0) {
        var wordList = [];
        var commandList = [];
        var functionlist = [];
        var pretext = '';
        var showHTML = false;
        if((this.parent && (this.parent.parent instanceof FunctionCommand) && (this.parent === this.parent.parent.ends[R])) ||
          (this.parent && (this.parent.parent instanceof SupSub) && this.parent.parent.parent && (this.parent.parent.parent.parent instanceof FunctionCommand) && (this.parent.parent.parent === this.parent.parent.parent.parent.ends[R]))) {
          // In a FunctionCommand, we only autocomplete the method calls that are public for that object
          var func_command = (this.parent.parent instanceof FunctionCommand) ? this.parent.parent : this.parent.parent.parent.parent;
          wordList = func_command.getObject().propertyList.slice(0);
          commandList = func_command.getObject().methodList.slice(0);
          unitList = {names: [], symbols: []};
          pretext = window.SwiftCalcsLatexHelper.VarNameToHTML(func_command.objectName()) + ':';
        } else {
          if((word.length < 3) && (word.indexOf('_') == -1)) 
            regex = new RegExp("^" + word + "$", "i"); // Only exact matches on 1 or 2 characters
          if(word == 'and') return this.controller.closePopup(); // ignore 'and'
          showHTML = true;
          var allwords = (this.controller.element && this.controller.element.autocomplete) ? this.controller.element.autocomplete() : (this.controller.API.__options.autocomplete || []);
          commandList = this.controller.API.__options.staticAutocomplete.slice(0) || [];
          for(var i = 0; i < allwords.length; i++) {
            if(this.controller.element && this.controller.element.independent_vars && (this.controller.element.independent_vars.indexOf(allwords[i])>-1)) continue;
            if(allwords[i].match(/\($/)) commandList.push(allwords[i].replace("(",""));
            else wordList.push(allwords[i]);
          } 
          unitList = this.controller.API.__options.unitList || {names: [], symbols: []};
          if((this.controller.root.ends[L] instanceof OperatorName) && (this.controller.root.ends[L][R] instanceof Equality) && this.controller.root.ends[L][R].strict // We are on a line where we are defining a function...we should add the function variable list to the word list
            && this.controller.cursor && this.controller.cursor.parent && (this.controller.cursor.parent.parent != this.controller.root.ends[L]) // Cursor is not in the function definition (no sub check)
            && (!(this.controller.cursor.parent.parent && this.controller.cursor.parent.parent.parent) || (this.controller.cursor.parent.parent.parent.parent != this.controller.root.ends[L]))) { // Cursor is not in the function definition (sub check)
            var var_list = this.controller.root.ends[L].blocks[1].text({}).split(',');
            for(var i = 0; i < var_list.length; i++) {
              if(var_list[i].trim().match(/^[a-z][a-z0-9_~]*$/i)) {
                var var_name = var_list[i].trim();
                var add_it = true;
                for(var j = 0; j < wordList.length; j++) 
                  if(var_name == wordList[j]) { add_it = false; break; }
                for(var j = 0; j < functionlist.length; j++) 
                  if(var_name == functionlist[j]) { add_it = false; break; }
                if(add_it) functionlist.push(var_list[i].trim());
              }
            }
          }
        }
        var formatter = function(text, to_match, self) {
          if(text.lastIndexOf("~") > -1) {
            var ind = text.lastIndexOf("~");
            var start = text.substr(0,ind);
            var ending = text.substr(ind+1);
            if(start.lastIndexOf("~") > -1) { 
              ind = start.lastIndexOf("~");
              var command = start.substr(ind+1);
              start = start.substr(0,ind);
              return "<span style='display: inline-block;'><span style='display:block;line-height:.25em;font-size:0.75em;text-align:center;'>" + accentCodes(command) + "</span><span style='display:block;'>" + formatter(start, to_match, self) + "</span></span>" + formatter(ending, to_match, self);
            }     
          } 
          text = window.SwiftCalcsLatexHelper.VarNameToHTML(text).replace("<sub>","<_>").replace("</sub>","</_>");
          to_match = to_match.split("_");
          for(var i = 0; i < to_match.length; i++)
            if(to_match[i].length) text = text.replace(new RegExp("(" + to_match[i] + ")","gi"), "*$1\\*").replace(/&([a-z0-9#\*\\]*)\\\*([a-z0-9#]*);/gi,"&$1$2;\\*").replace(/&([a-z0-9#]*)\*([a-z0-9#\\\*]*);/gi,"*&$1$2;").replace(/&([a-z0-9#]*)\\?\*([a-z0-9#]*)\\?\*([a-z0-9#]*);/gi,"&$1$2$3;");
          if(text.indexOf(':') > -1) 
            text = text.replace(':','') + ":<span class='mq-inline-box'></span>";  //BRENTAN- better visual than this box after the period?
          return text.replace("<_>","<sub>").replace("</_>","</sub>").replace(/\\\*/g,"</b>").replace(/\*/g,"<b>");
        }
        var toHTML_list = [];
        var count = 0;
        var varVal = function(command, self) {
          if(showHTML && self.controller.element && self.controller.element.varHelp) {
            toHTML_list.push({id: count, command: command});
            return "</td><td class='autoHTML autoHTML" + (count++) + "'><i class='fa fa-spinner fa-pulse'></i>";
          }
          return "";
        }
        //Find all matches
        for(var i = 0; i < functionlist.length; i++)
          if(functionlist[i].replace(/~[a-z]~/,"").match(regex)) matchList.push({match: functionlist[i], html: "<li data-word='" + functionlist[i] + "'><table><tbody><tr><td><span class='mq-nonSymbola'><i>" + pretext + formatter(functionlist[i], word, this) + "</i></span></td></tr></tbody></table></li>"});
        for(var i = 0; i < wordList.length; i++) 
          if(wordList[i].replace(/~[a-z]~/,"").match(regex)) matchList.push({match: wordList[i], html: "<li data-word='" + wordList[i] + "'><table><tbody><tr><td><span class='mq-nonSymbola'><i>" + pretext + formatter(wordList[i], word, this) + "</i></span>" + varVal(wordList[i],this) + "</td></tr></tbody></table></li>"});
        for(var i = 0; i < commandList.length; i++)
          if(commandList[i].replace(/~[a-z]~/,"").match(regex)) matchList.push({match: commandList[i], html: "<li data-word='" + commandList[i] + "('><table><tbody><tr><td><span class='mq-nonSymbola'><i>" + pretext + "</i></span><span class='mq-operator-name'>" + formatter(commandList[i], word, this) + "(<span class='mq-inline-box'></span>)</span>" + varVal(commandList[i],this) + "</td></tr></tbody></table></li>"});
        for(var i = 0; i < unitList.names.length; i++)
          if(unitList.names[i].match(regex)) matchList.push({match: unitList.names[i], html: "<li data-make-unit='1' data-word='" + unitList.name_to_symbol[unitList.names[i]] + "'><table><tbody><tr><td><span class='mq-operator-name'>" + unitList.name_to_symbol[unitList.names[i]].replace(/delta([A-Z])/,"&Delta;&deg;$1").replace(/deg([A-Z])/,"&deg;$1") + " (" + capitalize(unitList.names[i]).replace(word_regex, "<b>$1</b>").replace(/<b>([a-z]*)_([a-z]*)<\/b>/i,"<b>$1</b>_<b>$2</b>") + ")</span></td></tr></tbody></table></li>"});
        if(toHTML_list.length > 0) this.controller.autocompleteTimeout = window.setTimeout(function(HTML_list, self) { return function() { 
          if(!(self.controller.mq_popup_el && self.controller.mq_popup_el.length > 0)) return;
          for(var i = 0; i < HTML_list.length; i++) {
            var el = self.controller.element.varHelp(HTML_list[i].command);
            var html = '';
            if(el != false) {
              var last_result = el.getLastResult(HTML_list[i].command);
              if(last_result && (last_result.length < 150)) 
                html = window.SwiftCalcsLatexHelper.latexToHtml(last_result);
            }
            self.controller.mq_popup_el.find("td.autoHTML" + HTML_list[i].id).html(html);
          }
        };}(toHTML_list, this),400);
      }
    }
    if(matchList.length > 0) {
      var matches = []
      // Order by exact matches first, then non-exact but at start, then rest
      for(var i = 0; i < matchList.length; i++) {
        if(matchList[i].match.match(regexe)) {
          matches.push(matchList[i].html);
          matchList[i].addit = false
        }
      }
      for(var i = 0; i < matchList.length; i++) {
        if((matchList[i].addit !== false) && matchList[i].match.match(regexs)) {
          matches.push(matchList[i].html);
          matchList[i].addit = false
        }
      }
      for(var i = 0; i < matchList.length; i++) {
        if(matchList[i].addit !== false) matches.push(matchList[i].html);
      }

      matches[0] = matches[0].replace('<li', '<li class="mq-popup-selected"');
      if(this.parent && (this.parent.parent instanceof FunctionCommand) && (this.parent === this.parent.parent.ends[R]))
        var leftBlock = this.parent.parent.jQ;
      else
        var leftBlock = letters[0].jQ;
      var topBlock = letters[letters.length - 1].jQ;
      var leftOffset = leftBlock.offset();
      var topOffset = topBlock.offset();
      topOffset = topOffset.top;
      leftOffset = leftOffset.left;
      var scrollTop = (this.controller.element && this.controller.element.worksheet) ? this.controller.element.worksheet.jQ.scrollTop() : 0;
      if(topBlock.closest('.tutorial_block').length)
        scrollTop = topBlock.closest('.tutorial_block').scrollTop();
      if(topBlock.closest('.sidebar').length) 
        scrollTop = topBlock.closest('.sidebar').scrollTop();
      var _this = this;
      var onclick = function(e) {
        e.preventDefault();
        var word = $(this).attr('data-word');
        var to_replace = _this.fullWord()[1];
        var right_of = to_replace[0][L];
        var left_of = to_replace[to_replace.length-1][R];
        var right_end_of = to_replace[0].parent;
        for(var i = 0; i < to_replace.length; i++) to_replace[i].remove();
        if(right_of) _this.controller.cursor.insRightOf(right_of);
        else if(left_of) _this.controller.cursor.insLeftOf(left_of);
        else _this.controller.cursor.insAtRightEnd(right_end_of);
        if($(this).attr('data-make-unit') == '1') {
          if(_this.controller.cursor[L] && (_this.controller.cursor[L].ctrlSeq == '\\cdot '))
            _this.controller.API.keystroke('Backspace', {preventDefault: function() {} });
          _this.controller.API.typedText('"');
        }
        var accents = [];
        var reg = /~([a-z])~/g;
        while((result = reg.exec(word)) !== null) 
          accents.push(result[1]);
        word = word.replace(reg,'');
        if((word == 'degF') || (word == 'degC') || (word == 'deltaF') || (word == 'deltaC')) {
          _this.controller.scheduleUndoPoint();
          LatexCmds[word]().createLeftOf(_this.controller.cursor);
          _this.controller.notifyElementOfChange();
        } else {
          if(word[word.length - 1]==='(' || word[word.length - 1] === ':')
            _this.controller.API.typedText(word.substr(0,word.length-1));
          else
            _this.controller.API.typedText(word);
        }
        if(_this.controller.cursor[L] instanceof Letter)
          _this.controller.cursor[L].autoOperator(_this.controller.cursor, false);
        if((word[word.length - 1] !== '(') && (word[word.length - 1] !== ':') && _this.controller.cursor.parent && (_this.controller.cursor.parent.parent instanceof SupSub) && (_this.controller.cursor.parent.parent.supsub === 'sub')) 
          _this.controller.cursor.insRightOf(_this.controller.cursor.parent.parent);
        for(var i =0; i < accents.length; i++) 
          var accent = LatexCmds["over" + accents[i]]().createLeftOf(_this.controller.cursor);
        if(word[word.length - 1] === ':') {
          _this.controller.API.typedText(':');
          FunctionCommand(true).createLeftOf(_this.controller.cursor);
        }
        if(word[word.length - 1] === '(')
          _this.controller.API.typedText('(');
        _this.controller.closePopup();
        if($(this).attr('data-make-unit') == '1') _this.controller.API.keystroke('Right', {preventDefault: function() {} });
        _this.controller.cursor.workingGroupChange();
        window.setTimeout(function() { _this.controller.closePopup(); },10); //in case of autocommand causing it to reappear
      };
      this.controller.createPopup('<ul>' + matches.join('\n') + '</ul>', topOffset + topBlock.height() + scrollTop, leftOffset, onclick);
    } else
      this.controller.closePopup();
  };
  _.createLeftOf = function(cursor) {
    super_.createLeftOf.call(this, cursor);
    var parent_el = (this.parent.parent && this.parent.parent instanceof SupSub) && (this.parent.parent.supsub === 'sub') ? this.parent.parent : this;
    for(;parent_el[L] instanceof Variable;parent_el = parent_el[L]);
    if(this.controller.current_tooltip === parent_el) this.controller.destroyTooltip();
    if(timeout_holder) window.clearTimeout(timeout_holder);
    timeout_holder = window.setTimeout(function(_this) { return function() { _this.controller.cursor.loadPopups(); } }(this), 500);
    return this;
  };
  _.remove = function() {
    var parent_el = (this.parent.parent && this.parent.parent instanceof SupSub) && (this.parent.parent.supsub === 'sub') ? this.parent.parent : this;
    for(;parent_el[L] instanceof Variable;parent_el = parent_el[L]);
    if(this.controller.current_tooltip === parent_el) this.controller.destroyTooltip();
    if(timeout_holder) window.clearTimeout(timeout_holder);
    if(this[L] instanceof Variable)
      timeout_holder = window.setTimeout(function(_this) { return function() { _this.controller.cursor.loadPopups(); } }(this[L]), 500);
    else if(this[R] instanceof Variable)
      timeout_holder = window.setTimeout(function(_this) { return function() { _this.controller.cursor.loadPopups(); } }(this[R]), 500);
    else if(this.parent && (this.parent.parent instanceof Variable) && (this.parent.parent.supsub === 'sub'))
      timeout_holder = window.setTimeout(function(_this) { return function() { _this.controller.cursor.loadPopups(); } }(this.parent.parent), 500);
    return super_.remove.call(this);
  }
  _.createTooltip = function() {
    if(!this.controller) this.getController();
    if(this.controller.variableEntryField) {
      this.controller.destroyTooltip();
      return false;
    }
    if(this.parent.unit || (this.parent.parent && this.parent.parent.unit)) {
      this.controller.destroyTooltip();
      return false;
    }
    var command = this.fullWord()[0];
    if(this.jQ.closest(".mq-function-command").length) command += "__SCOBJECT"; //to make sure we catch only the element where the class is defined, not its methods
    var parent_el = (this.parent.parent && this.parent.parent instanceof SupSub) && (this.parent.parent.supsub === 'sub') ? this.parent.parent : this;
    for(;parent_el[L] instanceof Variable;parent_el = parent_el[L]);
    if(this.controller.current_tooltip === parent_el) return parent_el;
    if(this.controller.element && this.controller.element.varHelp) {
      // Tests to ensure we aren't showing a popup for a line where we are defining that variable:
      if((this.controller.root.ends[L] instanceof OperatorName) && (this.controller.root.ends[L][R] instanceof Equality) && this.controller.root.ends[L][R].strict) {// We are on a line where we are defining a function...we should ignore the function name and function variable list
        if(this.controller.cursor && this.controller.cursor.parent && ((this.controller.cursor.parent.parent == this.controller.root.ends[L]) // Cursor is in the function definition (no sub check)
          || (this.controller.cursor.parent.parent && this.controller.cursor.parent.parent.parent && (this.controller.cursor.parent.parent.parent.parent == this.controller.root.ends[L])))) { // Cursor is in the function definition (sub check)
          this.controller.destroyTooltip();
          return false;
        }
        var var_list = this.controller.root.ends[L].blocks[1].text({}).split(',');
        for(var i = 0; i < var_list.length; i++) {
          if(var_list[i].trim() == command) { // Don't show popup, we are defining this variable on this line in a function definition
            this.controller.destroyTooltip();
            return false;
          }
        }
      }
      // Variable definition check:
      if(this.controller.root.ends[L] instanceof Variable) {
        for(var left_el = this.controller.root.ends[L]; left_el[R] instanceof Variable; left_el = left_el[R]);
        if((left_el[R] instanceof SupSub) && (left_el[R].supsub == 'sub')) left_el = left_el[R];
        if((left_el[R] instanceof Equality) && left_el[R].strict) {
          //Variable definition
          if(this.controller.root.ends[L].fullWord()[0] == command) {
            this.controller.destroyTooltip();
            return false;
          }
        }
      }

      var el = this.controller.element.varHelp(command);
      if(el === false) {
        this.controller.destroyTooltip();
        return false;
      }
      this.controller.current_tooltip = parent_el;
      if(this.controller.element.worksheet) this.controller.element.worksheet.tooltip_holder = parent_el;
      var last_result = el.getLastResult(command);
      var html = "Defined on <a href='#' style='color: #666666;'>line " + el.myLineNumber + "</a>&nbsp;&nbsp;"
      if(last_result && (last_result.length < 150)) 
        html = window.SwiftCalcsLatexHelper.latexToHtml(last_result) + "<div style='font-style: italic; color: #666666;'>" + html + "</div>";
      SwiftCalcs.createHelpPopup(html, parent_el.jQ).find('a').on('click', function(e) {
        el.focus(0);
        el.flash("#65b2ff", 750);
        e.preventDefault();
      });
      return parent_el;
    }
    this.controller.destroyTooltip();
    return false;
  }
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
  _.force_no_unit = false;
  _.init = function(ch) { 
    return super_.init.call(this, this.letter = ch); 
  };
  _.autoOperator = function(cursor, unit_conversion, allow_left_right, delay_auto_conversion) {
    if(!cursor[L]) return false;
    if(cursor.controller.suppress_auto_commands) return false;
    if(cursor[L].autoOperatorComplete) return false;
    cursor[L].autoOperatorComplete = true;
    if(cursor.parent.unit || (cursor.parent.parent && cursor.parent.parent.unit)) 
      var autoCmds = {degF:true,degC:true,deltaF:true,deltaC:true};
    else
      var autoCmds = cursor.options.autoCommands;
    // join together longest sequence of letters
    var str = cursor[L].letter, l = cursor[L][L], i = 1;
    if((cursor[R] instanceof Letter) && (allow_left_right !== true)) return false;
    while (l instanceof Letter) {
      str = l.letter + str, l = l[L], i += 1;
    }
    if(this.controller.element && this.controller.element.skipAutoUnit && this.controller.element.skipAutoUnit[str]) return false;
    if(this.controller.skipAutoUnit[str]) return false;
    var left_of = l;
    // check for an autocommand, going thru substrings longest to shortest
    if((str.length > 1) && (str != "psi")) {
      if (autoCmds.hasOwnProperty(str)) {
        // We do auto-operator after a delay so that it is the 'last' thing done and a ctrl-z will undo the auto piece
        var converter = function(controller, init_l, str) { return function() {
          controller.setUndoPoint(str);
          var cursor = controller.cursor;
          var cursor_l = cursor[L];
          var cursor_p = cursor.parent;
          var insertRight = false;
          cursor.insRightOf(init_l);
          if(typeof init_l === 'undefined') return true;
          for (var i = 1, l = init_l; i < str.length; i += 1, l = l[L]);
          cursor.startSelection();
          cursor.insLeftOf(l);
          cursor.select();
          cursor.deleteSelection();
          cursor.endSelection();
          cursor.show();
          LatexCmds[str](str).createLeftOf(cursor);
          if(cursor_l != init_l) {
            if(cursor_l) cursor.insRightOf(cursor_l);
            else cursor.insAtLeftEnd(cursor_p);
          }
        }}(this.controller, cursor[L], str);
        if(delay_auto_conversion)
          window.setTimeout(converter, 1);
        else
          converter();
        return true;
      }
    }
    var try_unit_converstion = true;
    if(this.controller.variableEntryField) try_unit_converstion = false;
    else if(cursor.parent.unit || (cursor.parent.parent && cursor.parent.parent.unit)) try_unit_converstion = false;
    else if(unit_conversion === false) try_unit_converstion = false;
    else if(this.parent && (this.parent.parent instanceof SupSub) && (this.parent.parent.supsub == 'sub')) try_unit_converstion = false;
    else if(this.parent && (this.parent.parent instanceof FunctionCommand)) try_unit_converstion = false;
    else if(!(left_of && (left_of instanceof BinaryOperator) && (left_of.ctrlSeq == '\\cdot ')) && !(this.parent && this.parent.parent && (this.parent.parent instanceof Fraction))) try_unit_converstion = false;
    else if(this.force_no_unit) try_unit_converstion = false;

    if(cursor.parent && cursor.parent.parent && (cursor.parent.parent instanceof SupSub) && (cursor.parent.parent.supsub == 'sub')) try_unit_converstion = false;
    if(try_unit_converstion && (str.length >= 1)) {
      var unitList = this.controller.API.__options.unitList || {names: [], symbols: []};
      var wordList = (this.controller.element && this.controller.element.autocomplete) ? this.controller.element.autocomplete() : (this.controller.API.__options.autocomplete || []);
      // If this is a function definition, we also need to add in the local variables for this function
      if((this.controller.root.ends[L] instanceof OperatorName) && (this.controller.root.ends[L][R] instanceof Equality) && (this.controller.root.ends[L][R].strict)) {
        var local_vars = this.controller.root.ends[L].blocks[1].text({}).split(',');
        for(var j = 0; j < local_vars.length; j++) 
          wordList.push(local_vars[j].trim());
      }
      var commandList = this.controller.API.__options.staticAutocomplete || [];
      var create_unit = function(_this, symb) {
        var change_to_unit = true;
        for(var j = 0; j < wordList.length; j++) {
          if((wordList[j] == str) || (wordList[j] == (str+"("))) { change_to_unit = false; break; }
        }
        for(var j = 0; j < commandList.length; j++) {
          if(commandList[j] == str) { change_to_unit = false; break; }
        }
        var allowed = false;
        if(window.SwiftCalcsSettings && (str.length == 1)) {
          // Check for 'allowed' single character autoconversions
          for(var j = 0; j < window.SwiftCalcsSettings.settings.single_convert_units.length; j++) {
            if(window.SwiftCalcsSettings.settings.single_convert_units[j] == str) { allowed = true; break; }
          }
          if(!allowed) change_to_unit = false;
        }
        if(change_to_unit) {
          // We do change after a delay so that it is the 'last' thing done and a ctrl-z will undo the change
          var converter = function(controller, init_l, str, symb) { return function() {
            controller.setUndoPoint(str);
            var cursor = controller.cursor;
            var cursor_l = cursor[L];
            var cursor_p = cursor.parent;
            cursor.insRightOf(init_l);
            var unit = Unit();
            if(typeof init_l === 'undefined') return true;
            for (var i = 1, l = init_l; i < str.length; i += 1, l = l[L]);
            cursor.startSelection();
            cursor.insLeftOf(l);
            if((cursor[L] instanceof BinaryOperator) && (cursor[L].ctrlSeq == '\\cdot ')) 
              cursor.insLeftOf(cursor[L]);
            cursor.select();
            cursor.deleteSelection();
            cursor.endSelection();
            cursor.show();
            unit.createLeftOf(cursor);
            if(str == 'degF')
              LatexCmds.degF().createLeftOf(cursor);
            else if(str == 'degC')
              LatexCmds.degC().createLeftOf(cursor);
            else if(str == 'deltaC')
              LatexCmds.deltaC().createLeftOf(cursor);
            else if(str == 'deltaF')
              LatexCmds.deltaF().createLeftOf(cursor);
            else {
              for(var i = 0; i < symb.length; i++) 
                Letter(symb[i]).createLeftOf(cursor);
            }
            controller.closePopup();
            unit.jQ.find('.mq-florin').removeClass('.mq-florin').html('f'); // change florin to 'f'
            if(cursor_l == init_l) cursor.insRightOf(unit);
            else if(cursor_l) cursor.insRightOf(cursor_l);
            else cursor.insAtLeftEnd(cursor_p);
          }}(_this.controller, cursor[L], str, symb);
          if(delay_auto_conversion)
            window.setTimeout(converter, 1);
          else
            converter();
          return true;
        }
        return false;
      }
      if(str.substr(0,1) == 'u') str = str.replace('u','µ'); // um -> µm
      if(this.controller.element && this.controller.element.skipAutoUnit && this.controller.element.skipAutoUnit[str]) return false;
      if(this.controller.skipAutoUnit[str]) return false;
      if((str == 'sec') && create_unit(this, 's')) return true; // Override command for seconds
      for(var i = 0; i < unitList.symbols.length; i++) {
        if(str == unitList.symbols[i]) {
          if(create_unit(this, unitList.symbols[i])) return true;
        } 
      }
      for(var i = 0; i < unitList.names.length; i++) { 
        if(str.toLowerCase() == unitList.names[i].toLowerCase()) {
          if(create_unit(this, unitList.name_to_symbol[unitList.names[i]])) return true;
        } else if(str.toLowerCase() == (unitList.names[i].toLowerCase() + 's')) {
          if(create_unit(this, unitList.name_to_symbol[unitList.names[i]])) return true;
        }
      }
    } 
    return false;
  };
  _.createLeftOf = function(cursor) {
    if((this.ctrlSeq == 'u') && (cursor.parent.unit || (cursor.parent.parent && cursor.parent.parent.unit)) && !(cursor[L] instanceof Variable) && !(cursor[L] && (cursor[L].ctrlSeq == 'µ'))) 
      Letter('µ').createLeftOf(cursor);
    else if(cursor[L] && cursor[L][L] && (cursor[L].ctrlSeq === ':') && (cursor[L][L] instanceof Variable || cursor[L][L] instanceof Accent) && (this.ctrlSeq != ':')) {
      FunctionCommand(this.ctrlSeq).createLeftOf(cursor);
    } else if(cursor[L] && cursor[L][L] && (cursor[L].ctrlSeq === ':') && (cursor[L][L] instanceof SupSub) && (this.ctrlSeq != ':') && cursor[L][L].supsub === 'sub') {
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
  for (var fn in BuiltInOpNames) if (BuiltInOpNames.hasOwnProperty(fn)) {
    LatexCmds[fn] = OperatorName;
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
  var symbols_prefix = [];
  var prefix = {micro: 'µ', yocto: 'y', zepto: 'z', atto: 'a', femto: 'f', pico: 'p', nano: 'n', milli: 'm', centi: 'c', deci: 'd', deca: 'D', hecto: 'h', kilo: 'k', mega: 'M', giga: 'G', tera: 'T', peta: 'P', exa: 'E', zetta: 'Z', yotta: 'Y' };
  for(var i = 0; i < units.length; i++) {
    names.push(units[i].name);
    symbols.push(units[i].symbol);
    by_name[units[i].name] = units[i].symbol;
    by_symbol[units[i].symbol] = units[i].name;
    if(units[i].prefix) {
      for(var key in prefix) {
        names.push(key + units[i].name);
        symbols_prefix.push(prefix[key] + units[i].symbol);
        by_name[key + units[i].name] = prefix[key] + units[i].symbol;
        by_symbol[prefix[key] + units[i].symbol] = key + units[i].name;
      }
    }
  }
  var sortFunction = function (a, b) {
    if(a == "United States Dollar") return -1;
    if(b == "United States Dollar") return 1;
    return a.toLowerCase().localeCompare(b.toLowerCase());
  };
  return { name_to_symbol: by_name, symbol_to_name: by_symbol, names: names.sort(sortFunction), symbols: symbols.concat(symbols_prefix).sort(sortFunction) }
}

LatexCmds["'"] = P(Letter, function(_, super_) {
  _.init = function() {
    super_.init.call(this, "'");
  }
  _.createLeftOf = function(cursor) {
    if((cursor[L] instanceof BinaryOperator) || (cursor[L].ctrlSeq == '\\cdot '))
      var to_remove = cursor[L];
    var to_return = super_.createLeftOf.call(this, cursor);
    if(to_remove) to_remove.remove();
    return to_return;
  }
});
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
LatexCmds[' '] = LatexCmds.space = P(Letter, function(_, super_) {
  _.htmlTemplate = [''];
  _.init = function() {
    super_.init.call(this, '', '', '');
  }
  _.textOutput = function(opts) {
    if(opts && opts.show_spaces) return [{text: ' '}];
    return [];
  }
});
