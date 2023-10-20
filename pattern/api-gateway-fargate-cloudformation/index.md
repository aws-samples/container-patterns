---
title: Serverless API Gateway Ingress for AWS Fargate, in CloudFormation
description: >-
  CloudFormation templates to setup an AWS Fargate task with serverless
  API Gateway ingress
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: capacity
    value: fargate
authors:
  - peckn
date: Oct 20, 2023
---

```
sam deploy \
  --template-file parent.yml \
  --stack-name api-gateway-fargate \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```