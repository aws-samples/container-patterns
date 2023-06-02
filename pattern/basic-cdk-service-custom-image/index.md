---
title: Basic container app with custom image build
description: >-
  A Cloud Development Kit app showing how to automatically
  build and upload local code as a container image when
  launching your application in AWS Fargate
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
  - key: capacity
    value: fargate
authors:
  - peckn
date: Jul 21, 2022
---

#### About

This pattern shows how to setup an AWS Cloud Development Kit (CDK) application
for building and deploying a container image. The container image will be deployed to serverless AWS Fargate capacity, managed by Amazon Elastic Container Service (ECS).

This pattern uses `aws-cdk-lib/aws-ecs-patterns`, which is a higher level CDK library with easy to use SDK's that launch a set of production ready resources for you with a single SDK call.

#### Development Environment

To use this pattern you need TypeScript and Node. First, ensure that you have Node.js installed on your development machine. Then create the following files:

<tabs>
<tab label="package.json">

<<< @/pattern/basic-cdk-service-custom-image/files/package.json

</tab>

<tab label='tsconfig.json'>

<<< @/pattern/basic-cdk-service-custom-image/files/tsconfig.json

</tab>

<tab label='cdk.json'>

```json
{
  "app": "node index"
}
```

</tab>
</tabs>

The files above serve the following purpose:

- `package.json` - This file is used by NPM or Yarn to identify and install all the required dependencies:
- `tsconfig.json` - Configures the TypeScript settings for the project:
- `cdk.json` - Tells CDK what command to run, and provides a place to pass other contextual settings to CDK.

#### CDK Application

Now you can create an `index.ts` file that has the actual code for the CDK application:

<<< @/pattern/basic-cdk-service-custom-image/files/index.ts

There are three core resource types you will see in this CDK application:

- `ec2.Vpc` - A private network to host your application resources
- `ecs.Cluster` - The ECS cluster is a namespace for holding all the instances of your application. The cluster comes with an AWS Fargate capacity provider that will be used to launch the application containers.
- `ecs_patterns.ApplicationLoadBalancedFargateService` - This is a high level CDK pattern which automatically creates an Application Load Balancer ingress, and launches the referenced image inside of the cluster, on AWS Fargate capacity.

You will also notice the `ecs.ContainerImage.fromAsset()` command. This code finds the local Dockerfile inside of the referenced folder, builds it into a container image, and then uploads that container image.

#### Commands

Use the following commands to interact with the sample CDK application:

* `npm run-script cdk diff` - Show a preview of resources to be deployed
* `npm run-script cdk deploy` - Deploy the resources onto your AWS account
* `npm run-script cdk destroy` - Tear down the deployed stack

#### Next steps

- If you would prefer to deploy your container onto EC2 capacity instead of serverless AWS Fargate capacity, there is an alternate pattern that demonstrates a [more advanced CDK application deploying a conatiner onto EC2 capacity](/advanced-public-facing-service-cdk).
-