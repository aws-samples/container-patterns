---
title: 'Workshop: Serverless First on AWS'
description: >-
  Compare three ways of running serverless containers by deploying a chat application that uses AWS Lambda,
  AWS Fargate, and AWS App Runner
filterDimensions:
  - key: tool
    value: cloudformation
  - key: type
    value: workshop
  - key: capacity
    value: fargate
  - key: app
    value: website
authors:
  - peckn
date: Jun 26, 2023
---

#### About

During this workshop you will learn about how building solutions on AWS by leveraging a "serverless-first" philosophy can provide increased agility, lower total cost of ownership (TCO), and be the fastest path to production.

We will then build a chat application that uses a variety of serverless services. In the process you will learn about the primary serverless compute services, understand how these services can work together to deliver a cohesive solution, and gain confidence in architecting workloads with serverless first patterns.

#### Architecture Diagram

The following diagram shows the architecture that is deployed in the workshop:

!!! @/pattern/workshop-serverless-first-aws/diagram.svg

The application has three main components:

1. A frontend web application, which is powered by an AWS App Runner container
2. A backend WebSocket chat server, which runs in AWS Fargate
3. A search indexer and search query endpoint, which is powered by AWS Lambda and Amazon OpenSearch Serverless

#### Start the Workshop

You can find the workshop at:

<a class='btn btn-primary' href='https://catalog.workshops.aws/serverless-first/en-US/010-introduction/1-serverless'>Serverless First Workshop</a>

:::tip
Running this workshop on your own requires an AWS account and will results in charges on that account.
If you prefer to learn for free, then watch the [AWS Events page](https://aws.amazon.com/events/) for an AWS summit or convention near you. Many AWS events feature workshops such as this one, and workshops run at live events are completely free for attendees.
:::

#### Check out a demo

If you would just like to check out a live demo of the application then visit https://fargate.chat and send a few messages.
