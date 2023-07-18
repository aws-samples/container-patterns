---
title: Load balanced container service with ECS Service Extensions
description: >-
  Use the ECS Service Extensions package for AWS Cloud Development Kit to deploy a simple load balanced web container.
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
  - key: app
    value: website
authors:
  - peckn
date: April 19 2023
---

#### About

The [`ecs-service-extensions`](https://www.npmjs.com/package/@aws-cdk-containers/ecs-service-extensions) package is an extendable plugin system for defining Amazon ECS service deployments in AWS Cloud Development Kit.

This pattern shows how to use `ecs-service-extensions` to deploy a basic load balanced workload through ECS.

#### Setup Cloud Development Kit

To use this pattern you need TypeScript and Node. First, ensure that you have Node.js installed on your development machine. Then create the following files:

<tabs>
<tab label="package.json">

<<< @/pattern/ecs-service-extensions-load-balancer-cdk/files/package.json

</tab>

<tab label='tsconfig.json'>

<<< @/pattern/ecs-service-extensions-load-balancer-cdk/files/tsconfig.json

</tab>

<tab label='cdk.json'>

<<< @/pattern/ecs-service-extensions-load-balancer-cdk/files/cdk.json

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

#### Create the CDK app

Now create the following file to define the CDK application itself:

<<< @/pattern/ecs-service-extensions-load-balancer-cdk/files/index.ts

The ECS Service Extensions library simplifies container deployment
by providing an `Environment` resource which automatically creates the networking stack and ECS cluster on your behalf.

You can then create a `ServiceDescription`. This is a wrapper for all the settings associated with your container deployment. You can add your `Container` to the service definition. Attaching a load balancer is also done by adding the `HttpLoadBalancerExtension` to the service description.

Finally, the `ServiceDescription` is instantiated into a `Service` inside the `Environment`.

You can preview all the AWS resources to be created using the following command:

```sh
npm run-script cdk diff
```

Deploy the stack:

```sh
npm run-script cdk deploy
```

You will see an `Outputs` section that shows the DNS name of the load balancer that provides ingress to the service. When you load up that URL you should see a random name, and the address of the container instance, similar to this:

```txt
Catalina (ip-10-0-199-15.us-east-2.compute.internal)
```

#### Clean Up

You can tear down the stack using the following command:

```sh
npm run-script cdk destroy
```

#### Next Steps

* You can use the `ecs.ContainerImage.fromAsset()` SDK call to have Cloud Development Kit automatically build your own local Dockerfile into an image to deploy.
* Try using [ECS Service Extensions to add the AWS FireLens log router](/ecs-service-extensions-firelens-cdk), for high performance log routing
* Learn how to [build your own custom ECS Service Extension](/ecs-service-extensions-custom-extension)
* Instead of building static content into the image consider using a dynamic [EFS File System volume to web content across multiple tasks](/ecs-service-extensions-cdk-efs-volume)