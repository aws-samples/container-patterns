---
title: Deploy a CloudWatch dashboard for an Amazon ECS service
description: >-
  Create your own custom CloudWatch dashboard for an ECS service
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: pattern
  - key: feature
    value: container-insights
authors:
  - peckn
date: April 19 2023
---

#### About

Amazon ECS collects telemetry and generates loggable events for your service. This information
is displayed in the default Amazon ECS web console views. However, you may wish to generate
your own custom CloudWatch dashboard that has the specific metrics you are interested in.

This pattern shows how you can use CloudFormation to define and create a custom dashboard
for observing the performance and events of your ECS deployments.

#### Container Insights

This pattern assumes that you have already enabled Container Insights on your ECS cluster.

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

Once Container Insights has been enabled you will start to get high cardinality telemetry data about your tasks, streamed into CloudWatch Logs and CloudWatch Metrics.

#### Dashboard Template

The following template demonstrates how to setup a custom CloudWatch dashboard for a single ECS service.

<<< files/cloudwatch-dashboard-ecs.yml

This template only requires a single input variable:

- `ServiceArn` - The ECS service's ARN (Amazon Resource Name) to track in the dashboard. It should look something like this: `arn:aws:ecs:us-west-2:123456789012:service/sample-webapp`

You can deploy this template using the AWS CloudFormation console, or using the AWS CLI:

```sh
aws cloudformation deploy \
  --template-file cloudwatch-dashboard-ecs.yml \
  --stack-name cloudwatch-dashboard-ecs \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
     ServiceArn=arn:aws:ecs:us-east-2:209640446841:service/capacity-provider-environment-BaseStack-18PANC6K9E7D8-ECSCluster-NNBNpIh5AkZO/nginx-on-fargate
capacity-provider-environment-BaseStack-18PANC6K9E7D8-ECSCluster-NNBNpIh5AkZO
```

#### See Also

- [Capture ECS task events into CloudWatch logs](ecs-task-events-capture-cloudwatch), in order to review older tasks that no longer exist. This page also includes sample ECS task telemetry events and task events that may help you in designing your own custom dashboard.
- A [custom dashboard that identifies AWS Fargate tasks that are under-utilized](fargate-right-sizing-dashboard), and therefore potential optimization targets.