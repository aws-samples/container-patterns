---
title: Service Discovery for AWS Fargate tasks with AWS Cloud Map
description: >-
  How to setup service discovery in ECS, so that microservices can communicate with each other.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: capacity
    value: fargate
authors:
  - peckn
date: Oct 3, 2023
---

#### About

Service discovery is a technique for getting traffic from one container to another using the container's direct IP address, instead of routing traffic through an intermediary like a load balancer. Service discover is suitable for a variety of use cases:

- Privately networked, internal services that will not be used from the public internet
- Low latency communication between services
- Long lived bidirectional connections, such as gRPC.

Service discovery for AWS Fargate tasks is powered by [AWS Cloud Map](https://aws.amazon.com/cloud-map/). Amazon Elastic Container Service integrates with AWS Cloud Map to configure and sync a list of all your containers. You can then use Cloud Map DNS or API calls to look up the IP address of another task, and open a connection to it.

#### Architecture

In this reference you will deploy the following architecture:

- A front facing `hello` service
- A backend `name` service

The front end `hello` service will use service discovery to send a request to the backend `name` service. The `name` service will return a random name to the `hello` service.

#### Dependencies

This pattern requires that you have an AWS account, and that you use AWS Serverless Application Model (SAM) CLI. If not already installed then please [install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for your system.

#### Define the networking

For this architecture we are going to use private networking for the backend services, so grab the `vpc.yml` file from ["Large VPC for Amazon ECS Cluster"](/large-vpc-for-amazon-ecs-cluster). Do not deploy this CloudFormation yet. We will deploy it later on.

#### Define the cluster

The following template defines an ECS cluster and a Cloud Map namespace that will be used to store information about the tasks in the cluster:

#### Define the `hello` service

#### Define the `name` service

#### Deploy it all

You should have the following three files:

- `vpc.yml` - Template for the base VPC that you wish to host resources in
- `cluster.yml` - Template for the ECS cluster and its capacity provider
- `hello.yml` - Template for the `hello` service that will be deployed on the cluster
- `name.yml` - Template for the `name` service that will be deployed on the cluster

Use the following parent stack to deploy all three stacks:

<<< @/pattern/service-discovery-fargate-microservice-cloud-map/files/parent.yml

Use the following command to deploy all three stacks:

```shell
sam deploy \
  --template-file parent.yml \
  --stack-name service-discovery-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```