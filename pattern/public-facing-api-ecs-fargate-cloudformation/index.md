---
title: Serverless public facing API hosted on AWS Fargate
description: >-
  A serverless, containerized public facing API in a private network, managed by ECS, hosted on AWS Fargate
filterDimensions:
  - key: tool
    value: cloudformation
  - key: app
    value: api
  - key: capacity
    value: fargate
  - key: type
    value: pattern
authors:
  - peckn
date: May 18, 2023
alternatives:
  - key: app
    value: website
    id: public-facing-web-ecs-fargate-cloudformation
    description: Want to deploy a more public facing website instead?
  - key: capacity
    value: ec2
    id: public-facing-web-ecs-ec2-cloudformation
    description: Host really large deployments on EC2 instances.
---

#### About

Sometimes you want to create a public facing service, but you want stricter control over the networking of the service. This pattern is especially useful for the following usecases:

- An API which is public facing but needs an extra layer of security hardening by not even having a public IP address that an attacker could send a request directly to.
- An API service which needs to be massively horizontally scalable while not being constrained by number of IP addresses available.
- A web or API service which initiates outbound connections but to the public you want those connections to originate from a specific and limited set of IP addresses that can be whitelisted.

::: warning
This pattern is not suited for:

Services that have high throughput/bandwidth to other services on the internet. Because this pattern use a NAT gateway to provide internet to resources in a private subnet you will be sending a lot of bandwidth through the NAT gateway and paying extra per GB of outbound traffic. Instead consider using the [public facing version of this pattern, which hosts public facing tasks with public IP addresses assigned by AWS Fargate](/public-facing-web-ecs-fargate-cloudformation)
:::

#### Architecture

At a high level the architecture looks like this:

!!! @/pattern/public-facing-api-ecs-fargate-cloudformation/diagram.svg

Everything is deployed in an Amazon Virtual Private Cloud (VPC) which has two subnets:

- Public subnet: Has an attached internet gateway to allow resources launched in that subnet to accept connections from the internet, and initiate connections to the internet. Resources in this subnet have public IP addresses.
- Private subnet: For internal resources. AWS Fargate tasks in this subnet have no direct internet access, and only have private IP addresses that are internal to the VPC, not directly accessible by the public.

The public facing subnet hosts a couple resources:

- Public facing load balancer: Accepts inbound connections on specific ports, and forwards acceptable traffic to resources inside the private subnet.
- NAT gateway: A networking bridge to allow resources inside the private subnet to initiate outbound communications to the internet, while not allowing inbound connections.

#### Dependencies

This pattern requires that you have an AWS account, and that you use AWS Serverless Application Model (SAM) CLI. If not already installed then please [install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for your system.

#### Define the VPC

To deploy this pattern you will use the [base pattern that defines a large VPC for an Amazon ECS cluster](/large-vpc-for-amazon-ecs-cluster). This will deploy the public and private subnets as well as the NAT gateway that provides internet access to the private subnets. Download the `vpc.yml` file from that pattern, but don't deploy it yet. You will deploy the VPC later as part of this pattern.

#### Define the cluster

The following AWS CloudFormation template creates a simple Amazon ECS cluster that is setup for serverless usage with AWS Fargate.

<<< @/pattern/public-facing-api-ecs-fargate-cloudformation/files/cluster.yml

#### Define the service

Next we need to define an Amazon ECS service that deploys a container using AWS Fargate. The following template deploys an Application Load Balancer into the VPC public subnet, while deploying the containers themselves into AWS Fargate in the private subnet:

<<< @/pattern/public-facing-api-ecs-fargate-cloudformation/files/service.yml

#### Deploy it all

You should now have the following three files:

- `vpc.yml` - Template for the base VPC that you wish to host resources in
- `cluster.yml` - Template for the ECS cluster and its capacity provider
- `service.yml` - Template for the web service that will be deployed on the cluster

Use the following parent stack to deploy all three stacks:

<<< @/pattern/public-facing-api-ecs-fargate-cloudformation/files/parent.yml

Use the following command to deploy all three stacks:

```shell
sam deploy \
  --template-file parent.yml \
  --stack-name serverless-api-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Test it out

Open the Amazon ECS cluster in the web console and verify that the service has been created with a desired count of two. You will observe the service create tasks that launch into AWS Fargate. Last but not least ECS will register the task's IP addresses with the Application Load Balancer so that it can send them traffic.

On the "Health & Metrics" tab of the service details page you can click on the load balancer name to navigate to the load balancer in the EC2 console. This will give you the load balancer's public facing CNAME that you can copy and paste into your browser to verify that the sample NGINX webserver is up and running.

#### Tear it down

You can tear down the entire stack with the following command:

```shell
sam delete --stack-name serverless-api-environment
```

#### See Also

- If you plan to run an extremely large workload that requires many vCPU's worth of compute resources, or you wish to have more control over the precise CPU generation used to power your application, then consider [using Amazon ECS to host your containerized API service on EC2](/public-facing-api-ecs-ec2-cloudformation).
- This pattern does not configure scaling. Consider [using the target tracking scaling pattern to add autoscaling](/target-tracking-scale-ecs-service-cloudformation).