---
title: Amazon ECS cluster with isolated VPC and no NAT Gateway
description: >-
  Run an isolated ECS cluster with no internet access, only PrivateLink endpoints
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
 - peckn
date: 2024-03-01
---

#### Terminology

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a serverless orchestrator that manages container deployments on your behalf.

[Amazon Virtual Private Cloud (VPC)](https://aws.amazon.com/vpc/) helps you define and launch AWS resources in a logically isolated virtual network.

[AWS PrivateLink](https://aws.amazon.com/privatelink/) helps establish connectivity between VPC's and AWS services without exposing data to the internet.

In this pattern you will learn how to setup a private, isolated container workload, orchestrated by Amazon ECS. Containers will run in an isolated VPC that has no internet access at all. Access to foundational AWS services will provided via AWS PrivateLink.

#### Why?

A fully isolated VPC is used in the following situations:

- You wish to avoid all possibility of dangerous inbound communications from the internet. An isolated VPC does not even have an internet gateway that would allow inbound traffic to reach your workloads.
- You want to avoid the possibility of data exfiltration. The isolated VPC does not have a NAT gateway or other route to the public internet. Data can only be exfiltrated via AWS services like S3, or similar. Therefore it is a lot easier to lock down the flow of data out of the network as well.
- You want to avoid using public IP addresses at all. In the isolated network there is no public IP address usage whatsoever.

#### Architecture

#### Dependencies

This pattern uses AWS SAM CLI for deploying CloudFormation stacks on your account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### Define the isolated VPC

<<< ./files/isolated-vpc.yml

#### Define the cluster

<<< ./files/cluster.yml

#### Define the container workload

<<< ./files/private-service.yml

#### Build and Push a Sample Container

When running an private service in an isolated VPC, it is not possible
to pull sample images from a public registry on the public internet. Therefore,
you must build and push your own private container image to run. The following
instructions will guide you through this process.

Start by downloading the following `Dockerfile` that defines the container image:

<<< ./files/service/Dockerfile{Dockerfile}

Then use the following commands to create a private ECR repository, build the
container image, and then push the container image to the private repository:

::: info
The following script assumes that you already have the [Amazon ECR credential helper](https://github.com/awslabs/amazon-ecr-credential-helper) installed in your dev environment. This credential helper will automatically obtain credentials for uploading private container images when needed, using your environment's AWS credentials or role.
:::

```sh
# Replace this with a static value once the REPO is created.
REPO_URI=$(aws ecr create-repository --repository-name sample-app-repo --query 'repository.repositoryUri' --output text)
docker build -t ${REPO_URI}:sample .
docker push ${REPO_URI}:sample
```

#### Deploy it All

```sh
sam deploy \
  --template-file parent.yml \
  --stack-name isolated-vpc-environment \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ImageUri=${REPO_URI}:sample \
  --resolve-s3
```

#### Tear it Down

```sh
sam delete --stack-name isolated-vpc-environment --no-prompts
```