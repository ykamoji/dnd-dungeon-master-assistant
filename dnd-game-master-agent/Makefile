# Makefile for local development of dnd-game-master-agent

.PHONY: install lint lint-fix playground run test help

# Default target
help:
	@echo "Available commands:"
	@echo "  make install        Install project dependencies (uv sync)"
	@echo "  make lint           Run linter and type checks"
	@echo "  make lint-fix       Run linter and format code with auto-fixes"
	@echo "  make playground     Start the local ADK web playground"
	@echo "  make run PROMPT=... Run a single prompt through the agent"
	@echo "  make test           Run unit tests"
	@echo "  make smoke-test     Run smoke tests for tools and custom routes"

install:
	agents-cli install

lint:
	agents-cli lint

lint-fix:
	agents-cli lint --fix

playground:
	agents-cli playground

run:
	@if [ -z "$(PROMPT)" ]; then \
		echo "Error: Please specify PROMPT. Example: make run PROMPT=\"start adventure\""; \
		exit 1; \
	fi
	agents-cli run "$(PROMPT)"

test:
	uv run pytest tests/unit

smoke-test:
	uv run python smoke_test.py
