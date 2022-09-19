[![frontend](https://github.com/moneeey/moneeey/actions/workflows/CI.yaml/badge.svg)](https://github.com/moneeey/moneeey/actions/workflows/CI.yaml)

# Welcome to Moneeey

Moneeey is an attempt to provide personal budgeting and financial services to
end users, at a cheap price (possibly self-hosted for free), offering multiple
user experience, encrypted data, freedom of data ownership, export, import,
automatic transaction categorization, reports and much more...

## How to run locally

Execute these steps to run locally:

```bash
docker-compose up
```

The frontend will be available at: <http://127.0.0.1:4270>

The backend will be available at: <http://127.0.0.1:4269>

MailDev to see emails sent from the system: <http://127.0.0.1:1080>

CouchDB admin is available at <http://localhost:5984/_utils/#login> use
`dev/dev` to login as admin.

## Example backend requests

There are some backend request examples [here](/backend/requests), they are
runnable with VSCode Rest Client.
