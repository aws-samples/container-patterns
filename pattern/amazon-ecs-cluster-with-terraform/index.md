---
title: Create an Amazon ECS Cluster with Terraform
description: >-
  Example Terraform to configure an AWS VPC, Elastic Container Service cluster, and
  supporting IAM roles
filterDimensions:
  - key: tool
    value: terraform
  - key: type
    value: pattern
authors:
  - arvsoni
date: May 18, 2023
repositoryLink: https://github.com/aws-ia/ecs-blueprints/tree/main/terraform/fargate-examples/core-infra
license:
  label: Apache 2.0
  link: https://github.com/aws-ia/ecs-blueprints/blob/main/LICENSE
---

#### About

[Terraform by HashiCorp](https://www.terraform.io/) is an infrastructure automation tool that can be used to provision and manage resources on AWS.

This pattern will demonstrate how to use the community `terraform-aws-modules` to deploy a VPC, and an ECS cluster. This will form the core infrastructure that can be used to deploy containerized services using Amazon ECS.

#### Dependencies

- Terraform (tested version v1.2.5 on darwin_amd64)
- Git (tested version 2.27.0)
- AWS CLI
- AWS test account with administrator role access
- [Configure AWS credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)

#### Architecture

This pattern will create the following AWS resources:

!!! @/pattern/amazon-ecs-cluster-with-terraform/diagram.svg

- Networking
  - VPC
    - 3 public subnets, 1 per AZ. If a region has less than 3 AZs it will create same number of public subnets as AZs.
    - 3 private subnets, 1 per AZ. If a region has less than 3 AZs it will create same number of private subnets as AZs.
    - 1 NAT Gateway (see warning below)
    - 1 Internet Gateway
    - Associated Route Tables
- 1 ECS Cluster with AWS CloudWatch Container Insights enabled.
- Task execution IAM role
- CloudWatch log groups
- CloudMap service discovery namespace default

::: warning
This pattern deploys a single shared NAT gateway in a single AZ. This saves cost in most cases but has the following downsides:

- The shared NAT gateway is a single point of failure if that AZ has an outage.
- In cases where you make heavy use of the NAT gateway because your application makes many outbound connections to the public internet, you may acrue additional cross AZ charges because resources in the other two AZ's are generating cross AZ traffic to a NAT gateway hosted in a different AZ.

In these cases consider adding a NAT gateway for each AZ. This will be a higher baseline cost but safer and will limit cross AZ traffic.
:::

#### Define the infrastructure

Download the following three files that define the core infrastructure:

<tabs>
<tab label="main.tf">

<!-- https://raw.githubusercontent.com/aws-ia/ecs-blueprints/36fb85bd4ffabf057c25a193fcf4c8d1ebd2c60d/terraform/fargate-examples/core-infra/main.tf -->
<<< files/main.tf

</tab>
<tab label="outputs.tf">

<<< files/outputs.tf

</tab>
<tab label="versions.tf">

<<< files/versions.tf

</tab>
</tabs>

You should have three files:

- `main.tf` - Main file that defines the core infrastructure to create
- `outputs.tf` - A list of output variables that will be passed to other Terraform modules you may wish to deploy
- `versions.tf` - A definition of the underlying requirements for this module.

::: tip
For a production environment it is highly recommended to create a `backend.tf` file that configures [S3 for state storage and DynamoBD for resource locking](https://developer.hashicorp.com/terraform/language/settings/backends/s3), or [Terraform Cloud for state management](https://developer.hashicorp.com/terraform/tutorials/cloud/cloud-migrate).

The default setup will only track Terraform state locally, and if you lose the state files Terraform will no longer be able to managed the created infrastructure, and you will have to manually track down and delete every resource that Terraform had created.
:::

#### Deploy the Terraform definition

First we need to download all the dependency modules (defined in `versions.tf`) that this pattern relies on:

```shell
terraform init
```

Next we can review the deployment plan, and then deploy it:

```shell
terraform plan
terraform apply --auto-approve
```

When the Terraform apply is complete you will see a list of
outputs similar to this:

```txt
Outputs:

ecs_cluster_id = "arn:aws:ecs:us-west-2:209640446841:cluster/files"
ecs_cluster_name = "files"
ecs_task_execution_role_arn = "arn:aws:iam::209640446841:role/files-20230518161249649200000002"
ecs_task_execution_role_name = "files-20230518161249649200000002"
private_subnets = [
  "subnet-0dcca4267e8b9894c",
  "subnet-047d27c28c7891a90",
  "subnet-0ab5512d135ce43cb",
]
private_subnets_cidr_blocks = tolist([
  "10.0.10.0/24",
  "10.0.11.0/24",
  "10.0.12.0/24",
])
public_subnets = [
  "subnet-0d976733da1d6dd08",
  "subnet-013db9ca920c24554",
  "subnet-0b9e7e3e45bb6a743",
]
service_discovery_namespaces = {
  "arn" = "arn:aws:servicediscovery:us-west-2:209640446841:namespace/ns-aliplookapjwmjgo"
  "description" = "Service discovery namespace.clustername.local"
  "hosted_zone" = "Z0609025HGBC4TU4U285"
  "id" = "ns-aliplookapjwmjgo"
  "name" = "default.files.local"
  "tags" = tomap({
    "Blueprint" = "files"
    "GithubRepo" = "github.com/aws-ia/ecs-blueprints"
  })
  "tags_all" = tomap({
    "Blueprint" = "files"
    "GithubRepo" = "github.com/aws-ia/ecs-blueprints"
  })
  "vpc" = "vpc-0c7ae3da22686c9cd"
}
vpc_id = "vpc-0c7ae3da22686c9cd"
```

#### Tear it Down

You can use the following command to teardown the infrastructure that was created.

```shell
terraform destroy
```

#### See Also

- Check out the [ECS Blueprints repository on Github that this pattern is sourced from](https://github.com/aws-ia/ecs-blueprints/tree/main/terraform/fargate-examples/core-infra)
- Add a [load balanced web service on top of this cluster](/load-balanced-public-service-with-terraform)
- Prefer CloudFormation? Check out:
  - [Low cost VPC for Amazon ECS](/low-cost-vpc-amazon-ecs-cluster)
  - [Large sized VPC for Amazon ECS](/large-vpc-for-amazon-ecs-cluster)