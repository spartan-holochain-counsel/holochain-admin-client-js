.PHONY:			FORCE

#
# Building
#
build:			FORCE lib/node.js bin/lib/index.js
lib/node.js:		node_modules src/*.ts Makefile
	rm -f lib/*.js
	npx tsc -t es2022 -m es2022 --moduleResolution node --esModuleInterop \
		--outDir lib -d --sourceMap src/node.ts
bin/lib/index.js:	node_modules bin/src/*.ts Makefile
	rm -f bin/lib/*.js
	cd bin; npx tsc -t es2022 -m es2022 --moduleResolution node --esModuleInterop \
		--outDir lib -d --sourceMap src/index.ts
	chmod a+x $@

bin-build-watch:
	@cd bin; inotifywait -r -m -e modify	\
		--includei '.*\.ts'		\
			src/			\
	| while read -r dir event file; do	\
		echo -e "\x1b[37m$$event $$dir$$file\x1b[0m";\
		make lib/index.js;		\
	done


#
# Project
#
package-lock.json:	package.json
	touch $@
node_modules:		package-lock.json
	npm install
	touch $@

npm-reinstall-local:
	cd tests; npm uninstall $(NPM_PACKAGE); npm i --save $(LOCAL_PATH)
npm-reinstall-public:
	cd tests; npm uninstall $(NPM_PACKAGE); npm i --save $(NPM_PACKAGE)
npm-reinstall-dev-local:
	cd tests; npm uninstall $(NPM_PACKAGE); npm i --save-dev $(LOCAL_PATH)
npm-reinstall-dev-public:
	cd tests; npm uninstall $(NPM_PACKAGE); npm i --save-dev $(NPM_PACKAGE)

npm-use-backdrop-public:
npm-use-backdrop-local:
npm-use-backdrop-%:
	NPM_PACKAGE=@spartan-hc/holochain-backdrop LOCAL_PATH=../../node-backdrop make npm-reinstall-dev-$*

npm-use-websocket-public:
npm-use-websocket-local:
npm-use-websocket-%:
	NPM_PACKAGE=@spartan-hc/holochain-websocket LOCAL_PATH=../../hc-websocket-js make npm-reinstall-$*

npm-use-holo-hash-public:
npm-use-holo-hash-local:
npm-use-holo-hash-%:
	NPM_PACKAGE=@spartan-hc/holo-hash LOCAL_PATH=../../holo-hash-js make npm-reinstall-$*


#
# Testing
#
DEBUG_LEVEL	       ?= warn
TEST_ENV_VARS		= LOG_LEVEL=$(DEBUG_LEVEL)
MOCHA_OPTS		= -t 15000 -n enable-source-maps --color

test-server:
	python3 -m http.server 8765

test:
	make -s test-integration
	make -s test-e2e

test-integration:
	make -s test-integration-basic

test-integration-basic:		build
	$(TEST_ENV_VARS) npx mocha $(MOCHA_OPTS) ./tests/integration/test_basic.js

test-e2e:
	make -s test-e2e-basic

test-e2e-basic:			prepare-package build
	$(TEST_ENV_VARS) npx mocha $(MOCHA_OPTS) ./tests/e2e/test_basic.js


#
# Repository
#
clean-remove-chaff:
	@find . -name '*~' -exec rm {} \;
clean-files:		clean-remove-chaff
	git clean -nd
clean-files-force:	clean-remove-chaff
	git clean -fd
clean-files-all:	clean-remove-chaff
	git clean -ndx
clean-files-all-force:	clean-remove-chaff
	git clean -fdx


#
# NPM packaging
#
prepare-package:
	rm -f dist/*
	npx webpack
	MODE=production npx webpack
	gzip -kf dist/*.js
preview-package:	clean-files test prepare-package
	npm pack --dry-run .
create-package:		clean-files test prepare-package
	npm pack .
publish-package:	clean-files test prepare-package
	npm publish --access public .
