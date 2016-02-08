/***********************************************
 * Export math in a human-readable text format
 * As you can see, only half-baked so far.
 **********************************************/

Controller.open(function(_, super_) {
  _.exportText = function(opts) {
    return this.root.foldChildren('', function(text, child) {
      return text + child.text(opts);
    });
  };
  _.highlightError = function(opts, error_index) {
  	var controller = this;
    var tracker = { error_index: error_index, current_length: 0, block_found: false };
    var out = this.root.foldChildren(tracker, function(tracker, child) {
    	return child.highlightError(opts, controller, tracker, tracker.error_index);
    });
    return out.block_found;
  };
});
