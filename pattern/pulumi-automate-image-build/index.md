---
title: Use Pulumi Crosswalk to automate container image builds
description: >-
  How to use Pulumi infrastructure as code SDK to automate building a container image
filterDimensions:
  - key: tool
    value: pulumi
  - key: type
    value: pattern
authors:
  - peckn
date: April 4 2023
license:
  label: Apache 2.0
  link: https://github.com/pulumi/examples/blob/master/LICENSE
---

Pulumi is an infrastructure as code framework for software engineers. Instead of writing YAML to define your infrastructure you can use higher level SDK commands, in a familiar programming language, and Pulumi will create the necessary resources for you automatically.

### Build a container image and push it to Elastic Container Registry

Pulumi can automate conatiner image builds so that you no longer have to run `docker build` and
`docker push` manually as part of the deploy process. Instead Pulumi will automatically create
a private Elastic Container Registry, build your container image, and push it to the registry.

Then you can use the built image in a load balanced service like this:

<tabs>
<tab label="TypeScript">

<<< @/pattern/pulumi-automate-image-build/files/build-image.ts

</tab>

<tab label="Python">

<<< @/pattern/pulumi-automate-image-build/files/build-image.py

</tab>

<tab label="Go">

<<< @/pattern/pulumi-automate-image-build/files/build-image.go

</tab>

<tab label="Java">

<<< @/pattern/pulumi-automate-image-build/files/build-image.java

</tab>

<tab label="YAML">

<<< @/pattern/pulumi-automate-image-build/files/build-image.yml

</tab>

<tab label="C#">

<<< @/pattern/pulumi-automate-image-build/files/build-image.cs

</tab>

</tabs>


### See Also

- [Pulumi docs on ECR integration](https://www.pulumi.com/docs/guides/crosswalk/aws/ecr/)