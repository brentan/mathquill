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
    this.cursor.delayPopups();
    this.orig_block = this.cursor.parent;
    this.closePopup();
    if (this.blurred) 
      this.focus();
    this.seek($(e.target), e.pageX, e.pageY).cursor.workingGroupChange(true).startSelection();
  }
  _.mouseMove = function(e) {
    this.cursor.delayPopups();
    if (!this.cursor.anticursor) this.cursor.startSelection();
    this.seek($(e.target), e.pageX, e.pageY).cursor.select();
  };
  _.mouseUpShift = function(e) {
    this.cursor.delayPopups();
    if (!this.cursor.anticursor) this.cursor.startSelection();
    this.seek($(e.target), e.pageX, e.pageY).cursor.select();
    this.mouseUp(e);
  }
  _.mouseOut = function(e) {
    this.cursor.delayPopups();
    if(this.element && this.element.worksheet) this.element.worksheet.blurToolbar(this.API);
    if (this.cursor.selection)
      this.cursor.selection.jQ.removeClass('mq-selection');
    else
      this.cursor.hide();
  }
  var last_click = 0;
  _.mouseUp = function(e) {
    this.cursor.delayPopups();
    if (!this.cursor.selection) {
      if (this.editable) {
        if(this.orig_block) this.orig_block.blur();
        this.cursor.show();
        this.cursor.parent.focus();
        this.cursor.workingGroupChange(true);
        var timestamp = Date.now();
        if((timestamp - last_click) < 300) {
          //double click
          var target = false;
          if(this.cursor[L] instanceof Variable || this.cursor[L] instanceof NumberSymbol) target = this.cursor[L];
          else if(this.cursor[R] instanceof Variable || this.cursor[R] instanceof NumberSymbol) target = this.cursor[R];
          if(target) {
            for(var startL = target;startL[L] instanceof Variable || startL[L] instanceof NumberSymbol;startL = startL[L]);
            for(var startR = target;startR[R] instanceof Variable || startR[R] instanceof NumberSymbol;startR = startR[R]);
            if((startR[R] instanceof SupSub) && (startR[R].supsub == 'sub')) startR = startR[R];
            this.cursor.insLeftOf(startL);
            this.cursor.startSelection();
            this.cursor.insRightOf(startR);
            this.cursor.select();
          }
        }
        last_click = timestamp;
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
