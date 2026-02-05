# ==================================================================================================
##@ Formatting

format: ## Formats code and tries to fix code quality issues
	npx biome check ./ --write; # top-level only
.PHONY: format

check: ## Runs code quality & formatting checks
	npx biome check ./;
.PHONY: check