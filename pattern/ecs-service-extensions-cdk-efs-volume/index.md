---
title: Using ECS Service Extensions to attach a file system volume to a task
description: >-
  A service extension that attaches an Elastic File System (EFS) volume to a container
  running through ECS
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
authors:
  - peckn
date: Jul 11 2023
---

#### About

The [`ecs-service-extensions`](https://www.npmjs.com/package/@aws-cdk-containers/ecs-service-extensions) package is an extendable plugin system for defining Amazon ECS service deployments in AWS Cloud Development Kit (CDK).

Amazon ECS has a large configuration area, and many different features that can be configured. The goal of ECS Service Extensions is to make smaller, reusable chunks of declarative CDK configuration that can be applied to your service in layers.

This pattern shows a service extension that attaches an Amazon Elastic File System to a task. It configures the volume on both the container as well as the task, and also provisions the appropriate IAM permissions and security group rules to allow communication between the
file system and the container.

#### Setup Cloud Development Kit

To use this pattern you need [Node.js](https://nodejs.org/en) installed. First, ensure that you have Node.js installed on your development machine. Then create the following files:

<tabs>
<tab label="package.json">

<<< @/pattern/ecs-service-extensions-cdk-efs-volume/files/package.json

</tab>

<tab label='tsconfig.json'>

<<< @/pattern/ecs-service-extensions-cdk-efs-volume/files/tsconfig.json

</tab>

<tab label='cdk.json'>

<<< @/pattern/ecs-service-extensions-cdk-efs-volume/files/cdk.json

</tab>
</tabs>

The files above serve the following purpose:

- `package.json` - This file is used by NPM or Yarn to identify and install all the required dependencies:
- `tsconfig.json` - Configures the TypeScript settings for the project:
- `cdk.json` - Tells CDK what command to run, and provides a place to pass other contextual settings to CDK.

Run the following commands to install dependencies and setup your AWS account for the deployment:

```sh
npm install
npm run-script cdk bootstrap
```

#### Create the CDK App

Now create the following file to define the basic CDK application:

<<< @/pattern/ecs-service-extensions-cdk-efs-volume/files/index.ts
