# Environments live in Bitwarden (item "tafelrush", one attachment per environment).
# ENV=local is .env (builds and store submits), ENV=production is .env.production (Dokku).
# Bitwarden must be unlocked: export BW_SESSION=$(bw unlock --raw)

ENV ?= local
ENV_CLI = node scripts/env.mjs

.PHONY: help env push-env get-env set-env unset-env keys-env env-example dokku-env

help: ## Show the targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

env: ## Pull ENV from Bitwarden into the local file (.env or .env.<env>)
	@$(ENV_CLI) pull $(ENV)

push-env: ## Store the local file of ENV in Bitwarden
	@$(ENV_CLI) push $(ENV)

get-env: ## Print one value: make get-env ENV=production KEY=ANDROID_CERT_SHA256
	@$(ENV_CLI) get $(ENV) $(KEY)

set-env: ## Set one value: make set-env KEY=X VALUE=y, or FILE=path for a file as base64
	@$(ENV_CLI) set $(ENV) $(KEY) $(if $(FILE),--file "$(FILE)","$(VALUE)")

unset-env: ## Remove one key: make unset-env ENV=local KEY=X
	@$(ENV_CLI) unset $(ENV) $(KEY)

keys-env: ## List the keys of ENV in Bitwarden
	@$(ENV_CLI) keys $(ENV)

env-example: ## Regenerate .env.example from the local env files
	@$(ENV_CLI) example

dokku-env: ## Push .env.production to the Dokku app config (restarts the web app)
	@$(ENV_CLI) dokku production
