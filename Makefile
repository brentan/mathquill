#
# -*- Configuration -*-
#

# inputs
VERSION = 1_01
SRC_DIR = ./src
INTRO = $(SRC_DIR)/intro.js
OUTRO = $(SRC_DIR)/outro.js

PJS_SRC = ./node_modules/pjs/src/p.js

BASE_SOURCES = \
  $(PJS_SRC) \
  $(SRC_DIR)/tree.js \
  $(SRC_DIR)/cursor.js \
  $(SRC_DIR)/controller.js \
  $(SRC_DIR)/publicapi.js \
  $(SRC_DIR)/services/*.util.js \
  $(SRC_DIR)/services/*.js

SOURCES_FULL = \
  $(BASE_SOURCES) \
  $(SRC_DIR)/commands/*.js \
  $(SRC_DIR)/commands/*/*.js

SOURCES_BASIC = \
  $(BASE_SOURCES) \
  $(SRC_DIR)/commands/math.js \
  $(SRC_DIR)/commands/math/letterVariable.js \
  $(SRC_DIR)/commands/math/basicSymbols.js \
  $(SRC_DIR)/commands/math/commands.js

CSS_DIR = $(SRC_DIR)/css
CSS_MAIN = $(CSS_DIR)/main.less
CSS_SOURCES = $(shell find $(CSS_DIR) -name '*.less')

FONT_SOURCE = $(SRC_DIR)/font
FONT_TARGET = $(BUILD_DIR)/font

UNIT_TESTS = ./test/unit/*.test.js

# outputs
VERSION ?= $(shell node -e "console.log(require('./package.json').version)")

BUILD_DIR = ./build
GEM_DIR = ../mathquill_swiftcalcs_rails
APP_DIR = ../swift_calcs
BUILD_JS = $(BUILD_DIR)/mathquill$(VERSION).js
BASIC_JS = $(BUILD_DIR)/mathquill-basic.js
BUILD_CSS = $(BUILD_DIR)/mathquill$(VERSION).css
BASIC_CSS = $(BUILD_DIR)/mathquill-basic.css
BUILD_TEST = $(BUILD_DIR)/mathquill.test.js
UGLY_JS = $(BUILD_DIR)/mathquill$(VERSION).min.js
UGLY_BASIC_JS = $(BUILD_DIR)/mathquill-basic.min.js
CLEAN += $(BUILD_DIR)/*

DISTDIR = ./mathquill-$(VERSION)
DIST = $(DISTDIR).tgz
CLEAN += $(DIST)

# programs and flags
UGLIFY ?= ./node_modules/.bin/uglifyjs
UGLIFY_OPTS ?= --mangle --compress hoist_vars=true

LESSC ?= ./node_modules/.bin/lessc
LESS_OPTS ?=

# Empty target files whose Last Modified timestamps are used to record when
# something like `npm install` last happened (which, for example, would then be
# compared with its dependency, package.json, so if package.json has been
# modified since the last `npm install`, Make will `npm install` again).
# http://www.gnu.org/software/make/manual/html_node/Empty-Targets.html#Empty-Targets
NODE_MODULES_INSTALLED = ./node_modules/.installed--used_by_Makefile
BUILD_DIR_EXISTS = $(BUILD_DIR)/.exists--used_by_Makefile

# environment constants

#
# -*- Build tasks -*-
#

.PHONY: all basic dev js uglify css font dist clean
all: font css uglify
gem: font css uglify
	# copy built files over to the gem folders...legacy as we no longer use a gem to allow for async loads and more control in my own code
	cp -f $(BUILD_DIR)/mathquill.css ./$(GEM_DIR)/app/assets/stylesheets/mathquill.css
	cp -f $(BUILD_DIR)/mathquill.min.js ./$(GEM_DIR)/app/assets/javascripts/mathquill.js
	rm -rf ./$(GEM_DIR)/app/assets/fonts
	cp -r $(FONT_SOURCE) ./$(GEM_DIR)/app/assets/fonts
	# Convert css to scss and use font-url to take advantage of the asset pipeline in rails 4
	sed -e s/url\(\'font\\//font-url\(\'/g ./$(GEM_DIR)/app/assets/stylesheets/mathquill.css > ./$(GEM_DIR)/app/assets/stylesheets/mathquill.css.scss
	rm ./$(GEM_DIR)/app/assets/stylesheets/mathquill.css
	# Assumes you have gem-release installed, increment version number and release
	cd $(GEM_DIR);	git add . ;	gem bump;  rake build;	git push; 	rake release
	# Update the gem in our local development app
	cd $(APP_DIR); bundle update mathquill_swiftcalcs_rails

basic: $(UGLY_BASIC_JS) $(BASIC_CSS)
# app is used to build and auto-copy the js files to the swift calcs repo
app: css js
	rm -rf ./$(APP_DIR)/public/mathquill*.js
	cp -f $(BUILD_DIR)/mathquill$(VERSION).css ./$(APP_DIR)/app/assets/stylesheets/mathquill.css
	cp -f $(BUILD_DIR)/mathquill$(VERSION).js ./$(APP_DIR)/public/mathquill$(VERSION).js
	rm -rf ./$(APP_DIR)/app/assets/fonts
	cp -r $(FONT_SOURCE) ./$(APP_DIR)/app/assets/fonts
	# Convert css to scss and use font-url to take advantage of the asset pipeline in rails 4
	sed -e s/url\(\'font\\//font-url\(\'/g ./$(APP_DIR)/app/assets/stylesheets/mathquill.css > ./$(APP_DIR)/app/assets/stylesheets/mathquill.css.scss
	rm ./$(APP_DIR)/app/assets/stylesheets/mathquill.css
# app is used to build and auto-copy the minified js files to the swift calcs repo
app_ugly: css uglify
	rm -rf ./$(APP_DIR)/public/mathquill*.js
	cp -f $(BUILD_DIR)/mathquill$(VERSION).css ./$(APP_DIR)/app/assets/stylesheets/mathquill.css
	cp -f $(BUILD_DIR)/mathquill$(VERSION).min.js ./$(APP_DIR)/public/mathquill$(VERSION).js
	rm -rf ./$(APP_DIR)/app/assets/fonts
	cp -r $(FONT_SOURCE) ./$(APP_DIR)/app/assets/fonts
	# Convert css to scss and use font-url to take advantage of the asset pipeline in rails 4
	sed -e s/url\(\'font\\//font-url\(\'/g ./$(APP_DIR)/app/assets/stylesheets/mathquill.css > ./$(APP_DIR)/app/assets/stylesheets/mathquill.css.scss
	rm ./$(APP_DIR)/app/assets/stylesheets/mathquill.css
# dev is like all, but without minification
dev: font css js
js: $(BUILD_JS)
uglify: $(UGLY_JS)
css: $(BUILD_CSS)
font: $(FONT_TARGET)
dist: $(DIST)
clean:
	rm -rf $(CLEAN)

$(PJS_SRC): $(NODE_MODULES_INSTALLED)

$(BUILD_JS): $(INTRO) $(SOURCES_FULL) $(OUTRO) $(BUILD_DIR_EXISTS)
	cat $^ | ./script/escape-non-ascii > $@

$(UGLY_JS): $(BUILD_JS) $(NODE_MODULES_INSTALLED)
	$(UGLIFY) $(UGLIFY_OPTS) < $< > $@

$(BASIC_JS): $(INTRO) $(SOURCES_BASIC) $(OUTRO) $(BUILD_DIR_EXISTS)
	cat $^ | ./script/escape-non-ascii > $@

$(UGLY_BASIC_JS): $(BASIC_JS) $(NODE_MODULES_INSTALLED)
	$(UGLIFY) $(UGLIFY_OPTS) < $< > $@

$(BUILD_CSS): $(CSS_SOURCES) $(NODE_MODULES_INSTALLED) $(BUILD_DIR_EXISTS)
	$(LESSC) $(LESS_OPTS) $(CSS_MAIN) > $@

$(BASIC_CSS): $(CSS_SOURCES) $(NODE_MODULES_INSTALLED) $(BUILD_DIR_EXISTS)
	$(LESSC) --modify-var="basic=true" $(LESS_OPTS) $(CSS_MAIN) > $@

$(NODE_MODULES_INSTALLED): package.json
	npm install
	touch $(NODE_MODULES_INSTALLED)

$(BUILD_DIR_EXISTS):
	mkdir -p $(BUILD_DIR)
	touch $(BUILD_DIR_EXISTS)

$(FONT_TARGET): $(FONT_SOURCE) $(BUILD_DIR_EXISTS)
	rm -rf $@
	cp -r $< $@

$(DIST): $(UGLY_JS) $(BUILD_JS) $(BUILD_CSS) $(FONT_TARGET)
	rm -rf $(DISTDIR)
	cp -r $(BUILD_DIR) $(DISTDIR)
	tar -czf $(DIST) --exclude='\.gitkeep' $(DISTDIR)
	rm -r $(DISTDIR)

#
# -*- Test tasks -*-
#

.PHONY: test server run-server
server:
	node script/test_server.js
test: dev $(BUILD_TEST) $(BASIC_JS) $(BASIC_CSS)
	@echo
	@echo "** now open test/{unit,visual}.html in your browser to run the {unit,visual} tests. **"

$(BUILD_TEST): $(INTRO) $(SOURCES_FULL) $(UNIT_TESTS) $(OUTRO) $(BUILD_DIR_EXISTS)
	cat $^ > $@
