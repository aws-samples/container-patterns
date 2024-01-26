---
title: Build, tag, and release a container image to production with Amazon ECS
description: >-
  Best practices for building, tagging, and releasing a container image using task definition revisions for Amazon ECS.
filterDimensions:
  - key: type
    value: script
authors:
  - peckn
date: Oct 30 2023
---

#### Background

Container images package up your application into a single release artifact that can be deployed onto compute of your choice. But real applications have versions and a release cycle that must be tied into your orchestrator of choice. In this pattern you will learn the best practices for releasing new container images, versioning them, and defining them inside of Amazon ECS.

#### Architecture

At a high level this is the release cycle when using Amazon ECS to deploy containers to production:

!!! @/pattern/release-container-to-production-task-definition/release.svg

1. A developer writes application code and pushes it to Git, or another source control of your organization's choice. The push can be gated by a code review process, and organized into separate branches such as `dev` vs `main`. However, the point is that when a merge to `main` occurs, the release process begins.
2. When code is merged the `Dockerfile` inside of the code repository is used to build a container image. The image is then tagged with the Git commit SHA, and pushed to a private Elastic Container Registry. Each image build will have its own tag that matches the Git commit SHA.
3. After the container image is built, the `aws ecs register-task-definition` API call is used to register a new task definition revision. This revision references the container image by its unique tag, which matches the Git commit SHA.
4. Finally, the `aws ecs update-service` API call is used to tell ECS to update the live deployment to roll out the latest version of the task definition revision.

There should be a one to one to one relationship for each release. Each merge to the code repository has its own container image, and each container image has its own task definition revision.

#### Immutable Releases

The goal of an immutable release is to create a release process where you can be confident that you can always roll back to a previous version and your application will work the same way it did before.

Though tempting, it is not considered best practice to use the `latest` tag in ECS task definitions, because it breaks immutability of releases. If you want to use the `latest` tag as a convenience for local development, then you can multi-tag your container image on push with both `latest` as well as a unique tag for that build, such as the commit SHA `ba970b9` from above. But always avoid using `latest` image tag for production container deployments.

To enforce that images are tagged correctly you can turn on [image tag immutability for your container images in ECR](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html). This ensures that you will never overwrite an older release of your application with different code. Each new release will have to be uploaded to a new, unique image tag.

ECS task definitions revisions themselves are fundamentally immutable. You cannot update a task definition revision. You can only create a new revision. By creating a new task definition revision for each release you maintain a strong association between each build of your application, and the specific settings, environment variables, secrets, and other parameters that are used with that build.

Over time you will create a library of task definition revisions that point at uniquely tagged, point in time snapshots of the container image. It's okay to collect a lot of task definition revisions. By default you can store up to 1 million task definition revisions in a task definition family.

When you use a unique task definition revision and unique image tag for each release it becomes possible to use ECS features such as [deployment circuit breakers](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/deployment-circuit-breaker.html). When ECS is rolling out a new version of your code and it sees that the application is unhealthy, it can automatically roll back to the previous healthy task definition and its container image.

#### Set up an image repository

Before deployment you must create an Amazon Elastic Container Registry to store your container image inside of:

```sh
# Replace this with a static value once the REPO is created.
REPO_URI=$(aws ecr create-repository --repository-name my-repo --query 'repository.repositoryUri' --output text)
echo $REPO_URI
```

#### Deploying using bash shell commands

There are numerous CI/CD tools that you can use to automate container build and deployment. However, every deploy tool supports running shell commands to run the deployment. Therefore this pattern will show you the generic shell commands that you need to run. You can then drop them into whatever tool you want to use, whether that is Github Actions, AWS CodeBuild, or similar.

::: info
The following script assumes that you already have the [Amazon ECR credential helper](https://github.com/awslabs/amazon-ecr-credential-helper) installed in your build environment. This credential helper will automatically obtain credentials for uploading container images when needed, using your environment's AWS credentials or role.
:::

You can use the following `deploy.sh` script as a template for your own deploy process:

<<< files/deploy.sh

After downloading the file above, you can run it using the following commands:

```sh
chmod +x deploy.sh
./deploy.sh
```

Each time this script runs, it will build and upload a container image that is tagged with the Git commit hash of the current code commit. Then it will create a new ECS task definition revision that deploys that tagged image. Finally, it will update an ECS service to deploy that new task definition revision.

::: warning
For non trivial deployments it is highly recommended that you [use infrastructure as code](https://containersonaws.com/blog/2023/why-use-infrastructure-as-code/) instead of a hand written deploy script. This will help maintain consistent, reliable deployments with reproducible settings. It will also prevent scenarios where two people attempt to run the deploy script at the same time and conflict with each other.
:::

#### See Also

- [Cleanup old task definitions](ecs-delete-task-definition) when you are done with super old task definition revisions.
- [AWS Copilot](https://aws.github.io/copilot-cli/) is a higher level CLI tool, that offers more powerful commands than the basic API calls built into the AWS CLI. It can also help you deploy an automated pipeline that builds and pushes your container image, as well as deploying the ECS task definition and updating the ECS service.
