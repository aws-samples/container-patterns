---
title: IPv6 support for Amazon ECS
description: >-
  Experiment with IPv6 support
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
  - peckn
date: March 6 20245
---

### Build the test image

```sh
REPO_URI=$(aws ecr create-repository --repository-name sample-app-repo --query 'repository.repositoryUri' --output text)
if [ -z "${REPO_URI}" ]; then
  REPO_URI=$(aws ecr describe-repositories --repository-names sample-app-repo --query 'repositories[0].repositoryUri' --output text)
fi
docker build -t ${REPO_URI}:ipv6-app ./app
docker push ${REPO_URI}:ipv6-app
```

### Deploy the stack

```sh
sam deploy \
  --template-file parent.yml \
  --stack-name ipv6-environment \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ImageUri=${REPO_URI}:ipv6-app \
  --resolve-s3
```