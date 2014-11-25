/***********************************************
 * Export math in a human-readable text format
 * As you can see, only half-baked so far.
 **********************************************/

Controller.open(function(_, super_) {
  _.exportText = function(opts) {
    return this.root.foldChildren('', function(text, child) {
      return text + child.text(opts);
    })
        .replace(/\\operatorname\{(.*?)\}/g,"$1")
        .replace(/\\/g, "")
        .replace(/\* *\*/g,'*')
        .replace(/ *_/g,'_')
        .replace(/\* *$/,''); //Random cases of hanging multiplications...just remove these.
        //TODO: '**' shouldnt happen, so it should really be dealt with by fixing whatever is causing them
  };
});
