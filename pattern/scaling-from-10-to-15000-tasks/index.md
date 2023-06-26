---
title: Scaling from 10 to 16,000+ tasks in a single ECS Cluster
description: >-
  A deep dive into the process of scaling up from 10 tasks to 16k tasks, including networking setup, quotas and limits to be aware of, as well as general tips and tricks.
filterDimensions:
  - key: type
    value: video
authors:
  - maishsk
date: Jun 26, 2023
---

Maish Saidel-Keesing (Developer Advocate), Ugur Kira (Specialist Technical Account Manager) and Abhishek Nautiyal (Senior Product Manager) do a technical session about how you can scale your applications on Amazon ECS and AWS Fargate.

<youtube id="xMumHtM-1NI" />

#### Summary

- Graphs and charts showing the journey from zero tasks to 16k tasks
- How to setup a VPC that actually has enough IP addresses to host that many tasks
- The initial scale out, 500 tasks per minute launch rate, launching 80 tasks at a time.
- Hitting the vCPU quota limit for AWS Fargate, and how to raise the limit
- Hitting application load balancer quotas (number of targets per ALB target group)
- Hitting Cloud Map quota (number of instances per Cloud Map service)
