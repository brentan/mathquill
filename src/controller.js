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
    this.root = root;
    this.container = container;
    this.expression_mode = false;  // BRENTAN- add an expression mode that doesn't do equality assignments

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
    if(this.element && this.element.changed)
      this.element.changed(this.API);
  }
  _.notifyElementofBlur = function() {
    if(this.element && this.element.mathquillBlurred)
      this.element.mathquillBlurred(this.API);
  }

  var notifyees = [];
  this.onNotify = function(f) { notifyees.push(f); };
  _.notify = function() {
    for (var i = 0; i < notifyees.length; i += 1) {
      notifyees[i].apply(this.cursor, arguments);
    }
    return this;
  };

  _.createPopup = function(html, top, left, onclick) {
    var el = this.container.children('.mq-popup').first();
    if(el.length == 0) {
      el = $("<div class='mq-popup mq-autocomplete'></div>");
      this.container.append(el);
    }
    el.css({top: Math.ceil(top) + 'px', left: Math.floor(left) + 'px'});
    el.html(html);
    el.find('li').mouseenter(function() {  // We dont use CSS hover because the class is how we keep track of which item is 'active'
      $(this).closest('ul').find('li').removeClass('mq-popup-selected');
      $(this).addClass('mq-popup-selected');
    }).click(onclick);
  };
  _.closePopup = function() {
    this.container.children('.mq-popup').remove();
  };
});
