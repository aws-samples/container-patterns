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
  - key: capacity
    value: fargate
  - key: feature
    value: service-connect
authors:
  - pahud
date: July 17 2023
---

#### About

`ApiGatewayLoadBalancedFargateService` is an AWS Cloud Development Kit(CDK) L3 construct that allows you to deploy a web service with Amazon API Gateway and route the traffic through VPC link to the Fargate service running in the VPC private subnets. No application or network load balancer is required. The service discovery capability is provided by the [AWS Cloud Map](https://aws.amazon.com/cloud-map/) service that comes with ECS [service connect](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-connect.html).

!!! @/pattern/ecs-fargate-apigateway-cloudmap-cdk/files/diagram.svg

### Sample

```ts
new ApiGatewayLoadBalancedFargateService(stack, 'DemoService', {
  vpc,
  cluster,
  taskDefinition,
  desiredCount: 2,
  vpcLinkIntegration: VpcLinkIntegration.CLOUDMAP,
});
```


#### Setup Cloud Development Kit

To use this pattern you need TypeScript and Node. First, ensure that you have Node.js installed on your development machine. Then create the following files:

<tabs>
<tab label="package.json">

<<< @/pattern/ecs-fargate-apigateway-cloudmap-cdk/files/package.json

</tab>

<tab label='tsconfig.dev.json'>

<<< @/pattern/ecs-fargate-apigateway-cloudmap-cdk/files/tsconfig.dev.json

</tab>

<tab label='cdk.json'>

<<< @/pattern/ecs-fargate-apigateway-cloudmap-cdk/files/cdk.json

</tab>
</tabs>

The files above serve the following purpose:

- `package.json` - This file is used by NPM or Yarn to identify and install all the required dependencies:
- `tsconfig.dev.json` - Configures the TypeScript settings for the project:
- `cdk.json` - Tells CDK what command to run, and provides a place to pass other contextual settings to CDK.

Run the following commands to install dependencies and setup your AWS account for the deployment:

```sh
yarn install
npx cdk bootstrap
```

#### Deploy the sample App


<<< @/pattern/ecs-fargate-apigateway-cloudmap-cdk/files/src/integ.default.ts


```sh
npx cdk diff
```

Deploy the stack:

```sh
npx cdk deploy
```

You will see an `Outputs` section that shows the endpoint URL of the API Gateway. When you load up that URL you should see the nyancat demo animation.


#### Next Steps

As this sample comes with a L3 construct `ApiGatewayLoadBalancedFargateService`, you can modify the typescript under `files/src` to create your own CDK application using the provided contruct with custom properties. For example, if you create your sample app and save as `sample.ts`, run this command in `files` to deploy your CDK app in `sample.ts`:

```sh
npx cdk -a 'npx ts-node --prefer-ts-exts src/sample.ts' diff
npx cdk -a 'npx ts-node --prefer-ts-exts src/sample.ts' deploy
```


#### Clean Up

You can tear down the stack using the following command:

```sh
npx cdk destroy
```