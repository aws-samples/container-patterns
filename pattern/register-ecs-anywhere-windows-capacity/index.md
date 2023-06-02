---
title: Register ECS Anywhere Windows Capacity
description: >-
  Command line scripts for registering external Windows instances with an ECS Cluster
filterDimensions:
  - key: tool
    value: aws-cli
  - key: type
    value: script
  - key: capacity
    value: anywhere
authors:
  - peckn
date: March 15, 2023
---

::: tip
The easiest way to register external capacity with an ECS cluster is to use the Elastic Container Service web console, as it will automatically create an activation key and code, and prepopulate the commands with the right activation key for you.
:::

If you need to automate the ECS Anywhere registration process for Windows you can use the following command as a template:

```sh
REGION="desired AWS region here"
ACTIVATION_ID="SSM managed instance activation id here"
ACTIVATION_CODE="SSM manage instance activation code here"
CLUSTER="ecs cluster name here"

Invoke-RestMethod -URI "https://amazon-ecs-agent.s3.amazonaws.com/ecs-anywhere-install.ps1" -OutFile "ecs-anywhere-install.ps1"; .\ecs-anywhere-install.ps1 -Region $REGION -Cluster $CLUSTER -ActivationID $ACTIVATION_ID -ActivationCode $ACTIVATION_CODE
```

The referenced install script which is downloaded from S3 is also embedded here for your review. This script handles the installation of Docker, the AWS Systems Manager agent, and the Elastic Container Service Agent:

<<< @/pattern/register-ecs-anywhere-windows-capacity/files/ecs-anywhere-install.ps1

#### See also

- [Install script for Linux capacity](/register-ecs-anywhere-linux-capacity)
- [Official documentation about ECS Anywhere](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-anywhere.html)