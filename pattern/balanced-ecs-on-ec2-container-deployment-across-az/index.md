---
title: Evenly balance an ECS deployment across availability zones
description: >-
  How to use a capacity provider strategy to guarantee that containers are always evenly rebalanced across AZ's.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: capacity
    value: ec2
authors:
  - peckn
date: Jan 16, 2024
---

#### About



#### Deploy

```sh
# Get the VPC ID of the default VPC on the AWS account
DEFAULT_VPC_ID=$(aws ec2 describe-vpcs --filters Name=is-default,Values=true --query 'Vpcs[0].VpcId' --output text)

# Grab the list of subnet ID's from the default VPC, and glue it together into a comma separated list
DEFAULT_VPC_SUBNET_IDS=$(aws ec2 describe-subnets --filters Name=vpc-id,Values=$DEFAULT_VPC_ID --query "Subnets[*].[SubnetId]" --output text | paste -sd, -)

# Now deploy the ECS cluster to the default VPC and it's subnets
sam deploy \
  --template-file parent.yml \
  --stack-name capacity-provider-environment \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides VpcId=$DEFAULT_VPC_ID SubnetIds=$DEFAULT_VPC_SUBNET_IDS
```