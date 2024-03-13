---
title: Dual-stack IPv6 networking for Amazon ECS and AWS Fargate
description: >-
  Start rolling out IPv6 for your Fargate hosted service, while retaining
  IPv4 support as well.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
  - peckn
date: March 6 20245
alternatives:
  - key: type
    value: pattern
    id: ecs-cluster-isolated-vpc-no-nat-gateway
    description: A completely isolated VPC network, with no access to the internet.
  - key: type
    value: pattern
    id: large-vpc-for-amazon-ecs-cluster
    description: A VPC that provides access to the internet via AWS managed NAT Gateway.
---

#### Terminology

[Amazon Elastic Container Service (Amazon ECS)](https://aws.amazon.com/ecs/) is a serverless orchestrator that manages container deployments on your behalf. As an orchestrator it not only launches application containers for you, but also configures various connectivity aspects, including networking, load balancer attachments, and other AWS integrations.

[IPv4](https://en.wikipedia.org/wiki/Internet_Protocol_version_4) is the most widely adopted Internet Protocol. It provides address space for up to 4,294,967,296 devices on the internet, however large portions of the address space are reserved and therefore not usable. As a result, there are not enough IP addresses available to give every device in the world it's own unique IPv4 address. This necessitates the use of more complex networking setups such as Network Address Translation (NAT) gateways that allow multiple devices to share a single public IPv4 address that is used for internet communications.

[IPv6](https://en.wikipedia.org/wiki/IPv6) is the most recent Internet Protocol, with approximately 3.4×10<sup>38</sup> available addresses. This protocol will enable greatly simplified internet networking. Unfortunately IPv6 rollout is still only partially completed. This means that not every internet user can actually use IPv6 yet.

A dual-stack deployment is a deployment in which your networked cloud resources have both IPv4 addresses and IPv6 addresses. This transitional networking approach allows you to make use of both IPv4 and IPv6 networking.

This pattern will demonstrate how to setup a dual-stack deployment using Amazon ECS, and deploy a sample application that verifies that you can use an IPv6 egress only gateway to make requests to AWS services that have dual-stack endpoints that support IPv6.

#### Why?

IPv6 rollout is an ongoing project. At this time many internet service providers do not yet support IPv6. Therefore your architecture must still support IPv4 for many of your own users. Additionally, at this time in order to use Amazon ECS and many other AWS services you will still need to make use of IPv4 for some resources. You can find a [list of AWS services that support IPv6](https://docs.aws.amazon.com/vpc/latest/userguide/aws-ipv6-support.html), in the official AWS documentation.

Despite limited support for IPv6 you will likely want to begin testing IPv6 support for the AWS services that do have IPv6 support. A dual-stack deployment allows you to have the best of both worlds: IPv4 and IPv6.

::: warning
If you are seeking an IPv6 only deployment for Amazon ECS, this is not possible at this time. At this time Amazon ECS still has dependencies on IPv4 only resources, and therefore has only partial support for IPv6. It is not yet possible to completely avoid IPv4 usage. Further updates will be made to this pattern as additional IPv6 support is released.
:::

#### Architecture

The following diagram depicts what will be created when you deploy this pattern:

!!! @/pattern/dual-stack-ipv6-networking-ecs-fargate/diagram.svg

* An ECS task is deployed into AWS Fargate capacity, in a VPC subnet that is dual-stack enabled. As a result the task and it's container are reachable via an IPv4 address as well as an IPv6 address.
* Ingress from the internet is via an Application Load Balancer that is configured for dual-stack mode. As a result both IPv4 and IPv6 clients can talk to the dual stack endpoint for the load balancer.
* Due to current Amazon ECS limitations, only the task's IPv4 address is registered into the ALB target group. Therefore, traffic from the ALB to the task is always over IPv4.
* Due to current Amazon ECS and AWS Fargate limitations, several supporting dependencies such as Amazon Elastic Container Registry, Amazon S3 (for container image layers), and Amazon ECS, are accessed over IPv4, via AWS PrivateLink endpoints.
* The application is able to use it's IPv6 support, to make request to the public internet and to dual-stack AWS services via an egress only gateway. As a verification, the application uses the Amazon EC2 dual-stack API endpoint, and the Amazon S3 dual-stack API endpoint.

#### Dependencies

This pattern requires the following local dependencies:

* [Docker](https://www.docker.com/) or similar OCI compatible image builder.
* [Amazon ECR Credential Helper](https://github.com/awslabs/amazon-ecr-credential-helper) - This credential helper makes it easier to automatically authenticate when building and pushing container images to Amazon ECR.
* AWS SAM CLI for deploying CloudFormation stacks on your AWS account. You should follow the appropriate [steps for installing SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html).

#### Define the Amazon VPC

Download the following `ipv6-vpc.yml` file which defines a dual-stack VPC with both IPv4 and IPv6 support:

<<< files/ipv6-vpc.yml

Things to note in this template:

- `AWS::EC2::VPCCidrBlock` - We request two blocks of Amazon provided IPv6 address space
- `AWS::EC2::Subnet` - VPC subnets are configured to use the IPv6 blocks, and to assign IPv6 addresses to network interfaces in the subnet.
- `AWS::EC2::InternetGateway` - The internet gateway provides both inbound and outbound access for IPv4 based internet communications
- `AWS::EC2::EgressOnlyInternetGateway` - The egress only gateway serves a similar role compared to a NAT Gateway in a traditional IPv4 deployment. It allows resources in a private VPC subnet to communicate to the internet over IPv6.
- `IPv6PublicRoute` - This route sends IPv6 traffic out through the egress only internet gateway.
- `IPv4PublicRoute` - This route allows resources that have a public IPv4 address to communicate with the internet via the internet gateway.
- `AWS::EC2::VPCEndpoint` - Because we intend to avoid using public IPv4 addresses as much as possible, these VPC endpoints grant workloads hosted in the VPC the ability to communicate with AWS services privately.

#### Define the ECS Cluster

Download the following `cluster.yml` file which defines the Amazon ECS cluster that will run container tasks.

<<< files/cluster.yml

#### Define the ECS Service

Download the following `service.yml` file which defines a container deployment in AWS Fargate, orchestrated by Amazon ECS:

<<< files/service.yml

A few things to note in this template:

- The `AWS::ECS::Service` has the setting `AssignPublicIp: DISABLED`. This disables the ability for the task to communicate directly via the internet gateway. All communications from this service will be over IPv6, or via an AWS PrivateLink endpoint.
- `PrivateLinkIngressFromService` - This security group ingress rule is what allows the deployed container service to make use of the PrivateLink endpoints.

#### Build and push the test image

In order to test dual-stack, this pattern provides a small test application that uses the AWS SDK to make API calls to two different dual-stack service endpoints: S3 and EC2.

<tabs>
<tab label="app/index.js">

<<< files/app/index.js

::: tip
The sample application toggles `useDualstackEndpoint: true` when defining the AWS service client. This is what enables you to use IPv6 AWS endpoints from inside of a dual-stack VPC.
:::

</tab>

<tab label="app/package.json">

<<< files/app/package.json

</tab>

<tab label="app/Dockerfile">

<<< files/app/Dockerfile{Dockerfile}

</tab>

</tabs>

Download all three files and place them into a folder named `app`. The folder structure should look like this:

- `app` - Folder containing the sample application
  * `app/index.js` - The sample application code
  * `app/package.json` - Defines dependencies for the sample application
  * `app/Dockerfile` - Defines how to build the sample application

Now build and push the sample application to a private Amazon ECR container registry using the following command:

```sh
REPO_URI=$(aws ecr create-repository --repository-name sample-app-repo --query 'repository.repositoryUri' --output text)
if [ -z "${REPO_URI}" ]; then
  REPO_URI=$(aws ecr describe-repositories --repository-names sample-app-repo --query 'repositories[0].repositoryUri' --output text)
fi
docker build -t ${REPO_URI}:ipv6-app ./app
docker push ${REPO_URI}:ipv6-app
```

#### Deploy everything

Now download the following `parent.yml` file that deploy the previous three templates:

<<< files/parent.yml

Your overall folder structure should look like:

- `parent.yml` - Top level index file that defines the overall application deployment
- `ipv6-vpc.yml` - Defines the dual-stack networking configuration
- `cluster.yml` - Standard boilerplate for an Amazon ECS cluster
- `service.yml` - The container deployment itself
- `app` - Folder that holds the sample application code
  * `app/index.js` - The sample application code
  * `app/package.json` - Defines dependencies for the sample application
  * `app/Dockerfile` - Defines how to build the sample application

Now you can use the following command to deploy the application:

```sh
sam deploy \
  --template-file parent.yml \
  --stack-name ipv6-environment \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ImageUri=${REPO_URI}:ipv6-app \
  --resolve-s3
```

#### Test it Out

First let's make sure that the load balancer has a dual-stack endpoint that supports both IPv4 and IPv6:

```sh
PUBLIC_URI=$(aws cloudformation describe-stacks --stack-name ipv6-environment --query "Stacks[0].Outputs[?OutputKey=='PublicURI'].OutputValue" --output text)

# Lookup the IPv4 address of the service
dig A $PUBLIC_URI

# Lookup the IPv6 address of the service
dig AAAA $PUBLIC_URI
```

Now test two different endpoints in the service. Both endpoints internally make use of IPv6 via the egress only gateway:

```sh
# Verify that the application is able to communiate to the S3 dual-stack endpoint
curl $PUBLIC_URI/list-buckets

# Verify that the application is able to communciate to the EC2 dual-stack endpoint
curl $PUBLIC_URI/list-ec2
```

#### Tear it Down

You can destroy your test deployment using the following commands:

```sh
# Delete the Amazon ECS deployment
sam delete --stack-name ipv6-environment --no-prompts

# Empty and delete the Amazon ECR container registry we created
aws ecr delete-repository --repository-name sample-app-repo --force
```
