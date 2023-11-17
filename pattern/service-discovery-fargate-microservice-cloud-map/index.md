---
title: Service Discovery for AWS Fargate tasks with AWS Cloud Map
description: >-
  How to setup service discovery in ECS, so that microservices can communicate with each other.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: tool
    value: aws-sam-cli
  - key: feature
    value: cloudmap
  - key: type
    value: pattern
  - key: capacity
    value: fargate
authors:
  - peckn
date: Oct 10, 2023
alternatives:
  - key: feature
    value: service-connect
    id: ecs-service-connect-aws-copilot
    description: ECS Service Connect is a similar peer to peer networking option, that operates more like a service mesh. With Service Connect you don't need to implement your own client side load balancing. Round robin request routing, and retries are offloaded to an Envoy Proxy sidecar that is managed by Amazon ECS.
---

#### About

Service discovery is a technique for getting traffic from one container to another using a direct peer to peer connection, instead of routing traffic through an intermediary like a load balancer. Service discovery is suitable for a variety of use cases:

- Privately networked, internal services that will not be used from the public internet
- Low latency communication between services.
- Long lived bidirectional connections, such as gRPC.
- Low traffic, low cost deployments where you do not wish to pay the hourly fee for a persistent load balancer.

Service discovery for AWS Fargate tasks is powered by [AWS Cloud Map](https://aws.amazon.com/cloud-map/). Amazon Elastic Container Service integrates with AWS Cloud Map to configure and sync a list of all your containers. You can then use Cloud Map DNS or API calls to look up the IP address of another task and open a direct connection to it.

#### Architecture

In this reference you will deploy the following architecture:

!!! @/pattern/service-discovery-fargate-microservice-cloud-map/diagram.svg

Two services will be deployed as AWS Fargate tasks:

- A front facing `hello` service
- A backend `name` service

Inbound traffic from the public internet will arrive at the `hello` service via an Application Load Balancer.

The `hello` service needs to fetch a name from the `name` service. In order to locate instances of the `name` service
task, it will use DNS based service discovery to get a list of tasks to send traffic to. The `hello` service
will do client side load balancing to distribute it's requests across available instances of the `name` service's task.

Network traffic between the `hello` service and the `name` service is direct peer to peer traffic.

#### Dependencies

This pattern requires that you have an AWS account, and that you use AWS Serverless Application Model (SAM) CLI. If not already installed then please [install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for your system.

#### Define the networking

For this architecture we are going to use private networking for the backend services, so grab the `vpc.yml` file from ["Large VPC for Amazon ECS Cluster"](/large-vpc-for-amazon-ecs-cluster). Do not deploy this CloudFormation yet. We will deploy it later on.

#### Define the cluster

The following template defines an ECS cluster and a Cloud Map namespace that will be used to store information about the tasks in the cluster:

<<< files/cluster.yml

Some things to note in this template:

- An `AWS::ServiceDiscovery::PrivateDnsNamespace` ensures that Cloud Map can be accessed from inside of the VPC, using a TLD (Top Level Domain) of `internal`. This will allow us to lookup other services in the VPC using a DNS address like `http://name.internal`

#### Define the `name` service

Because the `hello` service depends on the `name` service, it makes sense to define the `name` service first. This
service will be deploying a public sample image located at `public.ecr.aws/ecs-sample-image/name-server`.

<<< files/name.yml

Note the following things from the template above:

- A `AWS::ServiceDiscovery::Service` defines the DNS record type (`A`) and the TTL (Time to Live)
- The `AWS::ECS::Service` is configured to attach to the `AWS::ServiceDiscovery::Service` so that it can keep it in sync with a list of the tasks.
- The `AWS::ECS::TaskDefinition` is configured in `awsvpc` networking mode. This gives each task it's own unique IP address, which can be plugged into the service discovery DNS.
- The `name` service listens for traffic on port 3000.

#### Define the `hello` service

Now we need to define the `hello` service. It will be based on the public sample image `public.ecr.aws/ecs-sample-image/hello-server:node`:

<<< files/hello.yml

Some things to note in this template:

- The `AWS::ECS::TaskDefinition` is configured to have an environment variable `NAME_SERVER` with the value `http://name.internal:3000/`. This service discovery endpoint is based on the TLD of the Cloud Map namespace (`internal`), the name of the service (`name`), and the port that the service binds to (`3000`).
- The `hello` service must create an `AWS::EC2::SecurityGroupIngress` on the security group of the `name` service, allowing inbound traffic from the security group of the `hello` service. Without this ingress rule any direct, inbound, peer to peer connections would be denied by the `name` security group.

#### Look at the code

Properly using DNS based service discovery requires some client side implementation.
Let's look at the source for the `hello` service.

<<< files/hello-node/index.js

Things to note:

- Each time a request is being made to the downstream `name` service, the sevice discovery DNS name must be resolved. Doing a full DNS lookup each time would be expensive for the underlying system, and impact performance, so the process caches the DNS lookup results for a brief time.
- The service discovery DNS record returns a list of IP addresses. Note that if the DNS address was used by plugging it directly into a `fetch()` the runtime would just naively send all requests to the first IP address
  in the list. In order to evenly distribute traffic across all the downstream targets, the code must implement
  client side load balancing.
- The entire network request is wrapped in a retry. This is because there is no guarantee that downstream tasks are
  actually still there. Because of DNS propagation delay it is possible for a downstream `name` task to have crashed or been stopped by a scale-in. If the task is no longer be there when the `hello` service tries to reach it, there will be a networking failure. The DNS record is eventually consistent
  with reality, so in the meantime it is important for the `hello` service to detect networking issues and retry against
  a different backend `name` task if necessary. Note that this simple demo application does not actually remove the
  failed backend IP address from its locally cached list. A potential improvement would be for the process to temporarily
  avoid attempting to send any more traffic to an IP address that has had a recent networking failure.

#### Deploy it all

You should have the following three files:

- `vpc.yml` - Template for the base VPC that you wish to host resources in
- `cluster.yml` - Template for the ECS cluster and its capacity provider
- `hello.yml` - Template for the `hello` service that will be deployed on the cluster
- `name.yml` - Template for the `name` service that will be deployed on the cluster

Use the following parent stack to deploy all three stacks:

<<< files/parent.yml

Use the following command to deploy all three stacks:

```shell
sam deploy \
  --template-file parent.yml \
  --stack-name service-discovery-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Test it Out

Once the stack deploys, you can use the Amazon ECS console to locate the address of the public facing
load balancer that provides ingress to the `hello` service from the public internet. Navigate to the ECS cluster,
view the details of the `hello` service, and click the link under Networking -> DNS Names -> Open Address.

You should see output similar to this:

```txt
Hello (from ip-10-0-138-3.us-east-2.compute.internal) Sophia (from ip-10-0-191-125.us-east-2.compute.internal)
```

If you refresh multiple times you should see different IP address and DNS names showing up,
demonstrating that both the front facing load balancing, as well as the backend service discovery load
balancing are working to evenly distribute traffic.

Try scaling the `name` service up and down to test out how service discovery reacts to changes in the state of the cluster

#### Tear it Down

You can tear down the entire stack with the following command:

```shell
sam delete --stack-name service-discovery-environment
```
