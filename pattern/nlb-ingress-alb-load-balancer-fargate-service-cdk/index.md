---
title: Network Load Balancer Ingress for Application Load Balancer fronted AWS Fargate service
description: >-
  An AWS Cloud Development Kit app showing how to load balance an AWS Fargate service with an internal ALB, while providing public ingress via NLB.
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
  - key: capacity
    value: fargate
authors:
  - peckn
date: Feb 16, 2024
---

#### Terminology

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) deploys application containers on your behalf, and helps you connect them to a wide range of other AWS services.

[Application Load Balancer (ALB)](https://aws.amazon.com/elasticloadbalancing/application-load-balancer/) is a layer 7 load balancer that is HTTP aware.

[Network Load Balancer (NLB)](https://aws.amazon.com/elasticloadbalancing/network-load-balancer/) is a layer 4 load balancer. It distributes TCP and UDP connections to targets.

NLB is designed to serve as a public facing ingress that accepts inbound connections from the public internet. You can configure an NLB to distribute inbound connections to an ALB. The ALB can then be configured by ECS to distribute individual HTTP requests to application containers in your deployment.

[AWS Cloud Development Kit](https://aws.amazon.com/cdk/) is an open source software framework that helps you create and configure AWS resources using familiar programming languages.

This pattern will demonstrate how to use AWS Cloud Development Kit to deploy a sample container. Internet traffic will reach the container deployment via a dual layer load balancer setup. Public internet traffic will ingress via an NLB, which routes the connections to an ALB, which then distributes individual HTTP requests to application containers.

#### Why?

You may wish to use a dual load balancer setup for several reasons:

* Stable, static IP addresses - For business to business services, a common request is for your service endpoint to publish a list of IP addresses on which it accepts inbound traffic. Other organizations that wish to communicate to your service endpoint will then build an "allow list" of those IP address for their own networking configuration.
* Reduction in public IPv4 address usage - An NLB uses a single static IPv4 address per availability zone. Therefore you can use an NLB ingress to reduce the number of public IPv4 addresses in your networking architecture.
* Internal traffic routing. If you have a microservice architecture, then this dual layer setup allows internal services to communicate with each other via an internal ALB. Such service to service traffic will remain entirely inside of the VPC. When there is a single, public facing load balancer, service to service traffic leaves the VPC via the internet gateway, then returns back into the VPC via the public facing load balancer endpoint.

#### Architecture

The following diagram depicts the architecture you will deploy via this pattern:

!!! @/pattern/nlb-ingress-alb-load-balancer-fargate-service-cdk/diagram.svg

1. The VPC has both public subnets and private subnets. Resources launched into the public subnet use a public IP address. Resources launched into the private subnets do not have any public IP address, and they are only reachable from inside of the VPC.
2. The public subnet hosts an NLB with a stable, static Elastic IP in each availability zone.
3. The private subnet hosts an internal ALB, that serves as ingress to a container deployment in AWS Fargate.
4. Traffic from the public internet enters the VPC through the NLB. The NLB then forwards that traffic to the ALB, which routes the traffic to a container in AWS Fargate.

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

- The `elbv2.NetworkLoadBalancer` is configured in dual stack mode so that it can be reached via both IPv6 and IPv4 addresses.
- The `elbv2.NetworkLoadBalancer` is being reconfigured to use static elastic IP addresses that are provisioned as part of the CDK application. This enables upstream users to build an "allow list" is IP addresses if they so desire.

::: tip
This architecture does not configure an SSL certificate, so that it can be utilized even if you do not have a domain name at this time. In a production environment you should adjust the listener to use port 443, and use an attached Amazon Certificate Manager managed SSL certificate.
:::

#### Define the placeholder service

The CDK application will build and deploy a placeholder service which is defined using the following file:

<<< ./files/service/Dockerfile{Dockerfile}

This `Dockerfile` is a lightweight `busybox` container that runs an Apache HTTP server that listens on port 8080. The server hosts simple static content. In an actual deployment you would replace this placeholder container with your real application.

#### Deploy

At this point you should have the following files:

* `index.ts` - The entrypoint for the CDK application
* `package.json` - Defines the AWS Cloud Development Kit dependencies
* `cdk.json` - Defines how to run the CDK application
* `tsconfig.json` - TypeScript configuration
* `service/Dockerfile` - A placeholder application to deploy

You can use the following command to preview what CDK will create on your AWS account:

```sh
npx cdk diff
```

Use the following command to deploy the AWS Cloud Development Kit application.

```sh
npx cdk deploy \
  --all \
  --require-approval never
```

#### Test it Out

Grab the DNS name for the deployed service using the following command:

```sh
DNS_NAME=$(aws cloudformation describe-stacks --stack-name shared-resources --query "Stacks[0].Outputs[?OutputKey=='dns'].OutputValue" --output text) && echo $DNS_NAME
```

Now you can send a request to the NLB endpoint to see a response from the AWS Fargate hosted container:

```sh
curl $DNS_NAME/
```

#### Tear it Down

```sh
npx cdk destroy --all -f
```

#### See Also

- ["Shared Application Load Balancer for multiple AWS Fargate services, in AWS Cloud Development Kit"](cdk-shared-alb-for-amazon-ecs-fargate-service)
- ["Basic load balanced ECS service deployed on EC2 capacity"](advanced-public-facing-service-cdk)