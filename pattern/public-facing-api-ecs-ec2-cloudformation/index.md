---
title: Public facing API hosted on EC2 instances
description: >-
  A containerized public facing API in a private network, managed by EC2, hosted on EC2 capacity.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: app
    value: api
  - key: capacity
    value: ec2
  - key: type
    value: pattern
authors:
  - peckn
date: May 16, 2023
alternatives:
  - key: app
    value: website
    id: public-facing-web-ecs-ec2-cloudformation
    description: Want to deploy a more public facing website instead?
  - key: capacity
    value: fargate
    id: public-facing-api-ecs-fargate-cloudformation
    description: Instead of EC2, consider using serverless Fargate capacity for less management overhead.
  - key: tool
    value: terraform
    id: ecs-blueprint-terraform
    description: Instead of CloudFormation consider deploying with Terraform by HashiCorp
---

#### About

This pattern demonstrates how to host an API service, or other critical internal service which lives in a private portion of your VPC network, yet can still receive traffic from the public internet. The service containers will not have a public IP address, and they will be protected by a custom security group for the service. However, you can still expose them to the public via a load balancer ingress in the public portion of your VPC network.

This pattern is suitable for many use cases:

- An API which is public facing but needs an extra layer of security hardening by not even having a public IP address that an attacker could send a request directly to.
- A web facing service which needs to be massively horizontally scalable while not being constrained by number of public IP addresses available.
- A web or API service which initiates outbound connections to another service on the internet, wherein you want those outbound connections to all originate from a specific and limited set of IP addresses that can be whitelisted by recipients of the traffic.

::: warning
This pattern is not suited for:

- Services that have high throughput/bandwidth to other services on the internet. Because this pattern use a NAT gateway to provide internet to resources in a private subnet you will be sending a lot of bandwidth through the NAT gateway and paying extra per GB of outbound traffic. Instead consider using the [public facing version of this pattern, which hosts public facing tasks on EC2 instances in the public subnet](public-facing-web-ecs-ec2-cloudformation).
:::

At a high level the architecture looks like this:

!!! @/pattern/public-facing-api-ecs-ec2-cloudformation/diagram.svg

Everything is deployed in an Amazon Virtual Private Cloud (VPC) which has two subnets:

- __Public subnet__: Has an attached internet gateway to allow resources launched in that subnet to accept connections from the internet, and initiate connections to the internet. Resources in this subnet have public IP addresses.
- __Private subnet__: For internal resources. EC2 Instances and ECS tasks are hosted and networked in this subnet, with no direct internet access. They only have private IP addresses that are internal to the VPC, not directly accessible by the public.

This pattern uses AWS VPC networking mode, which gives each of your tasks it's own unique Elastic Network Interface (ENI). Each ENI has it's own private IP address in the private subnet. This means that every container can bind directly to port 80 on the ENI, and can then be reached at it's own dedicated private IP address, on port 80. There is no need for dynamic port mapping anymore.

Additionally each task can also have its own attached security group. This allows you to create fine grained security group rules that limit which tasks can communicate with each other, even when those tasks are hosted on the same underlying EC2 host.

The following diagram shows how EC2 instances and ECS tasks get internet requests and outgoing internet access in AWS VPC networking mode:

!!! @/pattern/public-facing-api-ecs-ec2-cloudformation/networking.svg

The public facing subnet hosts a couple resources:

- __Public facing load balancer__: Accepts inbound connections on specific ports, and forwards acceptable traffic to task ENI's inside the private subnet.
- __NAT gateway__: A networking bridge to allow resources (both EC2 and ECS) inside the private subnet to initiate outbound communications to the internet, while not allowing inbound connections.

The EC2 instances hosting the containers do not have a public IP address, only a private IP address internal to the VPC. As a result if your application initiates an outbound connection the connection (such as to download a container image) then the request gets routed through the NAT gateway in the public subnet.

Additionally, there is no way for any traffic to directly reach your container because it has no public IP address. All inbound connections must go to the load balancer which will pick and choose whether to pass the inbound connection on to the protected container inside the private VPC subnet. If the container task wishs to communciate to the internet it's request will also be routed through the NAT gateway.

::: tip
ECS tasks can be assigned an ENI in a different subnet from the EC2 instances that host those tasks. For simplicity this pattern uses shared private subnets which are used for both the EC2 instance network interfaces and the ECS task network interfaces. For organizing your deployments you may wish to split task ENI's our from EC2 ENI's.
:::

#### Dependencies

This pattern requires that you have an AWS account, and that you use AWS Serverless Application Model (SAM) CLI. If not already installed then please [install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for your system.

#### Define the VPC

To deploy this pattern you will use the [base pattern that defines a large VPC for an Amazon ECS cluster](/large-vpc-for-amazon-ecs-cluster). This will deploy the public and private subnets as well as the NAT gateway that provides internet access to the private subnets. Download the `vpc.yml` file from that pattern, but don't deploy it yet. You will deploy the VPC later as part of this pattern.

#### Define the cluster

The following CloudFormation defines an ECS cluster that has a capacity provider that launches EC2 instances on demand as you request for ECS to deploy containers. The instances will be launched in the private subnet.

<<< @/pattern/public-facing-api-ecs-ec2-cloudformation/files/cluster.yml

Parameters to note are:

- `DesiredCapacity` - How many EC2 instances to launch
- `MaxSize` - The maximum number of EC2 instance to scale up to
- `ECSAMI` - This will be automatically set to the latest ECS optimized Amazon Linux machine image, but you can override it if you want
- `InstanceType` - The EC2 instance size to launch
- `SubnetIds` - This is where we will pass in the list of private subnets from the VPC template

#### Define the ECS service

Next we need to define an ECS service which is configured to use AWS VPC networking mode, and launch itself in the ECS cluster, while making use of the capacity provider to request EC2 capacity for itself:

<<< @/pattern/public-facing-api-ecs-ec2-cloudformation/files/service.yml

Parameters to note are:

- `ServiceName` - What you want to name your deployed service
- `ImageUrl` - The URI of a Docker image to launch. You can leave it as the default `nginx` image if don't yet have a container image to deploy
- `ContainerPort` - What port number the application inside the docker container is binding to
- `ContainerCpu` - How much CPU to give the container. 1024 CPU is one vCPU core
- `ContainerMemory` - How many MB's of memory to give the container
- `DesiredCount` - How many copies of the container to launch. Traffic will be evenly distributed across all copies.

As before you can also choose to use the AWS CloudFormation web console to launch this CloudFormation stack.

#### Deploy it all

Download the following parent stack. It will be used to glue all three stacks together into one deployment and pass values from one stack to the next:

<<< @/pattern/public-facing-api-ecs-ec2-cloudformation/files/parent.yml

Use the following AWS SAM CLI command to the parent stack and its child stacks:

```shell
sam deploy \
  --template-file parent.yml \
  --stack-name api-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Test it out

Open the Amazon ECS cluster in the web console and verify that the service has been created with a desired count of two. You will observe the service create pending tasks that are waiting in PROVISIONING state. The ECS capacity provider will launch EC2 instances to fulfill the EC2 capacity demand and ECS will place the provisioning tasks onto those EC2 instances. Last but not least you will the Application Load Balancer get each task registered into it's target group.

On the "Health & Metrics" tab of the service details page you can click on the load balancer name to navigate to the load balancer in the EC2 console. This will give you the load balancer's public facing CNAME that you can copy and paste into your browser to verify that the sample NGINX webserver is up and running.

#### Tear it down

You can tear down the entire stack with the following command:

```shell
sam delete --stack-name api-environment
```

#### Next Steps

- This stack does not deploy an automatic scaling for the containerized service. You should [add scaling to your service](/scale-ecs-service-cloudformation).
- Alternatively, you may prefer to not manage EC2 capacity at all. In that case consider using the [AWS Fargate version of this stack](/public-facing-api-ecs-fargate-cloudformation), which launches your container on serverless capacity.
