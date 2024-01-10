---
title: Capture ECS task events into Amazon CloudWatch using Amazon EventBridge
description: How to persist ECS task events and telemetry in Amazon CloudWatch, so that you can
  view old task history and debug historical crashed tasks.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: feature
    value: container-insights
authors:
  - peckn
date: April 18 2023
---

#### About

Amazon Elastic Container Service watches over your application 24/7, making autonomous decisions about how to keep your application up and running on your infrastructure. For example, if it sees that your application has crashed, then it will restart it. If an EC2 instance goes offline then Elastic Container Service can relaunch your application on a different EC2 instance that is still online.

By default, ECS only retains information on a task while it is running, and for a brief period of time after the task has stopped. What if you want to capture task history for longer, in order to review older tasks that crashed in the past?

With this pattern you can use Amazon EventBridge to capture ECS task data into long term storage in Amazon CloudWatch, then query that data back out later using CloudWatch Log Insights query language.

!!! @/pattern/ecs-task-events-capture-cloudwatch/task-history.svg

#### CloudWatch Container Insights

Amazon ECS CloudWatch Container Insights is an optional feature that you can enable to store and retain task telemetry data for as long as you want. The task telemetry data includes resource usage statistics, at one minute resolution, covering CPU, memory, networking, and storage.

::: tip
There is no charge for using Amazon ECS, however the Container Insights feature does come with an additional cost based on the amount of data stored in CloudWatch, and an additional cost for querying that data using CloudWatch Log Insights. A task with one container generates about 1 MB of telemetry data per day. If there is more than one container per task, or you have frequent task turnover you may generate even more telemetry data. Queries will also cost more based on the amount of telemetry data processed by the query. See [Amazon CloudWatch pricing](https://aws.amazon.com/cloudwatch/pricing/) for more info.
:::

In order to activate Container Insights for a cluster, you can use the command line:

```sh
aws ecs update-cluster-settings \
  --cluster cluster_name_or_arn \
  --settings name=containerInsights,value=enabled \
  --region us-east-1
```

Or you can enable Container Insights when creating an ECS cluster with CloudFormation:

```yml
MyCluster:
  Type: AWS::ECS::Cluster
  Properties:
    ClusterName: production
    Configuration:
      containerInsights: enabled
```

From this point on you will start to see new metrics and new logs stored in CloudWatch. You can find the raw task details over time stored in CloudWatch Logs, under the namespace `/aws/ecs/containerinsights/<cluster-name>`. By default this log group only stores data for one day. However, you can edit the retention period to store this data for even longer, by finding the namespace in the CloudWatch Logs console, and editing it's settings.

#### Sample Container Insights Telemetry

Here are some sample telemetry events similar to what you will see in CloudWatch after enabling Container Insights:

<tabs>

<tab label='Container Telemetry Event'>

```json
{
    "Version": "0",
    "Type": "Container",
    "ContainerName": "stress-ng",
    "TaskId": "fd84326dd7a44ad48c74d2487f773e1e",
    "TaskDefinitionFamily": "stress-ng",
    "TaskDefinitionRevision": "2",
    "ServiceName": "stress-ng",
    "ClusterName": "benchmark-cluster-ECSCluster-TOl9tY939Z2a",
    "Image": "209640446841.dkr.ecr.us-east-2.amazonaws.com/stress-ng:latest",
    "ContainerKnownStatus": "RUNNING",
    "Timestamp": 1654023960000,
    "CpuUtilized": 24.915774739583338,
    "CpuReserved": 256,
    "MemoryUtilized": 270,
    "MemoryReserved": 512,
    "StorageReadBytes": 0,
    "StorageWriteBytes": 0,
    "NetworkRxBytes": 0,
    "NetworkRxDropped": 0,
    "NetworkRxErrors": 0,
    "NetworkRxPackets": 4532,
    "NetworkTxBytes": 0,
    "NetworkTxDropped": 0,
    "NetworkTxErrors": 0,
    "NetworkTxPackets": 1899
}
```

</tab>

<tab label='Task Telemetry Event'>

```json
{
    "Version": "0",
    "Type": "Task",
    "TaskId": "fd84326dd7a44ad48c74d2487f773e1e",
    "TaskDefinitionFamily": "stress-ng",
    "TaskDefinitionRevision": "2",
    "ServiceName": "stress-ng",
    "ClusterName": "benchmark-cluster-ECSCluster-TOl9tY939Z2a",
    "AccountID": "209640446841",
    "Region": "us-east-2",
    "AvailabilityZone": "us-east-2a",
    "KnownStatus": "RUNNING",
    "LaunchType": "FARGATE",
    "PullStartedAt": 1653939338545,
    "PullStoppedAt": 1653939339153,
    "CreatedAt": 1653939325821,
    "StartedAt": 1653939341144,
    "Timestamp": 1654024020000,
    "CpuUtilized": 67.77333821614583,
    "CpuReserved": 256,
    "MemoryUtilized": 270,
    "MemoryReserved": 512,
    "StorageReadBytes": 0,
    "StorageWriteBytes": 0,
    "NetworkRxBytes": 0,
    "NetworkRxDropped": 0,
    "NetworkRxErrors": 0,
    "NetworkRxPackets": 4533,
    "NetworkTxBytes": 0,
    "NetworkTxDropped": 0,
    "NetworkTxErrors": 0,
    "NetworkTxPackets": 1900,
    "EphemeralStorageReserved": 21.47
}
```

</tab>

</tabs>

Container Insights telemetry can be queried by using CloudWatch Log Insights. For example this is a sample query that grabs the telemetry for a specific task.

```query
fields @timestamp, @message
| filter Type="Container" and TaskId="33a03820a2ce4ced85af7e0d4f51daf7"
| sort @timestamp desc
| limit 20
```

You can find more [sample queries and query syntax rules in the CloudWatch Log Insights docs](https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-examples.html).

#### Capture ECS Task History

In addition to the raw telemetry, Amazon ECS produces events which can be captured in a CloudWatch log group using Amazon EventBridge. These events happen when a service is updated, a task changes state, or a container instance changes state. Here is how you can capture these events using Amazon EventBridge.

The following CloudFormation will setup an EventBridge rule that captures events for a task into CloudWatch Logs:

<<< files/eventbridge-ecs-task-events.yml

The template requires input parameters:

- `ServiceName` - The name of an ECS Service you would like to start capturing events from. Example: `sample-webapp`
- `ServiceARN` - The full ARN (Amazon Resource Name) for the service. Example: `arn:aws:ecs:us-west-2:123456789012:service/sample-webapp`

You can deploy this template using the CloudFormation console, or the AWS CLI using a command like:

```sh
aws cloudformation deploy \
  --template-file eventbridge-ecs-task-events.yml \
  --stack-name eventbridge-ecs-task-events \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
     ServiceName=sample-webapp \
     ServiceArn=arn:aws:ecs:us-west-2:123456789012:service/sample-webapp
```

#### Sample ECS Task Event

Once deployed, Amazon EventBridge will start capturing ECS events into Amazon CloudWatch. Each event will be a full point in time snapshot of the ECS task's state. The following JSON is an example of what the event will look like:

<<< files/sample-ecs-event.json

Similar to telemetry, these task events can be queried using Amazon CloudWatch Log Insights. The following sample query will fetch task state change history for a single task:

```query
fields @timestamp, detail.attachments.0.status as ENI, detail.lastStatus as status, detail.desiredStatus as desiredStatus, detail.stopCode as stopCode, detail.stoppedReason as stoppedReason
| filter detail.taskArn = "<your task ARN>"
| sort @timestamp desc
| limit 20
```

Example output:

```txt
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
|       @timestamp        |    ENI     |     status     | desiredStatus |         stopCode          |                             stoppedReason                              |
|-------------------------|------------|----------------|---------------|---------------------------|------------------------------------------------------------------------|
| 2022-06-01 19:03:41.000 | DELETED    | STOPPED        | STOPPED       | ServiceSchedulerInitiated | Scaling activity initiated by (deployment ecs-svc/8045142110272152487) |
| 2022-06-01 19:03:08.000 | ATTACHED   | DEPROVISIONING | STOPPED       | ServiceSchedulerInitiated | Scaling activity initiated by (deployment ecs-svc/8045142110272152487) |
| 2022-06-01 19:02:45.000 | ATTACHED   | RUNNING        | STOPPED       | ServiceSchedulerInitiated | Scaling activity initiated by (deployment ecs-svc/8045142110272152487) |
| 2022-06-01 18:56:56.000 | ATTACHED   | RUNNING        | RUNNING       |                           |                                                                        |
| 2022-06-01 18:56:51.000 | ATTACHED   | PENDING        | RUNNING       |                           |                                                                        |
| 2022-06-01 18:56:29.000 | PRECREATED | PROVISIONING   | RUNNING       |                           |                                                                        |
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
```

With this abbreviated table you can see the history of state changes that an AWS Fargate task goes through as it normally starts up and then shuts down.

In the case of a task that unexpectedly stopped at some point in the past this history of events can be very useful for understanding just what happened to this task and why.

If you are interested in service level events, or container instance level events you can find samples of what those events look like in the [Amazon ECS events documentation](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_cwe_events.html).

#### See Also

- [Create a custom CloudWatch dashboard for your ECS service](/ecs-service-dashboard-cloudformation)
- [Effective use: Amazon ECS lifecycle events with Amazon CloudWatch logs insights](https://aws.amazon.com/blogs/containers/effective-use-amazon-ecs-lifecycle-events-with-amazon-cloudwatch-logs-insights/) - More sample queries for CloudWatch Log Insights