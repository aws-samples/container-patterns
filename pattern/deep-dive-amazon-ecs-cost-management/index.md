---
title: A deep dive into Amazon ECS cost management
description: >-
  How to track container resource usage back to your AWS bill? Learn how to use
  ECS resource tags and AWS Cost and Usage billing report
filterDimensions:
  - key: type
    value: video
authors:
  - peckn
  - arvsoni
date: Jun 15, 2023
---

Nathan Peck (Senior Developer Advocate), Weijuan Davis (Senior Product Manager), Shubir Kapoor (Principal Product Manager, Cost Insights) and Arvind Soni (Principal Container Specialist) do a deep dive into cost management and cost allocation on Amazon ECS.

<youtube id="0s8KhOBHW7c" />

#### Summary

AWS has launched a new cost management feature called Split Cost Allocation Data (SCAD) that enables customers to allocate containerized application costs back to individual business units or teams. The feature introduces the ability to use tags to provide cost and usage on a per-task basis. This allows customers to understand their infrastructure costs at a more granular level, and identify opportunities to save money in each containerized service and team.

1. Enable tags in ECS service, including ECS managed tags and tag propagation.
2. Use the cost and usage report to filter and analyze costs. This provides granular data at the hourly per resource level, with each tag becoming a column in the report.
3. Use tags in the cost and usage report to allocate costs down to individual services or teams.
4. Observe actual usage versus reserved usage to optimize cost and try different models and configurations to see which works best from a cost management point of view.

#### Resources

- [Jupyter Notebook demo from the video](https://github.com/arvindsoni80/ecs-ec2-cost-split)
- [Launch blog for split cost allocation data](https://aws.amazon.com/blogs/aws-cloud-financial-management/la-improve-cost-visibility-of-containerized-applications-with-aws-split-cost-allocation-data-for-ecs-and-batch-jobs/)
- [How to tag resources in Amazon ECS](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs-using-tags.html)