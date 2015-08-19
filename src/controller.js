/*********************************************
 * Controller for a MathQuill instance,
 * on which services are registered with
 *
 *   Controller.open(function(_) { ... });
 *
 ********************************************/

var Controller = P(function(_) {
  _.init = function(API, root, container) {
    this.API = API;
    this.element = 0;
    this.unitMode = false;
    this.root = root;
    this.container = container;

    API.__controller = root.controller = this;

    this.cursor = root.cursor = Cursor(root, API.__options, container);
    // TODO: stop depending on root.cursor, and rm it
  };

  _.handle = function(name, dir) {
    var handlers = this.API.__options.handlers;
    if (handlers && handlers[name]) {
      if (dir === L || dir === R) handlers[name](dir, this.API);
      else handlers[name](this.API);
    }
  };

  _.notifyElementOfChange = function() {
    if(!this.unitMode && !this.staticMode && this.element && this.element.changed)
      this.element.changed(this.API);
  }

  _.undoTimer = false;
  _.undoHash = false;
  _.scheduleUndoPoint = function() {
    if(this.undoTimer)
      window.clearTimeout(this.undoTimer);
    else 
      this.undoHash = this.currentState();
    this.undoTimer = window.setTimeout(function(_this) { return function() { _this.setUndoPoint(_this.undoHash); }; }(this), 1000);
  }
  _.setUndoPoint = function(hash) {
    if(this.undoTimer)
      window.clearTimeout(this.undoTimer);
    this.undoTimer = false;
    if(this.element && this.element.worksheet) 
      this.element.worksheet.setUndoPoint(this, hash);
  }
  _.currentState = function() {
    return {
        latex: this.API.toString(),
        cursor: this.cursor.getAbsolutePosition()
    };
  }
  _.restoreState = function(data) {
    this.API.select();
    this.typedText('0');
    this.backspace();
    this.writeLatex(data.latex.slice(6, -1));
    if(data.cursor.anticursor) {
      var el = this.root;
      for(var i = 0; i < data.cursor.anticursor.length; i++) {
        switch(data.cursor.anticursor[i]) {
          case 'L':
            el = el[R];
            break;
          case 'endsL':
            el = el.ends[L];
            break;
          default:
            this.cursor[data.cursor.anticursor[i]](el);
        }
      }
      this.cursor.startSelection();
    }
    if(data.cursor.cursor) {
      var el = this.root;
      for(var i = 0; i < data.cursor.cursor.length; i++) {
        switch(data.cursor.cursor[i]) {
          case 'L':
            el = el[R];
            break;
          case 'endsL':
            el = el.ends[L];
            break;
          default:
            this.cursor[data.cursor.cursor[i]](el);
        }
      }
      if(data.cursor.anticursor) this.cursor.select();
    }
    this.cursor.workingGroupChange();
  }

  var notifyees = [];
  this.onNotify = function(f) { notifyees.push(f); };
  _.notify = function() {
    for (var i = 0; i < notifyees.length; i += 1) {
      notifyees[i].apply(this.cursor, arguments);
    }
    return this;
  };
  _.showPopups = false;
  _.createPopup = function(html, top, left, onclick) {
    if(!this.showPopups) return; // Do not create popups for blocks that dont have an attached element (aka blocks that are output only)
    var el = this.container.children('.mq-popup').first();
    if(el.length == 0) {
      el = $("<div class='mq-popup mq-autocomplete'></div>");
      this.container.append(el);
    }
    el.css({top: Math.ceil(top) + 'px', left: Math.floor(left) + 'px'});
    el.html(html);
    if(this.element && ((left + el.width()) > this.element.worksheet.jQ.width())) // Adjust left if needed
      el.css({left: Math.floor(max(0,this.element.worksheet.jQ.width() - el.width())) + 'px'});
    el.find('li').mouseenter(function() {  // We dont use CSS hover because the class is how we keep track of which item is 'active'
      $(this).closest('ul').find('li').removeClass('mq-popup-selected');
      $(this).addClass('mq-popup-selected');
    }).click(onclick);
  };
  _.closePopup = function() {
    this.container.children('.mq-popup').remove();
  };
  _.current_tooltip = false;
  _.destroyTooltip = function() {
    if(this.current_tooltip && this.element && (this.element.worksheet.tooltip_holder === this.current_tooltip))
      SwiftCalcs.destroyHelpPopup();
    else if(this.current_tooltip && !this.element) 
      SwiftCalcs.destroyHelpPopup();
    this.current_tooltip = false;
  }
});
