---
title: Serverless public facing website hosted on AWS Fargate
description: >-
  A containerized website, hosted as a public facing service, managed by ECS, hosted on serverless AWS Fargate capacity
filterDimensions:
  - key: tool
    value: cloudformation
  - key: app
    value: website
  - key: capacity
    value: fargate
  - key: type
    value: pattern
authors:
  - peckn
date: May 17, 2023
---

#### About

A public facing web service is one of the most common architecture patterns for deploying containers on AWS. It is well suited for:

- A static HTML website, perhaps hosted by NGINX or Apache
- A dynamically generated web app, perhaps served by a Node.js process
- An API service intended for the public to access
- An edge service which needs to make outbound connections to other services on the internet

With this pattern you will deploy a serverless container through Amazon ECS, which is hosted on AWS Fargate capacity.

::: warning
This pattern is not well suited for:

- A private internal API service
- An application that has very strict networking security requirements

For the above use cases instead consider using the [private subnet version of this pattern, designed for private API services](public-facing-api-ecs-fargate-cloudformation).
:::

#### Architecture

The architecture is as follows:

!!! @/pattern/public-facing-web-ecs-fargate-cloudformation/diagram.svg

All resources run in a public subnet of the VPC. This means there is no NAT gateway charge or other networking resources required. The public facing ALB is hosted in the public subnet, as are the container tasks that run in AWS Fargate.

AWS Fargate provisions Elastic Network Interfaces (ENIs) for each task. The ENI has both a public and a private IP address. This allows the task to initiate outbound communications directly to the internet via the VPC's internet gateway.

In order to protect the task from unauthorized inbound access it has a security group which is configured to reject all inbound traffic that did not originate from the security group of the load balancer.

#### Dependencies

This pattern requires that you have an AWS account, and that you use AWS Serverless Application Model (SAM) CLI. If not already installed then please [install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for your system.

#### Choose a VPC

This pattern can be deployed on top of either of the following VPC patterns:

- [Low cost VPC](/low-cost-vpc-amazon-ecs-cluster)
- [Large sized VPC](/large-vpc-for-amazon-ecs-cluster)

Which one you choose depends on your goals for this deployment. You can choose the low cost VPC to start with and upgrade to the large sized VPC later on if you have additional private services, or private database servers you wish to deploy in the VPC.

Download the `vpc.yml` file from your chosen pattern, but do not deploy it yet. Deployment will be done later in the process.

#### Define the Amazon ECS cluster

The following AWS CloudFormation template creates a simple Amazon ECS cluster that is setup for serverless usage with AWS Fargate.

<<< @/pattern/public-facing-web-ecs-fargate-cloudformation/files/cluster.yml

You will notice that this cluster is extremely minimal. It has no EC2 capacity, nor EC2 capacity provider because it is intended to be used exclusively with AWS Fargate capacity. If you wish to deploy EC2 instances take a look at the similar patter for [an ECS managed web service on EC2 instances](/public-facing-web-ecs-ec2-cloudformation).

#### Define the service deployment

Next we need to define an Amazon ECS service that deploys a container using AWS Fargate:

<<< @/pattern/public-facing-web-ecs-fargate-cloudformation/files/service.yml

#### Deploy it all

You should have the following three files:

- `vpc.yml` - Template for the base VPC that you wish to host resources in
- `cluster.yml` - Template for the ECS cluster and its capacity provider
- `service.yml` - Template for the web service that will be deployed on the cluster

Use the following parent stack to deploy all three stacks:

<<< @/pattern/public-facing-web-ecs-fargate-cloudformation/files/parent.yml

Use the following command to deploy all three stacks:

```shell
sam deploy \
  --template-file parent.yml \
  --stack-name serverless-web-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Test it Out

Open the Amazon ECS cluster in the web console and verify that the service has been created with a desired count of two. You will observe the service create tasks that launch into AWS Fargate. Last but not least ECS will register the task's IP addresses with the Application Load Balancer so that it can send them traffic.

On the "Health & Metrics" tab of the service details page you can click on the load balancer name to navigate to the load balancer in the EC2 console. This will give you the load balancer's public facing CNAME that you can copy and paste into your browser to verify that the sample NGINX webserver is up and running.

#### Tear it down

You can tear down the entire stack with the following command:

```shell
sam delete --stack-name serverless-web-environment
```

#### See Also

- If you plan to run an extremely large deployment, or you wish to have more control over the exact CPU and other characteristics of your underlying infrastructure then consider deploying [the EC2 version of this pattern, which deploy a public web service on EC2 instances](/public-facing-web-ecs-ec2-cloudformation).
- This stack does not deploy an automatic scaling for the containerized service. If you expect varying amounts of traffic you should [add automatic scaling to your service](/scale-ecs-service-cloudformation).