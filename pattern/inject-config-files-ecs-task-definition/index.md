---
title: Inject configuration files in an Elastic Container Service (ECS) task definition
description: >-
  How to add custom config files to your container at runtime, by using a command
  override in the ECS task definition
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
authors:
  - peckn
date: Dec 1, 2022
---

The following snippet shows how to do runtime file generation and injection in an ECS task definition.

It launches an NGINX reverse proxy server, directly from Amazon Elastic Container Registry Public. This default container does not do anything except show a simple
"welcome to NGINX" message. However, we can use a command to generate the custom NGINX configuration at runtime, prior to launching the container. Because this command runs inside the container as it launches we can even use custom environment variables
from the task definition.

::: tip

You will find that the richer feature set of YAML makes the embedded
config file in the CloudFormation YAML much easier to read than
the single line string inside of the raw JSON task definition.

If you intend to create more advanced task definitions it is
highly recommended to use AWS CloudFormation. If you do not wish
to use CloudFormation
then consider still writing your task definitions in YAML, and [use `yq` to convert the YAML
to JSON](https://mikefarah.gitbook.io/yq/usage/convert#encode-json-simple) for the ECS API.

:::

<tabs>

<tab label='AWS CloudFormation'>

<<< files/task-definition.yml

Deploy the CloudFormation template above by using the AWS CloudFormation web console.
Alternatively you can deploy from the command line with:

```sh
aws cloudformation deploy \
   --stack-name sample-task-definition \
   --template-file task-definition.yml
```

</tab>

<tab label='Raw JSON'>

<<< files/task-definition.json

In the ECS console, click "Create new task definition with JSON" and paste the
JSON into the task definition editor.

Alternatively you can download the JSON file and pass it as a parameter to the AWS CLI:

```sh
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json
```

</tab>

</tabs>

### See Also

- [Examples of custom entrypoints and command overrides](/ecs-entrypoint-command-task-definition)
