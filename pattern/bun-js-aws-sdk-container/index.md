---
title: Bun JavaScript container that uses AWS SDK to connect to DynamoDB
description: >-
  Build a Bun JavaScript container that runs in AWS Fargate via Amazon ECS, and
  uses AWS SDK to query a DynamoDB table
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: capacity
    value: fargate
authors:
  - peckn
date: Sep 8, 2023
---

#### About

[Bun](https://github.com/oven-sh/bun) is a fast, lightweight server side JavaScript implementation that
is based on Apple's JavaScriptCore instead of Google's V8.

In this pattern you will learn how to create a container that hosts a Bun app,
and deploy the container to AWS Fargate using Amazon ECS.

The containerized application will use the AWS SDK to interact with DynamoDB table.
The sample application is a basic hit counter that will count the number of requests
that it receives, and return the grand total.

#### Architecture

The following architecture will be deployed to your AWS account:

!!! @/pattern/bun-js-aws-sdk-container/bun-javascript-fargate.svg

1. The application is packaged up as a container image that has the Bun runtime,
   application code, and the JavaScript AWS SDK.
2. Amazon ECS orchestrates a scalable replica set of containers running on AWS Fargate
3. Traffic ingress from the public arrives at the container via an Application Load Balancer
4. The container running inside of AWS Fargate uses the JavaScript AWS SDK, and an
  automatically vended AWS Identity and Access Management (IAM) Role.
5. Each time a request arrives at the container, it makes a database query to increment
  the hit counter, and return the result.

#### Dependencies

This pattern requires the following local dependencies:

* [Docker](https://www.docker.com/) or similar OCI compatible image builder.
* AWS SAM CLI for deploying CloudFormation stacks on your AWS account. You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### Build the application

Download the following files to define a simple JavaScript application:

<tabs>

<tab label='index.ts'>

<<< @/pattern/bun-js-aws-sdk-container/files/index.ts

</tab>

<tab label="package.json">

<<< @/pattern/bun-js-aws-sdk-container/files/package.json

</tab>

</tabs>

The files above serve the following purpose:

- `package.json` - Defines some third party open source packages to install. In specific,
  this installs AWS SDK dependencies for connecting to DynamoDB
- `index.ts` - A small JavaScript application that implements a hit counter that increments
   in DynamoDB each time a request arrives.

Now we can use the following `Dockerfile` to describe how to package this application up
and run it with the Bun JavaScript runtime:

```Dockerfile
FROM oven/bun
WORKDIR /srv

# Add the package manifest and install packages
ADD package.json .
RUN bun install

# Add the application code
ADD index.ts .

# Specify the command to run when launching the container
CMD bun index.ts
```

Build and push the application container image to a private Amazon ECR container registry
using the following commands:

```sh
REPO_URI=$(aws ecr create-repository --repository-name bun-hitcounter --query 'repository.repositoryUri' --output text)
docker build -t $REPO_URI .
docker push $REPO_URI
```

You can now open the [Amazon ECR console](https://console.aws.amazon.com/ecr/repositories) to verify that the image has been built and uploaded to AWS.

#### Choose a networking environment

This pattern can be deployed on top of either of the following VPC patterns:

- [Low cost VPC](/low-cost-vpc-amazon-ecs-cluster)
- [Large sized VPC](/large-vpc-for-amazon-ecs-cluster)

Which one you choose depends on your goals for this deployment. You can choose the low cost VPC to start with and upgrade to the large sized VPC later on if you have additional private services, or private database servers you wish to deploy in the VPC.

If you have any doubts as to which VPC to choose, then go with the "Low cost VPC" option.

Download the `vpc.yml` file from your chosen pattern, but do not deploy it yet. Deployment will be done later in the process

#### Define the Amazon ECS cluster

The following AWS CloudFormation template creates a simple Amazon ECS cluster that is setup for serverless usage with AWS Fargate.

<<< @/pattern/bun-js-aws-sdk-container/files/cluster.yml

#### Define the service

Now we will define the service itself and it's dependencies.

<<< @/pattern/bun-js-aws-sdk-container/files/service.yml

Some things to note in this template:

- The template creates a DynamoDB table resource called `HitCounter`.
- The template [gives the ECS task an IAM role](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html), which has permission to query
  and write to the DynamoDB table. The AWS SDK inside of the container will
  automatically assume this role and get permissions to access the table, using the
  [container credential provider that comes built-in to AWS SDK](https://docs.aws.amazon.com/sdkref/latest/guide/feature-container-credentials.html). You can find
  [documentation on the container metadata credential provider](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/Variable/fromContainerMetadata/).

#### Deploy the stack

You can use the following `parent.yml` with AWS SAM CLI to deploy
all the defined components at once:

<<< @/pattern/bun-js-aws-sdk-container/files/parent.yml

You should now have the following four YAML files:

- `vpc.yml` - Defines the core networking setup for the application
- `cluster.yml` - Defines the Amazon ECS cluster that will launch AWS Fargate tasks
- `service.yml` - Defines the settings for the Bun application, and the DynamoDB table it will connect to
- `parent.yml` - Orchestrates launching the previous three stacks on your AWS account.

Deploy using the following command:

```shell
sam deploy \
  --template-file parent.yml \
  --stack-name bun-fargate-hitcounter \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ImageUrl=$REPO_URI
```

#### Test it out

Open up the Amazon ECS console and locate the deployed service. The cluster and service name will be autogenerated, but will look something like this:

- Cluster: bun-fargate-hitcounter-ClusterStack-*
- Service: web

Click into the service details and then select the "Network" tab. Under the section "DNS Names" you can see the public facing load balancer ingress URL. Click on "open address" or copy and paste the URL to your browser window.

You will see a number, which is the number of web requests that have hit this endpoint so far. You can reload the URL to see the number count up.

#### Next steps

* Try increasing the CPU and memory size of the Fargate task in the `AWS::ECS::TaskDefinition` in `service.yml`, or increasing the desired count of deployed tasks in the `AWS::ECS::Service` from two to ten.
* Try running a load test with [`ab`](https://httpd.apache.org/docs/2.4/programs/ab.html) or [`hey`](https://github.com/rakyll/hey) to see how Bun in AWS Fargate performs under load.