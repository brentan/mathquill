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
    this.captiveUnitMode = false;
    this.captiveMode = false;
    this.units_only = false;
    this.variableEntryField = false;
    this.root = root;
    this.mq_popup_el = [];
    this.skipAutoUnit = {};
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
    if(!this.captiveMode && !this.staticMode && this.element && this.element.changed)
      this.element.changed(this.API);
  }

  _.scheduleUndoPoint = function() {
    if(this.staticMode) return;
    if(this.element && this.element.worksheet) 
      this.element.worksheet.scheduleUndoPoint(this);
  }
  _.autoConvertUnit = undefined;
  _.setUndoPoint = function(str) {
    if(this.staticMode) return;
    this.autoConvertUnit = str;
    if(this.element && this.element.worksheet) 
      this.element.worksheet.setUndoPoint(this);
  }
  _.currentState = function() {
    return {
        autoConvert: this.autoConvertUnit,
        latex: this.API.toString(),
        cursor: this.cursor.getAbsolutePosition()
    };
  }
  _.restoreState = function(data) {
    if(data.autoConvert && this.element && this.element.skipAutoUnit) this.element.skipAutoUnit[data.autoConvert] = true;
    else this.skipAutoUnit[data.autoConvert] = true;
    this.API.select();
    this.cursor.deleteSelection();
    this.API.moveToLeftEnd();
    this.writeLatex(data.latex.slice(6, -1));
    this.cursor.setPosition(data.cursor);
    this.notifyElementOfChange();
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
    this.closePopup();
    var el = $("<div class='mq-math-mode mq-popup mq-autocomplete'></div>").appendTo('body');
    el.css({top: Math.ceil(top) + 'px', left: Math.floor(left) + 'px'});
    el.html(html);
    if(this.element && this.element.worksheet) {
      var worksheet_right_edge = this.element.worksheet.jQ.width() + this.element.worksheet.jQ.offset().left;
      if((left + el.width()) > worksheet_right_edge) // Adjust left if needed
        el.css({left: Math.floor(max(0,worksheet_right_edge - el.width())) + 'px'});
    }
    el.find('li').mouseenter(function() {  // We dont use CSS hover because the class is how we keep track of which item is 'active'
      $(this).closest('ul').find('li').removeClass('mq-popup-selected');
      $(this).addClass('mq-popup-selected');
    }).mousedown(onclick).click(onclick);
    if(this.root.jQ.closest('.popup_dialog').length)
      el.css('z-index', '6000');
    if(this.root.jQ.closest('.screen_explanation_content').length)
      el.css('z-index', '60000');
    this.mq_popup_el = el;
  };
  _.closePopup = function() {
    if(this.mq_popup_el.length > 0) {
      this.mq_popup_el.remove();
      this.mq_popup_el = [];
    }
  };
  _.mq_popup = function() {
    if(this.mq_popup_el.length > 0) {
      if(this.mq_popup_el.hasClass('removed'))
        this.mq_popup_el = [];
      return this.mq_popup_el
    } else
      return [];
  };
  _.current_tooltip = false;
  _.destroyTooltip = function(fade) {
    if(this.current_tooltip && this.element && (this.element.worksheet.tooltip_holder === this.current_tooltip))
      SwiftCalcs.destroyHelpPopup(fade);
    else if(this.current_tooltip && !this.element) 
      SwiftCalcs.destroyHelpPopup(fade);
    this.current_tooltip = false;
  }
  _.errorBlock = 0;
  _.createErrorUnderline = function(top, left, width) {
    if(this.errorBlock) 
      this.errorBlock.remove();
    // Make div and fill with HTML to make sure its long enough to underline what we need to underline
    var el = $('<div/>').addClass('mq-error-block').html('⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎⋎');
    el.css({top: Math.ceil(top-2) + 'px', left: Math.floor(left-5) + 'px', width: Math.floor(width + 12) + 'px'});
    this.container.append(el);
    this.errorBlock = el;
  };
});
