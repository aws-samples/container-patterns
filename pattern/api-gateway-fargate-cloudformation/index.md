---
title: Serverless API Gateway Ingress for AWS Fargate, in CloudFormation
description: >-
  CloudFormation templates to setup an AWS Fargate task with serverless
  API Gateway ingress
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: capacity
    value: fargate
authors:
  - peckn
date: Oct 23, 2023
alternatives:
  - key: app
    value: website
    id: public-facing-web-ecs-fargate-cloudformation
    description: API Gateway has a low baseline cost, but a higher per request cost. This pattern shows how to deploy an Application Load Balancer (ALB) as your web ingress. The ALB will have a higher baseline hourly charge, but lower per request costs as traffic increases.
---

#### About

[AWS Fargate](https://aws.amazon.com/fargate/) provides serverless capacity to run your container images. [Amazon Elastic Container Service](https://aws.amazon.com/ecs/) launches and orchestrates containers that run in Fargate.

[AWS Cloud Map](https://aws.amazon.com/cloud-map/) is a cloud resource discovery service. Cloud Map provides a way to lookup a list of your dynamically changing resources, such as containers.

[Amazon API Gateway](https://aws.amazon.com/api-gateway/) is a serverless ingress for your web traffic. It has no minimum fee or hourly charge. Instead you pay for the API calls you receive and the amount of data transferred out.

In this pattern you will deploy API Gateway as an ingress in front of an AWS Fargate hosted container image. The API Gateway will discover instances of the running container using AWS Cloud Map.

#### Architecture

The following diagram shows the architecture that will be deployed:

!!! @/pattern/api-gateway-fargate-cloudformation/diagram.svg

1. An API Gateway receives inbound traffic from the public internet.
2. The API Gateway uses AWS Cloud Map to look up the private IP addresses of tasks that are part of an AWS Fargate deployed service.
3. API Gateway uses a VPC Link to open connections to the private IP addresses inside of the VPC.
4. The AWS Fargate hosted tasks receive inbound traffic over a connection opened from the API Gateway VPC Link.
5. The API Gateway proxies the container's response back to the client on the public internet.

:::tip
API Gateway pricing has no minimum fees or upfront commitments. Instead you pay per API call you receive, and for the amount of outgoing data. This makes API Gateway less expensive than Application Load Balancer for many low traffic applications.

On the other hand if your server side application receives a very large number of small API calls from a large number of connected clients, then you may find the [Application Load Balancer pattern for AWS Fargate](public-facing-web-ecs-fargate-cloudformation) to be more cost efficient. Application Load Balancer has a constant hourly charge that gives it a higher baseline cost, but the ALB can handle a large number of requests at a lower per request added cost.
:::

#### Dependencies

This pattern uses AWS SAM CLI for deploying CloudFormation stacks on your AWS account.
You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### Define the network

This pattern can be deployed on top of either of the following VPC patterns:

- [Low cost VPC](/low-cost-vpc-amazon-ecs-cluster)
- [Large sized VPC](/large-vpc-for-amazon-ecs-cluster)

Which one you choose depends on your goals for this deployment. You can choose the low cost VPC to start with and upgrade to the large sized VPC later on if you have additional private services, or private database servers you wish to deploy in the VPC.

Download the `vpc.yml` file from your chosen pattern, but do not deploy it yet. Deployment will be done later in the process.

#### Define the cluster

The following AWS CloudFormation template creates a simple Amazon ECS cluster for usage with AWS Fargate. It also creates an AWS Cloud Map namespace for keeping track of tasks in the cluster.

<<< @/pattern/api-gateway-fargate-cloudformation/files/cluster.yml

Note the `AWS::ServiceDiscovery::PrivateDnsNamespace`. This is an AWS Cloud Map powered service discovery namespace that will be used to keep track of the tasks running in AWS Fargate.

#### Define the service

The following AWS CloudFormation template defines a basic NGINX task that runs in AWS Fargate, orchestrated by Amazon ECS. Amazon ECS also registers the running tasks into AWS Cloud Map for service discovery.

<<< @/pattern/api-gateway-fargate-cloudformation/files/service.yml

Important things to note:

- The `AWS::ServiceDiscovery::Service` must use a [DNS record type of SRV](https://en.wikipedia.org/wiki/SRV_record). SRV records keep track of both the IP address as well as the port. This is required for API Gateway to be able to locate the task and send it traffic on the right port.

#### Define the API Gateway

The following AWS CloudFormation template defines an API Gateway that can access a VPC. It uses AWS Cloud Map to locate targets to send traffic to.

<<< @/pattern/api-gateway-fargate-cloudformation/files/api-gateway.yml

Things to look for in this template:

- `AWS::ApiGatewayV2::VpcLink` and `AWS::ApiGatewayV2::Integration` - This is how the API Gateway is able to communicate privately to tasks inside of the VPC
- `ServiceIngressFromApiGateway` - The containerized service's security group must accept inbound traffic from the security group used by the API Gateway's VPC link.
- `AWS::ApiGatewayV2::Stage` - Note the `AccessLogSettings` which can be used to store access logs into an AWS CloudWatch log group.

#### Deploy it all

At this point you should have the following CloudFormation templates:

- `vpc.yml` - Defines the virtual private network that everything will be deployed inside of
- `cluster.yml` - Defines the Amazon ECS cluster and AWS Cloud Map namespace
- `service.yml` - Defines how to deploy the container image using Amazon ECS and AWS Fargate, and register it into AWS Cloud Map.
- `api-gateway.yml` - Defines the API Gateway and how it attaches to the VPC and sends traffic to the container service.

Use the following parent stack to deploy all four templates at once:

<<< @/pattern/api-gateway-fargate-cloudformation/files/parent.yml

You can use the following command to deploy this parent stack and it's child stacks:

```sh
sam deploy \
  --template-file parent.yml \
  --stack-name api-gateway-fargate \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Test it out

After you deploy the templates, you can locate the public facing URI of the API Gateway by visiting [the API Gateway console](https://console.aws.amazon.com/apigateway/main/apis). Or you can get the URI from the outputs of the CloudFormation stack using the following command:

```sh
sam list stack-outputs \
  --stack-name api-gateway-fargate
```

Load this URL up in your web browser and verify that you see a "Welcome to nginx!" page. You can now replace the NGINX container image with your own custom container image that listens for traffic on port 80.

#### Tear it down

You can tear down the entire stack with the following command:

```shell
sam delete --stack-name api-gateway-fargate
```