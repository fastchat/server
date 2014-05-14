REPORTER = nyan

test:
	@NODE_ENV=test \
	AWS_KEY=AKIAIOHCTJAAHBIJCIXA AWS_SECRET=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 \
	mocha \
	--timeout 5000 \
	--reporter $(REPORTER) \

test-w:
	@NODE_ENV=test mocha \
	--timeout 5000 \
	--reporter $(REPORTER) \
	--growl \
	--watch

test-cov:
	curl -X POST "http://localhost:3000/coverage/reset" && echo
	@COV_FASTCHAT=true $(MAKE) test
	open "http://localhost:3000/coverage"

kill-test:
	ps aux | grep "node server.js" | grep -v grep | awk "{print \"kill -9 \" $2}" | sh

# The .PHONY is needed to ensure that we recursively use the out/Makefile
# to check for changes.m
.PHONY: test test-w
