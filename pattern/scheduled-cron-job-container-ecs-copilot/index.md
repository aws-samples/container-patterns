---
title: Schedule a containerized cron job using Amazon ECS and AWS Copilot
description: >-
  Setup a background batch job on a cron schedule. It will be run in AWS Fargate by Amazon ECS. Pattern is setup using AWS Copilot.
filterDimensions:
  - key: tool
    value: copilot
  - key: type
    value: tutorial
  - key: capacity
    value: fargate
  - key: app
    value: batch
authors:
  - peckn
date: May 8, 2023
---

#### About

`cron` is a command line tool and scheduling system built into Unix-like operating systems, to help you schedule commands to run periodically. You can schedule commands to run on on an interval, or at fixed dates and times.

[Amazon EventBridge](https://aws.amazon.com/eventbridge/) is a serverless event router and scheduler that can make AWS API calls on a cron schedule.

This pattern will demonstrate how to use Amazon EventBridge to schedule an Amazon ECS `RunTask` API call to launch a container in AWS Fargate. The configuration will be setup using AWS Copilot, the official command line tool for Amazon ECS.

This example is ideal for implementing:

- An ETL (Extract, Transform, Load) job for syncing production data to an database used for running reporting queries
- Generating business reports on a regular basis
- Running cleanup jobs or other similar workloads on a regular interval

#### Dependencies

In order to use this pattern you will need the following dependencies:

- [Docker](https://www.docker.com/) or other OCI compatible container builder.
- AWS Copilot CLI - Follow the [install instructions for your system](https://aws.github.io/copilot-cli/docs/getting-started/install/).

#### Architecture

The following diagram shows the architecture that will be deployed:

!!! @/pattern/scheduled-cron-job-container-ecs-copilot/architecture.svg

1. An Amazon EventBridge rule is created which has the cron schedule or interval at which you want to run your container.
2. The rule invokes an AWS Step Functions workflow that calls Amazon ECS `RunTask` API and handles retries and timeouts
3. Amazon ECS `RunTask` launches the container of your choice on AWS Fargate capacity.

This architecture is designed to be serverless and not have a single point of failure. Unlike a traditional `cron` job that is tied to a specific instance in a specific availability zone, all components of this architecture are multi AZ. EventBridge and Step Functions utilize multiple AZ's for high availability, and AWS Fargate is configured to span multiple AZ's in a VPC so that it can launch your container with high availability.

#### Instructions

First we need to create a `Dockerfile` to define the cron job to run. To simulate a batch job you can use the following basic Dockerfile which does nothing but sleep for one hour:

```
FROM public.ecr.aws/docker/library/busybox:stable
CMD sh -c "echo 'Sleeping one hour' && sleep 3600"
```

To begin deploying the cron job using Copilot run the following command:

```shell
copilot init
```

Copilot will ask what you'd like to name your application. Type `cron-app`.

```
What would you like to name your application? [? for help] cron-app
```

Next Copilot will ask what type of workload you are deploying. Choose `Scheduled Job`:

```
  Which workload type best represents your architecture?  [Use arrows to move, type to filter, ? for more help]
    Request-Driven Web Service  (App Runner)
    Load Balanced Web Service   (Internet to ECS on Fargate)
    Backend Service             (ECS on Fargate)
    Worker Service              (Events to SQS to ECS on Fargate)
  > Scheduled Job               (Scheduled event to State Machine to Fargate)
```

As the name of the job type `cron-job`.

```
What do you want to name this job? [? for help] cron-job
```

AWS Copilot will ask what `Dockerfile` to run. Use the example `Dockerfile` from above, or supply your own custom `Dockerfile`.

```
Which Dockerfile would you like to use for cron-job?  [Use arrows to move, type to filter, ? for more help]
> ./Dockerfile
  Enter custom path for your Dockerfile
  Use an existing image instead
```

To demonstrate job scheduling choose `Rate`.

```
  How would you like to schedule this job?  [Use arrows to move, type to filter, ? for more help]
  > Rate
    Fixed Schedule
```

Copilot will ask what rate you'd like to run the job at. You can type `1h` for 1 hour interval between running jobs.

```
  How long would you like to wait between executions? [? for help] (1h30m) 1h
```

Last but not least type `y` when Copilot asks if you are ready to deploy a test environment.

```
 Would you like to deploy a test environment? [? for help] (y/N)
```

#### Manifest

Take a look at the generated manifest file `copilot/cron-job/manifest.yml`:

<<< @/pattern/scheduled-cron-job-container-ecs-copilot/files/copilot/cron-job/manifest.yml

Some extra configuration that you can customize:

- `retries` - If the job fails to start up as expected, how many times would you like to retry.
- `timeout` - A maximum lifespan for the task if it is taking too long. You can use this to prevent multiple copies of the job from running parallel with each other if the duration of one job extends past the interval that would trigger the next job.
- `cpu` and `memory` - How much resources your cron job requires.

#### Extra commands

If you would like to invoke a job instantly you can do so with:

```shell
copilot job run
```

View the logs for your job with:

```shell
copilot job logs
```

#### Cleanup

Run the following command to tear down the pattern:

```shell
copilot job delete
```