---
title: Background worker that gets jobs from an SQS queue
description: >-
  Use AWS Copilot to deploy a serverless worker container in AWS Fargate that does jobs off an SQS queue.
filterDimensions:
  - key: tool
    value: copilot
  - key: type
    value: tutorial
  - key: capacity
    value: fargate
  - key: app
    value: worker
authors:
  - peckn
date: May 5, 2023
---

#### About

Background workers are a good way to decouple the fast, synchronous work that you need to do immediately from the slower and heavier work that can be done asychronously. Background workers allow you to absorb spikes of incoming workload and do processing gradually in the background. They spread workload over available computing resources more efficiently and cost effectively.

!!! @/pattern/background-worker-sqs-queue-container-copilot/capacity.svg

Compare the two scenarios above.

On the left side a spike of work arrives. Processing this work immediately requires a large amount of compute resources. Additionally, once the spike of work is all handled, the compute resources are now under-utilized, but must likely be maintained for a while in case another spike of work arrives.

On the right side a spike of work arrives, but rather than doing the work immediately, the work is queued up. A worker (or pool of workers) is able to spread the work out over a longer period of time, while using less resources overall. Most importantly, there is very little wasted compute. The compute is able to stay utilized for longer. In many cases the compute resources are able to stay busy and run at a stable rate over time by spreading the work out from spike to spike.

This pattern will show you how to build and deploy a background worker.

#### Concepts and dependencies

[Amazon Simple Queue Service (SQS)](https://aws.amazon.com/sqs/) is a serverless queue. You can push jobs onto the queue, and workers can pull jobs off the queue to work on later whenever they aren't busy.

[AWS Copilot CLI](https://aws.github.io/copilot-cli/) is the official command line tool for Amazon ECS. It helps you deploy containerized applications based on built-in production ready templates. One of those templates is a background worker.

In order to use this pattern you will need the following dependencies:

* [Docker](https://www.docker.com/) or other OCI compatible container builder.
* AWS Copilot CLI - Follow the [install instructions for your system](https://aws.github.io/copilot-cli/docs/getting-started/install/).

#### Architecture

This is what you will be deploying:

!!! @/pattern/background-worker-sqs-queue-container-copilot/architecture.svg

The worker application runs as a container in AWS Fargate. The container gets messages from an Amazon SQS queue. The SQS queue also emits metrics about how many messages are waiting to be processed. Amazon ECS is configured to use this metric for scaling. The number of worker containers can be automatically increase and decreased based on the queue metrics.

The worker also uses the Amazon ECS task protection endpoint so that Amazon ECS is aware of when the worker is doing critical work, and will not try to scale it down.

#### Get the sample code

This pattern uses sample code from the AWS container Github organization. Run the following command to clone the repository:

```shell
git clone https://github.com/aws-containers/ecs-task-protection-examples
```

You will be deploying the sample app at `/queue-consumer` inside of this repository.

Take a minute to look through the code:

* `/queue-consumer/Dockerfile` - The Dockerfile that will be used to build the container image
* `/queue-consumer/index.js` - Node.js entrypoint for the program, which will be grabbing work off the queue
* `/queue-consumer/lib/protection-manager.js` - A helper class that calls the ECS task protection endpoint so that Amazon ECS doesn't scale down the application while it is doing work.
* `/copilot/queue-consumer/manifest.yml` - General settings for how to run the worker application
* `/copilot/queue-consumer/addons/task-protection.yml` - An addon CloudFormation stack that gives the task permission to use the [ECS task scale-in protection endpoint](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-scale-in-protection-endpoint.html).

#### Deploy the application using AWS Copilot

On the command line navigate to `/queue-consumer` using the command `cd queue-consumer` if you have not already done so.

Now we can initialize a new application deployment using AWS Copilot:

```shell
copilot init
```

Copilot will ask you what type of application you would like to deploy. Choose `Worker Service`:

```txt
Which workload type best represents your architecture?  [Use arrows to move, type to filter, ? for more help]
    Request-Driven Web Service  (App Runner)
    Load Balanced Web Service   (Internet to ECS on Fargate)
    Backend Service             (ECS on Fargate)
  > Worker Service              (Events to SQS to ECS on Fargate)
    Scheduled Job               (Scheduled event to State Machine to Fargate)
```

Next Copilot will ask you what you'd like to name the service. Type `queue-consumer`:

```txt
 What do you want to name this service? [? for help] queue-consumer
```

Copilot will ask you what `Dockerfile` to deploy. Choose `queue-consumer/Dockerfile`:

```txt
Which Dockerfile would you like to use for queue-consumer?  [Use arrows to move, type to filter, ? for more help]
  > queue-consumer/Dockerfile
    websocket/Dockerfile
    Enter custom path for your Dockerfile
    Use an existing image instead
```

You will see Copilot create some resources on your behalf:

```txt
- Creating the infrastructure for stack task-protection-infrastructure-roles                    [create in progress]  [28.3s]
  - A StackSet admin role assumed by CloudFormation to manage regional stacks                   [create complete]    [13.0s]
  - An IAM role assumed by the admin role to create ECR repositories, KMS keys, and S3 buckets  [create in progress]  [10.9s]
```

Last not least, Copilot will ask you whether you'd like to deploy a test environment. Type `y` for "yes":

```txt
 Would you like to deploy a test environment? [? for help] (y/N) y
```

You will then see AWS Copilot kick off a deployment. It will create some initial resources, build and push the container image, and then run a CloudFormation template deploy to roll out the container image on AWS Fargate, using Amazon ECS:

```txt
- Creating the infrastructure for stack task-protection-test-queue-consumer   [create complete]  [419.5s]
  - Update your environment's shared resources                                [create complete]  [0.0s]
  - An IAM role to update your environment stack                              [create complete]  [16.1s]
  - A KMS key to encrypt messages in your queues                              [create complete]  [121.3s]
  - An events SQS queue to buffer messages                                    [create complete]  [72.5s]
  - An IAM Role for the Fargate agent to make AWS API calls on your behalf    [create complete]  [13.3s]
  - A CloudWatch log group to hold your service logs                          [create complete]  [0.0s]
  - An ECS service to run and maintain your tasks in the environment cluster  [create complete]  [200.6s]
    Deployments
               Revision  Rollout      Desired  Running  Failed  Pending
      PRIMARY  1         [completed]  1        1        0       0
  - An ECS task definition to group your containers and run them on ECS       [create complete]  [0.0s]
  - An IAM role to control permissions for the containers in your tasks       [create complete]  [13.3s]
✔ Deployed service queue-consumer
```

Verify that the service is running with `copilot svc status`:

```txt
Found only one deployed service queue-consumer in environment test
Task Summary

  Running   ██████████  1/1 desired tasks are running

Tasks

  ID        Status      Revision    Started At
  --        ------      --------    ----------
  0506b170  RUNNING     1           8 minutes ago
```

#### Test it out

Copilot has automatically created an SQS queue for this worker service. You can push messages to this SQS queue and the worker will pick up the job.

Open up the SQS console and look for the queue that was created. It should have a name similar to `task-protection-test-queue-consumer*`.

After selecting the queue, you can select "Send and receive messages" to send messages to the queue. This sample worker accepts messages that nothing but a number in the body of the message. You can put a number into the body of the message which is the number of milliseconds you want that job to take. For example `10000` is 10 seconds of time.

Navigate to the Amazon ECS console and check the logs tab for the service. You should see something similar to this:

```txt
2023-05-05T14:13:33.343-04:00 Acquiring task protection
2023-05-05T14:13:33.367-04:00	Long polling for messages
2023-05-05T14:13:40.560-04:00 543ad901-2eb2-4f42-9efe-28a2dd458bc2 - Received
2023-05-05T14:13:40.560-04:00	543ad901-2eb2-4f42-9efe-28a2dd458bc2 - Working for 20000 milliseconds
2023-05-05T14:14:00.571-04:00	543ad901-2eb2-4f42-9efe-28a2dd458bc2 - Done
2023-05-05T14:14:00.571-04:00	Releasing task protection
2023-05-05T14:14:00.611-04:00	Task protection released
```

The worker has done the following:

1. Set task protection on itself
2. Polled SQS for work to do
3. Found a job to do and waits for 20,000 ms to simulate doing work
4. Released the task protection from itself so that Amazon ECS can scale the task in if the queue is empty and there are too many worker tasks.

#### Next Steps

* Add your own code to the existing worker to do any background jobs that you want to do. Then build a frontend service that pushes messages onto SQS for the backend worker to pick up and do.
* Dig deeper into the `ProtectionManager` class and it's available settings and usage.