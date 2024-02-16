---
title: Shared Application Load Balancer for multiple AWS Fargate services, in AWS Cloud Development Kit
description: >-
  An AWS Cloud Development Kit app showing how to share an ALB between multiple ECS services in AWS Fargate
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
  - key: capacity
    value: fargate
authors:
  - peckn
date: Feb 8, 2024
---

#### Terminology

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) deploys application containers on your behalf, and helps you connect them to a wide range of other AWS services.

[Application Load Balancer (ALB)](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/) is a layer 7 load balancer that is HTTP aware. It can route HTTP requests to backend targets based on characteristics of the request such as hostname or request path.

ECS integrates ALB as an ingress that can send traffic to your application containers. You can configure a single public facing Application Load Balancer to route traffic to multiple different ECS services.

[AWS Cloud Development Kit](https://aws.amazon.com/cdk/) is an open source software framework that helps you create and configure AWS resources using familiar programming languages.

This pattern will demonstrate how to use AWS Cloud Development Kit to deploy two sample containers as ECS services, and configure an application load balancer as a shared ingress that does path based routing to the two services.

#### Why?

You may wish to provision a single shared ALB for multiple ECS services for the following reasons:

* Reduce cost - Each ALB has an hourly charge associated with it. Therefore it is more cost efficient to use a single shared ALB, backed by multiple different services, rather than provisioning a separate ALB for each service. Additionally, as each public facing ALB consumes public IPv4 addresses, you may wish to decrease the number of IPv4 addresses that your architecture utilizes.
* Service discovery - Rather than needing to keep track of different DNS names for each service you deploy, you can route all traffic to a single DNS name. The routing rules inside of the application load balancer will separate out the HTTP traffic to the appropriate service.

#### Architecture

The following diagram shows the architecture that you will be deploying:

!!! @/pattern/cdk-shared-alb-for-amazon-ecs-fargate-service/diagram.svg

* Two different ECS services are deployed in AWS Fargate: `service-one` and `service-two`. Each service can be independently scaled up and down if that particular service has more load than the other service.
* A single, shared, internet-facing Application Load Balancer serves as ingress to both services.
* The ALB has two target groups, with HTTP routing rules that match HTTP paths `/service-one*` and `/service-two*`.
* Incoming web traffic is distributed to the appropriate backend service based on the path of the HTTP request.

This approach can be generalized to many types of deployment such as an API that is backed by multiple microservices that fulfill different business functions. For example an REST style API could be implemented as:

* `http://api.mycompany.com/user/*` routing to the `user` service
* `http://api.mycompany.com/payment/*` routing to the `payment` service

#### Setup the Cloud Development Kit environment

To use this pattern you need the [Node.js](https://nodejs.org/en) JavaScript runtime.

Next you need to define some environment dependencies so that you can install AWS Cloud Development Kit. Create the following local files:

<tabs>
<tab label="package.json">

<<< files/package.json

</tab>

<tab label='tsconfig.json'>

<<< files/tsconfig.json

</tab>

<tab label='cdk.json'>

<<< files/cdk.json

</tab>
</tabs>

The files above serve the following purpose:

- `package.json` - This file is used by NPM or Yarn to identify and install all the required dependencies:
- `tsconfig.json` - Configures the TypeScript settings for the project:
- `cdk.json` - Tells CDK what command to run, and provides a place to pass other contextual settings to CDK.

After creating these files, install all the required dependencies using the following command:

```sh
npm install
```

#### Create the application

Now create a file `index.ts` which is the entrypoint for the CDK deployment:

<<< files/index.ts

A few things to note in this code:

- The CDK application uses three stacks. The `SharedStack` defines shared resources like the cluster and the Application Load Balancer. Two instances of the `LoadBalancerAttachedService` stack are used to attach ECS services to the load balancer
- `elbv2.ListenerAction.fixedResponse` is a default fallback action. This allows the ALB to be created with no services attached, just a fixed response of `OK`. Later, the ECS services can be attached onto paths in the load balancer.
- `elbv2.ListenerCondition.pathPatterns` is used to define HTTP paths that the service is attached to
- `priority` is used to control the order that ALB routing rules evaluate in. Each service must have a unique priority number.

#### Define the placeholder services

The CDK application will build and deploy two placeholder services which are defined using the following files:

<tabs>
<tab label="service-one/Dockerfile">

<<< files/service-one/Dockerfile{Dockerfile}

</tab>

<tab label="service-two/Dockerfile">

<<< files/service-two/Dockerfile{Dockerfile}

</tab>

</tabs>

The `Dockerfile` for both services, is just a lightweight `busybox` container that runs an Apache HTTP server that listens on port 8080. The server hosts simple static content. In an actual deployment you would replace these placeholder containers with your real application.

#### Deploy

You should now have the following files:

* `index.ts` - The entrypoint for the CDK application
* `package.json` - Defines the AWS Cloud Development Kit dependencies
* `cdk.json` - Defines how to run the CDK application
* `tsconfig.json` - TypeScript configuration
* `service-one/Dockerfile` - A placeholder application for `service-one`
* `service-two/Dockerfile` - A placeholder application for `service-two`

You can use the following command to preview what CDK will create on your AWS account:

```sh
npx cdk diff
```

Then use the following commands to deploy the CDK application to your AWS account:

```sh
npx cdk deploy \
  --asset-parallelism=true \
  --require-approval=never \
  --concurrency 2 \
  service-one service-two
```

::: tip
A more simplistic deployment could be accomplished with `npx cdk deploy --all`

The command given above is designed to optimize overall deployment speed by deploying the base stack first, and then deploying the two service stacks concurrently, for maximum deploy speed.
:::

#### Test it out

Grab the DNS name for the deployed service using the following command:

```sh
DNS_NAME=$(aws cloudformation describe-stacks --stack-name shared-resources --query "Stacks[0].Outputs[?OutputKey=='dns'].OutputValue" --output text) && echo $DNS_NAME
```

Now you can send requests to two different paths on this shared ALB, and see two different responses from the two different ECS services:

```sh
curl $DNS_NAME/service-one/
curl $DNS_NAME/service-two/
```

#### Tear it down

Tear down the deployment with the following command:

```sh
npx cdk destroy --all -f
```

#### Next steps

- [Configure a `CnameRecord`](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53.CnameRecord.html) for the load balancer, so that you can use a more friendly alias like `api.mycompany.com/service-one`
- Consider two tier load balancing: public facing network load balancer as ingress to an internal application load balancer that routes to your services.

#### See Also

- ["Basic load balanced ECS service deployed on EC2 capacity"](advanced-public-facing-service-cdk)
- ["Network Load Balancer Ingress for Application Load Balancer fronted AWS Fargate service"](nlb-ingress-alb-load-balancer-fargate-service-cdk)