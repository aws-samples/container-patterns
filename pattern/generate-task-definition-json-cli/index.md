---
title: Create new Elastic Container Service (ECS) task definition revision
description: >-
  A bash script example showing how to create a new revision of an ECS task definition, with variables for image URI, and other values.
filterDimensions:
  - key: tool
    value: aws-cli
  - key: type
    value: script
authors:
  - peckn
date: March 24 2023
---

#### About

This script demonstrates the use of a Bash [here document](https://en.wikipedia.org/wiki/Here_document) to embed a task definition template in a deploy script. You can interpolate variable values from the bash script into the task definition template, and then pass the entire JSON structure to the `aws ecs create-task-definition` CLI command using the `--cli-input-json` flag.

#### Example deploy script

<<< @/pattern/generate-task-definition-json-cli/files/script.sh

#### Installation

Download the script and use `chmod` on the command line to make it executable:

```sh
chmod +x script.sh
```

You can then run the script on the command line with

```sh
./script.sh
```

#### Next steps

* Customize the embedded task definition with your own application's details
* Add some `docker` commands to the top of the script to build and push a new version of your container image
* Add the script to your Git repository and use a CI/CD solution to automatically run the deploy script whenever you merge code into your repository.