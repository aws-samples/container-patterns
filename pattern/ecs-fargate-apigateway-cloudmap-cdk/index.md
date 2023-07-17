---
title: API Gateway load balanced Fargate service with Cloud Map using CDK construct
description: >-
  Use CDK construct to deploy an API Gateway load balanced Fargate service with Cloud Map.
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
  - key: app
    value: website
authors:
  - pahud
date: July 17 2023
---

#### About

`ApiGatewayLoadBalancedFargateService` is a L3 construct of AWS Cloud Development Kit(CDK) that allows you to deploy a Fargate service with Amazon API Gateway and pass the traffic through VPC link to the Fargate service running in the VPC private subnets. No application or network load balancer is required. The service discovery capability is achieved by the [AWS Cloud Map](https://aws.amazon.com/cloud-map/) service that comes with ECS [service connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html).


#### Setup Cloud Development Kit

To use this pattern you need TypeScript and Node. First, ensure that you have Node.js installed on your development machine. Then create the following files:

<tabs>
<tab label="package.json">

<<< @/pattern/ecs-fargate-apigateway-cloudmap-cdk/files/package.json

</tab>

<tab label='tsconfig.json'>

<<< @/pattern/ecs-fargate-apigateway-cloudmap-cdk/files/tsconfig.json

</tab>

<tab label='cdk.json'>

<<< @/pattern/ecs-fargate-apigateway-cloudmap-cdk/files/cdk.json

</tab>
</tabs>

The files above serve the following purpose:

- `package.json` - This file is used by NPM or Yarn to identify and install all the required dependencies:
- `tsconfig.json` - Configures the TypeScript settings for the project:
- `cdk.json` - Tells CDK what command to run, and provides a place to pass other contextual settings to CDK.

Run the following commands to install dependencies and setup your AWS account for the deployment:

```sh
yarn install
npx cdk bootstrap
```

#### Deploy the sample App


<<< @/pattern/ecs-fargate-apigateway-cloudmap-cdk/files/index.ts


```sh
npx cdk diff
```

Deploy the stack:

```sh
npx cdk deploy
```

You will see an `Outputs` section that shows the DNS name of the load balancer that provides ingress to the service. When you load up that URL you should see a random name, and the address of the container instance, similar to this:

```txt
Catalina (ip-10-0-199-15.us-east-2.compute.internal)
```

#### Next Steps



#### Clean Up

You can tear down the stack using the following command:

```sh
npx cdk destroy
```