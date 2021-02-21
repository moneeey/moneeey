#!/bin/bash

CLUSTER_NAME=mycouchdb

helm repo add couchdb https://apache.github.io/couchdb-helm

helm install ${CLSUTER_NAME} couchdb/couchdb \
 --set couchdbConfig.couch_peruser.enable=true \
 --set couchdbConfig.couch_peruser.delete_dbs=true \
 --set couchdbConfig.couchdb.uuid=$(curl https://www.uuidgenerator.net/api/version4 2>/dev/null | tr -d -)

ADMIN_PASSWORD=$(kubectl get secret ${CLSUTER_NAME}-couchdb -o go-template='{{ .data.adminPassword }}' | base64 --decode)
echo $ADMIN_PASSWORD | kubectl exec --namespace default -it ${CLSUTER_NAME}-couchdb-0 -c couchdb -- \
    curl -X POST -s http://127.0.0.1:5984/_cluster_setup \
    -H "Content-Type: application/json" \
    -d '{"action": "finish_cluster"}' \
    -u admin


