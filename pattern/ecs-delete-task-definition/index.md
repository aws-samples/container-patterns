---
title: Delete an ECS task definition using AWS CLI
description: >-
  A bash script for deleting ECS task definitions using the AWS CLI
filterDimensions:
  - key: tool
    value: aws-cli
  - key: type
    value: script
authors:
 - sbcoulto
date: 2023-02-27
---

#### Installation

Download the script below and use `chmod` to make it executable:

```sh
chmod +x delete-tasks.sh
```

#### Script

<<< @/pattern/ecs-delete-task-definition/files/delete-tasks.sh

#### Usage

Modify the following variables to use the script:

- `TASKNAME` - The task definition family to delete from. Use `aws ecs list-task-definitions` to list task definitions if you are unsure.
- `START` - The revision number to start deleting from
- `END` - The revision number to stop deleting at

Note that task definitions are 1 based, not zero based, so to delete the first 1000 task definition revisions set START=1 and END=1000

::: info
Deleting task definitions may take a while. The task definitions will not be instantly deleted. Instead they will transition to DELETE_IN_PROGRESS state and ECS will gradually clean up these task definitions in the background when they are no longer in use by any ECS services or running tasks.
:::


#### See also

- [AWS Containers Blog about task definition delete](https://aws.amazon.com/blogs/containers/announcing-amazon-ecs-task-definition-deletion/)
- [Instructions for how to delete task definitions in the AWS console](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/delete-task-definition-v2.html)

<!--Watch a video of how to delete task definitions in the console:

<youtube id='aNehm5WKaAM'></youtube>-->
