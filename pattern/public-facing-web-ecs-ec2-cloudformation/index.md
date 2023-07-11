---
title: Public facing website hosted on EC2 instances
description: >-
  A containerized website, hosted as a public facing service, managed by EC2, hosted on EC2 capacity.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: app
    value: website
  - key: capacity
    value: ec2
  - key: type
    value: pattern
authors:
  - peckn
date: May 12, 2023
alternatives:
  - key: app
    value: api
    id: public-facing-api-ecs-ec2-cloudformation
    description: An API service with private networking configured.
  - key: capacity
    value: fargate
    id: public-facing-web-ecs-fargate-cloudformation
    description: Consider serverless Fargate capacity for less management overhead.
  - key: tool
    value: terraform
    id: ecs-blueprint-terraform
    description: Instead of CloudFormation consider deploying with Terraform by HashiCorp
  - key: tool
    value: cdk
    id: advanced-public-facing-service-cdk
    description: If you don't like writing and managing CloudFormation YAML by hand, try out
                 AWS Cloud Development Kit
---

#### About

This is a simple public facing web service, hosted on EC2 instances, and fronted by an Application Load Balancer that provides ingress from the internet. This pattern is well suited for:

- A static HTML website, perhaps hosted by an NGINX or Apache webserver container
- A dynamically generated web app, perhaps served by a Node.js process
- An API service intended for the public to access
- An edge service which needs to make many outbound requests, or high bandwidth connections, to other services or API's on the public internet

::: warning
This pattern is not well suited for:

- A private internal API service
- An application that has very strict networking security requirements

For the above use cases instead consider using the [AWS VPC version of this pattern, designed for private API services that only have private IP addresses](public-facing-api-ecs-ec2-cloudformation).
:::

#### Architecture

The following diagram shows the architecture of this deployment:

!!! @/pattern/public-facing-web-ecs-ec2-cloudformation/diagram.svg

1. Public internet ingress is via a VPC internet gateway that sends traffic to an Application Load Balancer. The Application Load Balancer is a fully AWS managed ingress point that is hosted using multiple nodes across all availability zones.
2. The Application Load Balancer has been configured by Amazon ECS so that it knows what ports on which EC2 instances to send traffic to in order to reach an instance of your application.
3. EC2 instances are configured to allow inbound traffic from the load balancer on all ports.
4. Amazon ECS has launched application containers onto the EC2 instances, and configured port mappings that allow the Application Load Balancer to reach each container on a dedicated host port.
5. Incoming internet traffic is evenly distributed by the Application Load Balancer across all available application ports across all EC2 instances.

An important characteristic of this pattern is that it makes use of `bridge` networking mode:

!!! @/pattern/public-facing-web-ecs-ec2-cloudformation/bridge-networking.svg

Containers are launched onto EC2 instances in `bridge` networking mode, which allows port mappings to be configured with a randomly assigned port from the ephemeral port range (default 32768 to 61000).

Amazon ECS keeps track of each container port mapping and configures the Application Load Balancer (ALB) with the port number of each target container that it may wish to send traffic to.

A security group on the EC2 instance opens up the EC2 instance to receiving inbound traffic on all ports, only from the security group of the ALB itself. This maintains the security of the container workloads by rejecting all traffic that does not originate from the load balancer itself.

#### Dependencies

This pattern requires that you have an AWS account, and that you use AWS Serverless Application Model (SAM) CLI. If not already installed then please [install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for your system.

#### Choose a VPC

This pattern can be deployed on top of either of the following VPC patterns:

- [Low cost VPC](/low-cost-vpc-amazon-ecs-cluster)
- [Large sized VPC](/large-vpc-for-amazon-ecs-cluster)

Which one you choose depends on your goals for this deployment. You can choose the low cost VPC to start with and upgrade to the large sized VPC later on if you have additional private services, or private database servers you wish to deploy in the VPC.

Download the `vpc.yml` file from your chosen pattern, but do not deploy it yet. Deployment will be done later in the process.

#### Define the cluster

The following CloudFormation defines an ECS cluster that has a capacity provider that launches EC2 instances on demand as you request for ECS to deploy containers. The instances will be launched in the public subnet.

<<< @/pattern/public-facing-web-ecs-ec2-cloudformation/files/cluster.yml

#### Define the service

The following CloudFormation defines a service and it's load balancer that will provide ingress to the service.

<<< @/pattern/public-facing-web-ecs-ec2-cloudformation/files/service.yml

#### Deploy it all

You should have the following three files:

- `vpc.yml` - Template for the base VPC that you wish to host resources in
- `cluster.yml` - Template for the ECS cluster and its capacity provider
- `service.yml` - Template for the web service that will be deployed on the cluster

Use the following parent stack to deploy all three stacks:

<<< @/pattern/public-facing-web-ecs-ec2-cloudformation/files/parent.yml

Use the following command to deploy all three stacks:

```shell
sam deploy \
  --template-file parent.yml \
  --stack-name web-service-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Test it out

Open the Amazon ECS cluster in the web console and verify that the service has been created with a desired count of two. You will observe the service create pending tasks that are waiting in PROVISIONING state. The ECS capacity provider will launch EC2 instances to fulfill the EC2 capacity demand and ECS will place the provisioning tasks onto those EC2 instances. Last but not least you will the Application Load Balancer get each task registered into it's target group.

On the "Health & Metrics" tab of the service details page you can click on the load balancer name to navigate to the load balancer in the EC2 console. This will give you the load balancer's public facing CNAME that you can copy and paste into your browser to verify that the sample NGINX webserver is up and running.

#### Tear it down

```shell
sam delete --stack-name web-service-environment
```

#### See Also

- [Public facing web service on AWS Fargate](/public-facing-web-ecs-fargate-cloudformation). The serverless equivalent of this pattern. It sets up a public facing, publically networked service hosted in AWS Fargate instead of on EC2 instances
- This stack does not deploy an automatic scaling for the containerized service. If you expect varying amounts of traffic you should [add automatic scaling to your service](/scale-ecs-service-cloudformation).