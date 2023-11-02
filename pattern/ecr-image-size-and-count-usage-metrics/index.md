---
title: Image count and image size metrics for Amazon Elastic Container Registry (ECR)
description: >-
  How to keep track of the total number of ECR repositories, container images, and total size of the images.
filterDimensions:
  - key: type
    value: pattern
authors:
  - mike-fiedler
date: Nov 1, 2023
---

#### About

[Amazon Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/) is a fully managed registry that makes it easy to store, share, and deploy your container images.

[Amazon CloudWatch](https://aws.amazon.com/cloudwatch/) is the built-in service for monitoring applications and resource usage on your AWS account.

This pattern will help you setup tooling to gather Amazon ECR stats and put them into Amazon CloudWatch so that you can keep track of the growth of your ECR image storage over time, and set up custom alarms based on your desired threshold.

#### Architecture

You will deploy the following infrastructure:

!!! @/pattern/ecr-image-size-and-count-usage-metrics/diagram.svg

1. EventBridge Scheduler invokes a Lambda function on a schedule of your choice
2. The Lambda function uses the AWS SDK to fetch metadata about your ECR repositories
3. The Lambda function puts the metadata into CloudWatch as a metric.

#### Dependencies

This pattern uses AWS SAM CLI for deploying CloudFormation stacks on your account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

Additionally, you need to clone the following open source git repo:

```
git clone https://github.com/miketheman/ecr-metrics.git
```

#### Define the serverless application

In order to deploy this open source project you will add two pieces:

First, a `Dockerfile` defines how to build and package this open source code into a container image that can run in AWS Lambda.

<<< @/pattern/ecr-image-size-and-count-usage-metrics/files/Dockerfile{Dockerfile}

Second, a SAM template defines how to deploy the container image as a serverless Lambda function that runs on a cron schedule.

<<< @/pattern/ecr-image-size-and-count-usage-metrics/files/template.yml

Note the `rate(30 minutes)`. You can change this depending on how frequently developers push images to ECR, and how granular you would like the metric to be.

Place both of these files in the same folder as your cloned repo. The directory structure should look like this:

```
.
├── Dockerfile
├── ecr-metrics
│   ├── README.md
│   ├── TODO.md
│   ├── poetry.lock
│   ├── pyproject.toml
│   ├── src
│   │   └── ecr_metrics
│   │       └── main.py
│   └── tests
│       ├── responses.md
│       └── test_main.py
└── template.yml

4 directories, 9 files
```

#### Build the application

First, use SAM to build the container image.

```sh
sam build
```

To verify it worked, look for the `.aws-sam` folder in your current working directory.

#### Deploy the application

Next use the SAM template to deploy the built container image and setup the scheduled Lambda function:

```
sam deploy \
  --capabilities CAPABILITY_IAM \
  --resolve-s3 \
  --resolve-image-repos \
  --stack-name ecr-metrics
```

#### Test it Out

Wait a few minutes and then check inside of CloudWatch Metrics. You should see a new custom namespace called "ECR" with metrics for each of your ECR repositories, similar to the following screenshot:

![](./screenshot.png)

#### Tear it Down

If you are no longer interested in tracking ECR metrics you can tear down the deployment with:

```sh
sam delete --stack-name ecr-metrics
```