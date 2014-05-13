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

test-cov: lib-cov
	@FASTCHAT_COV=1 $(MAKE) test REPORTER=html-cov > public/coverage.html

lib-cov:
	@jscoverage --no-highlight lib lib-cov

# The .PHONY is needed to ensure that we recursively use the out/Makefile
# to check for changes.m
.PHONY: test test-w
