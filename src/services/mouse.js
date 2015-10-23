/********************************************************
 * Deals with mouse events for clicking, drag-to-select
 *******************************************************/

Controller.open(function(_) {
  //context-menu event handling BRENTAN: if selection, bring up a copy/cut/paste context menu
  _.contextMenu = function(e) {
    var rootjQ = $(e.target).closest('.mq-root-block');
    var root = Node.byId[rootjQ.attr(mqBlockId) || this.root.jQ.attr(mqBlockId)];

    if (this.blurred) 
      this.focus();

    //Find nearest MathCommand to send this to, or if that fails root
    var target_node = this.seek($(e.target), e.pageX, e.pageY).cursor.parent;
    while(!(target_node instanceof MathCommand)) {
      target_node = target_node.parent;
      if(typeof target_node === 'undefined') {
        target_node = root;
        break;
      };
    }
    return target_node.contextMenu(this.cursor,e);
  };
  //drag-to-select event handling
  _.orig_block = 0;
  _.mouseDown = function(e) {
    this.orig_block = this.cursor.parent;
    this.closePopup();
    if (this.blurred) 
      this.focus();
    this.seek($(e.target), e.pageX, e.pageY).cursor.workingGroupChange(true).startSelection();
  }
  _.mouseMove = function(e) {
    if (!this.cursor.anticursor) this.cursor.startSelection();
    this.seek($(e.target), e.pageX, e.pageY).cursor.select();
  };
  _.mouseOut = function(e) {
    this.element.worksheet.blurToolbar(this.API);
    if (this.cursor.selection)
      this.cursor.selection.jQ.removeClass('mq-selection');
    else
      this.cursor.hide();
  }
  _.mouseUp = function(e) {
    if (!this.cursor.selection) {
      if (this.editable) {
        if(this.orig_block) this.orig_block.blur();
        this.cursor.show();
        this.cursor.parent.focus();
        this.cursor.workingGroupChange(true);
      } 
    } 
  };
});

Controller.open(function(_) {
  _.seek = function(target, pageX, pageY) {
    var cursor = this.notify('select').cursor;

    if (target) {
      var nodeId = target.attr(mqBlockId) || target.attr(mqCmdId);
      if (!nodeId) {
        var targetParent = target.parent();
        nodeId = targetParent.attr(mqBlockId) || targetParent.attr(mqCmdId);
      }
    }
    var node = nodeId ? Node.byId[nodeId] : this.root;
    pray('nodeId is the id of some Node that exists', node, this);
    if(this.captiveUnitMode || this.units_only) {
      // In unit mode, selection is limited to the unit block
      if(!node.unit && !(node.parent && node.parent.unit) && !(node.parent && node.parent.parent && node.parent.parent.unit)) 
        node = Node.byId[this.root.jQ.find('.mq-unit').first().attr(mqBlockId)];
    }

    // don't clear selection until after getting node from target, in case
    // target was selection span, otherwise target will have no parent and will
    // seek from root, which is less accurate (e.g. fraction)
    cursor.clearSelection().show();

    node.seek(pageX, cursor);
    this.scrollHoriz(); // before .selectFrom when mouse-selecting, so
                        // always hits no-selection case in scrollHoriz and scrolls slower
    cursor.workingGroupChange();
    return this;
  };
});
