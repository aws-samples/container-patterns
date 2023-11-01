---
title: Image count and image size metrics for Amazon Elastic Container Registry (ECR)
description: >-
  How to keep track of the total number of ECR repositories, container images, and total size of the images.
filterDimensions:
  - key: type
    value: pattern
authors:
  - peckn
date: Nov 1, 2023
---

#### About

#### Dependencies

```
git clone https://github.com/miketheman/ecr-metrics.git
```

#### Define the serverless application

<<< @/pattern/ecr-usage-metrics/files/template.yaml

#### Build the application

```
sam build
```

#### Deploy the application

```
sam deploy \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --resolve-image-repos \
  --stack-name ecr-metrics
```

#### Test it Out

#### Tear it Down