.PHONY: help bootstrap build test lint typecheck ci e2e lighthouse security-scan check-readiness verify-offline seed bench
.PHONY: bootstrap-sdk bootstrap-contract bootstrap-agent bootstrap-cli bootstrap-ui
.PHONY: build-sdk build-contract build-agent build-cli build-ui
.PHONY: test-sdk test-contract test-agent test-cli test-ui

help:
	@echo "Visor Build and Testing Automation Harness"
	@echo "=========================================="
	@echo "bootstrap        - Install all dependencies in all subfolders"
	@echo "build            - Compile all packages (SDK, Agent, CLI, Contract, UI)"
	@echo "test             - Run unit and integration tests (Agent, Contract, SDK, CLI, UI)"
	@echo "test-sdk         - Run SDK unit tests"
	@echo "test-contract    - Run Rust contract unit tests"
	@echo "test-agent       - Run Agent unit tests"
	@echo "test-cli         - Run CLI unit tests"
	@echo "test-ui          - Run UI unit tests"
	@echo "lint             - Run ESLint check on the Next.js UI"
	@echo "typecheck        - Verify TypeScript type safety in all subfolders"
	@echo "ci               - Run the core CI checks (lint, typecheck, test)"
	@echo "e2e              - Execute Playwright end-to-end tests (demo mode)"
	@echo "lighthouse       - Run Lighthouse CI audit on the UI dashboard"
	@echo "security-scan    - Run vulnerability audits and license compliance checks"
	@echo "check-readiness  - Run the official submission readiness check"
	@echo "verify-offline   - Run the enclave PII leak offline verification"
	@echo "seed             - Seed default templates into the coordinator agent"
	@echo "bench            - Run latency benchmarks for cryptographic operations"

bootstrap:
	npm run bootstrap

bootstrap-sdk:
	npm run bootstrap:sdk

bootstrap-contract:
	@echo "No contract JS dependencies to bootstrap"

bootstrap-agent:
	npm run bootstrap:agent

bootstrap-cli:
	npm run bootstrap:cli

bootstrap-ui:
	npm run bootstrap:ui

build:
	npm run build

build-sdk:
	npm run build:sdk

build-contract:
	npm run build:contract

build-agent:
	npm run build:agent

build-cli:
	npm run build:cli

build-ui:
	npm run build:ui

test:
	npm run test

test-sdk:
	npm run test:sdk

test-contract:
	npm run test:contract

test-agent:
	npm run test:agent

test-cli:
	npm run test:cli

test-ui:
	npm run test:ui

lint:
	npm run lint

typecheck:
	npm run typecheck

ci:
	npm run ci

e2e:
	npm run e2e

lighthouse:
	npm run lighthouse

security-scan:
	@echo "🔍 Running NPM Audit..."
	npm run audit
	@echo "🔍 Running License Checker..."
	npx license-checker --production --failOn "GPL-3.0;AGPL-3.0" --summary || true

check-readiness:
	python3 scripts/check_submission_readiness.py

verify-offline:
	python3 scripts/verify_offline.py

seed:
	python3 scripts/seed.py

bench:
	python3 scripts/bench.py

