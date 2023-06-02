---
title: Use Pulumi Crosswalk to setup an ECS Service in a VPC
description: >-
  How to use Pulumi infrastructure as code SDK to deploy a load balanced ECS service in a VPC
filterDimensions:
  - key: tool
    value: pulumi
  - key: type
    value: pattern
authors:
  - peckn
date: April 4 2023
license:
  label: Apache 2.0
  link: https://github.com/pulumi/examples/blob/master/LICENSE
---

Pulumi is an infrastructure as code framework for software engineers. Instead of writing YAML to define your infrastructure you can use higher level SDK commands, in a familiar programming language, and Pulumi will create the necessary resources for you automatically.

<tabs>
<tab label="TypeScript">

<<< @/pattern/pulumi-ecs-service-in-vpc/files/service-in-vpc.ts

</tab>

<tab label="Python">

<<< @/pattern/pulumi-ecs-service-in-vpc/files/service-in-vpc.py

</tab>

<tab label="Go">

<<< @/pattern/pulumi-ecs-service-in-vpc/files/service-in-vpc.go

</tab>

<tab label="Java">

<<< @/pattern/pulumi-ecs-service-in-vpc/files/service-in-vpc.java

</tab>

<tab label="YAML">

<<< @/pattern/pulumi-ecs-service-in-vpc/files/service-in-vpc.yaml

</tab>

<tab label="C#">

<<< @/pattern/pulumi-ecs-service-in-vpc/files/service-in-vpc.cs

</tab>

</tabs>

### Setup

1. Ensure that you have [Pulumi setup on your system and configured to connect to AWS](https://www.pulumi.com/docs/get-started/aws/begin/).
2. [Start a new Pulumi project](https://www.pulumi.com/docs/get-started/aws/create-project/)
3. Copy the code above into your Pulumi project

### Usage

Show a preview of resources to be deployed:

```sh
pulumi preview
```

Deploy the resources to your AWS account:

```sh
pulumi up
```

Print out the URL of the deployed ECS service's load balancer:

```sh
pulumi stack output url
```

Tear down the stack and all of its resources:

```sh
pulumi destroy
```