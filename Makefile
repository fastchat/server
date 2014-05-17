REPORTER = nyan
KEY = AKIAIOHCTJAAHBIJCIXA
SECRET = 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

# Default Goal. Just run node in development mode.
# to start the server, just run 'make'
run-dev:
	@ENV=dev \
	MONGOLAB_URI=mongodb://localhost/dev \
	$(MAKE) run

run-test:
	@ENV=test \
	COV_FASTCHAT=true \
	MONGOLAB_URI=mongodb://localhost/test \
	$(MAKE) run

run:
	@AWS_KEY=$(KEY) \
	AWS_SECRET=$(SECRET) \
	node server.js

test:
	@ENV=test \
	AWS_KEY=$(KEY) AWS_SECRET=$(SECRET) \
	mocha \
	--timeout 5000 \
	--reporter $(REPORTER) \

# Test and watch for file changes and test again. We don't really use this,
# we just test before deploying to production.
test-w:
	@ENV=test mocha \
	--timeout 5000 \
	--reporter $(REPORTER) \
	--growl \
	--watch

# Run coverage. This should only be run while you have another fastchat instance running
# that is used make test
test-cov:
	curl -X POST "http://localhost:3000/coverage/reset" && echo
	@COV_FASTCHAT=true $(MAKE) test
	open "http://localhost:3000/coverage"

kill-test:
	ps aux | grep "node server.js" | grep -v grep | awk "{print \"kill -9 \" $2}" | sh

# The .PHONY is needed to ensure that we recursively use the out/Makefile
# to check for changes.m
.PHONY: test test-w
