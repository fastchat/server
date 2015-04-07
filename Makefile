# Default Goal. Just run node in development mode.
# to start the server, just run 'make'
run:
	@ENV=dev \
	MONGOLAB_URI=mongodb://localhost/dev \
	node coffee_bridge.js

run-test:
	@ENV=test \
	MONGOLAB_URI=mongodb://localhost/test \
	node coffee_bridge.js 1>test.log 2>&1 & echo "$$!" > node.pid
	sleep 5

run-test-visible:
	@ENV=test \
	MONGOLAB_URI=mongodb://localhost/test \
	node coffee_bridge.js

kill-test-node:
	-@kill -9 $(shell cat node.pid) 2>/dev/null

unit:
	@ENV=test \
	WINSTON=error ./node_modules/mocha/bin/mocha --compilers coffee:coffee-script/register ./test/unit

integration:
	WINSTON=error \
	MONGOLAB_URI=mongodb://localhost/test \
	./node_modules/mocha/bin/mocha --compilers coffee:coffee-script/register ./test/integration

server:
	$(MAKE) run-test
	WINSTON=error ./node_modules/mocha/bin/mocha --compilers coffee:coffee-script/register ./test/server
	$(MAKE) kill-test-node
	$(MAKE) cleanup

cleanup:
	-@rm node.pid 2>/dev/null

cov:
	WINSTON=error \
	MONGOLAB_URI=mongodb://localhost/test \
	./node_modules/mocha/bin/mocha \
	--compilers coffee:coffee-script/register \
	--require ./node_modules/blanket-node/bin/index.js \
	-R travis-cov \
	./test/unit ./test/integration

cov-report:
	WINSTON=error \
	MONGOLAB_URI=mongodb://localhost/test \
	./node_modules/mocha/bin/mocha \
	--compilers coffee:coffee-script/register \
	--require ./node_modules/blanket-node/bin/index.js \
	-R html-cov > coverage.html \
	./test/unit ./test/integration
	open coverage.html

coveralls:
	WINSTON=error \
	MONGOLAB_URI=mongodb://localhost/test \
	./node_modules/mocha/bin/mocha --compilers coffee:coffee-script/register \
	--require ./node_modules/blanket-node/bin/index.js \
	./test/unit ./test/integration \
	--reporter mocha-lcov-reporter | ./node_modules/coveralls/bin/coveralls.js


test:
	$(MAKE) unit
	$(MAKE) integration
	$(MAKE) server
	$(MAKE) cov
	$(MAKE) lint

travis:
	$(MAKE) unit
	$(MAKE) integration
	$(MAKE) server
	$(MAKE) cov
	$(MAKE) lint
	$(MAKE) coveralls

lint:
	./node_modules/coffeelint/bin/coffeelint ./lib ./test

check-dependencies:
	./node_modules/david/bin/david.js

kill-node:
	-kill `ps -eo pid,comm | awk '$$2 == "node" { print $$1 }'`

# Test and watch for file changes and test again. We don't really use this,
# we just test before deploying to production.
test-w:
	@ENV=test mocha \
	--timeout 5000 \
	--growl \
	--watch

# The .PHONY is needed to ensure that we recursively use the out/Makefile
# to check for changes.m
.PHONY: test test-w
