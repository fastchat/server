# Default Goal. Just run node in development mode.
# to start the server, just run 'make'
run-dev:
	@ENV=dev \
	MONGOLAB_URI=mongodb://localhost/dev \
	$(MAKE) run

run-test:
	@ENV=test \
	MONGOLAB_URI=mongodb://localhost/test \
	$(MAKE) run

run-test-for-cov:
	@ENV=test \
	COV_FASTCHAT=true \
	MONGOLAB_URI=mongodb://localhost/test \
	$(MAKE) run

run:
	node coffee_bridge.js

test:
	@ENV=test \
	mocha --compilers coffee:coffee-script/register ./test/unit

unit:
	@ENV=test \
	mocha --compilers coffee:coffee-script/register ./test/unit

integration:
	-rm nohup.out
	ENV=test COV_FASTCHAT=true MONGOLAB_URI=mongodb://localhost/test AWS_KEY=$(KEY) AWS_SECRET=$(SECRET) nohup node coffee_bridge &
	sleep 3
	@ENV=test mocha --compilers coffee:coffee-script/register ./test/integration

cov:
	-rm nohup.out
	$(MAKE) kill-node
	$(MAKE) unit
	$(MAKE) integration


kill-node:
	-kill `ps -eo pid,comm | awk '$$2 == "node" { print $$1 }'`

# Test and watch for file changes and test again. We don't really use this,
# we just test before deploying to production.
test-w:
	@ENV=test mocha \
	--timeout 5000 \
	--growl \
	--watch

# Run coverage. This should only be run while you have another fastchat instance running
# that is used make test
test-cov:
	curl -X POST "http://localhost:3000/coverage/reset" && echo
	@COV_FASTCHAT=true $(MAKE) test
	open "http://localhost:3000/coverage"

# The .PHONY is needed to ensure that we recursively use the out/Makefile
# to check for changes.m
.PHONY: test test-w
