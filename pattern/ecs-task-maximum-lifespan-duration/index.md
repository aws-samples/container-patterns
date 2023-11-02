---
title: Amazon ECS task with maximum lifespan
description: >-
  An Amazon ECS task that will run for a specified duration, then be automatically stopped.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: app
    value: batch
authors:
  - maishsk
date: May 11 2023
---

#### About

In some cases you may wish to limit how long a task can run for. This can be used to prevent a batch job from running too long, or to provide a maximum lifespan for an ephemeral game server or similar server that should boot clients after a period of time.

This pattern will show how to use a sidecar container to trigger Amazon ECS task to stop the task after a duration that you set.

#### Task Definition

Create a task definition using one of the following methods:

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

#### Test it Out

You can use the Amazon ECS console to launch a copy of the task as a standalone task. After 60 seconds you should see the task stop with a final message of "Essential container in task exited"