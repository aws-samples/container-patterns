# Adding the pattern itself

Pattern content is stored at `pattern/<pattern-name>`

1. Create a new folder inside of the pattern folder. The folder name should be a long, keyword rich, descriptive name separated by dashes: -

For example: `pattern/background-worker-sqs-queue-container-copilot`

The goal is for the URL to have keywords that are discoverable for anyone searching for the pattern content in a search engine.

2. Now you can start adding your pattern content to the folder. Every pattern requires an `index.md` file inside of the folder. This file should have content similar to this:

```yaml
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

Markdown text content goes here
```

Everything at the top of the file is YAML metadata about the pattern, including its title, description, authors, publish data, and any categories that the pattern is part of. For a list of valid filter dimensions for the pattern see the files at `data/filters.yml` and `data/filter-groups.yml`. The linter will automatically validate your `filterDimeinsions` against these built-in filters and filter groups.

Please do not add additional filters or filter groups unless there is a really good reason to do so.

### About Markdown

If you are not familiar with writing in the Markdown format please read the following guide: https://www.markdownguide.org/

This publishing platform comes with a number of built-in markdown extensions that allow you to add additional content to your patterns. See the list and examples below:

### Import a code file

You can import the content of a code file into your pattern using the following syntax:


```markdown
Here is some sample code to be added to the page:

<<< @/pattern/ecs-gpu-scheduling-cdk/files/cdk.json

And more explanatory text afterward
```

The imported code is rendered as a code widget with a download and copy button.
Please put all code files under a subfolder called `files` inside of your pattern folder.

### Tabbed content

You can create tabbed content such as displaying multiple files using Markdown syntax like this:

```
<tabs>

<tab label="package.json">

<<< @/pattern/ecs-gpu-scheduling-cdk/files/package.json

</tab>

<tab label='tsconfig.json'>

<<< @/pattern/ecs-gpu-scheduling-cdk/files/tsconfig.json

</tab>

<tab label='cdk.json'>

<<< @/pattern/ecs-gpu-scheduling-cdk/files/cdk.json

</tab>

</tabs>
```

### Embed a YouTube video

Embed a YouTube video with the following syntax:

```
<youtube id="Osi9Nmj3C9Y" />
```

### Embed an SVG diagram

You can embed an SVG diagram with the following syntax:

```
The following diagram shows the architecture of what will be created:

!!! @/pattern/large-vpc-for-amazon-ecs-cluster/diagram.svg
```

The SVG will be rendered inline in the content, so that text labels are selectable and readable by screen readers. See the [SVG diagram process](./svg-diagram-process.md) for details on how to create a great diagram.

### Notes and Tips

The following syntax can be used to add note and tip blocks to the pattern:

```
::: danger
Scary red danger message here
:::
::: warning
Orange warning here
:::
```

For more info and examples see: https://vitepress.dev/guide/markdown#custom-containers

### Github Style Tables

See: https://vitepress.dev/guide/markdown#github-style-tables
