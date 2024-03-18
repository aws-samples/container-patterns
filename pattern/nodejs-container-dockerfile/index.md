---
title: Dockerfile for a Node.js container on AWS Fargate with Amazon ECS
description: >-
  How to write a Dockerfile that runs a Node.js application
filterDimensions:
  - key: type
    value: tutorial
authors:
  - peckn
date: March 15 2024
---

The following files can be used as a template to build your own Node.js application that runs as a container on AWS Fargate.


<tabs>

<tab label="Dockerfile">

<<< files/Dockerfile{Dockerfile}

The `Dockerfile` defines how to build the Node.js application.

</tab>
<tab label=".dockerignore">

<<< files/.dockerignore

The `.dockerignore` file defines local file paths to exclude from the built image.

</tab>

</tabs>


#### How it works

The following diagram shows how this container image build works:

!!! @/pattern/nodejs-container-dockerfile/diagram.svg

This `Dockerfile` has two stages. The build stage use a full featured Node.js image that has NPM and other development tools inside of it. The production stage uses a slim image that does not have any extras that aren't necessary for running in production.

The build stage runs first. It uses a [Docker bind mount](https://docs.docker.com/storage/bind-mounts/) to reference the Node.js `package.json` and `package-lock.json` file from the host machine. It also uses NPM to install the referenced packages from their files. The flag `--omit=dev` ensures that any local developer dependencies like test frameworks or other dev tools are not installed inside of the container.

The production stage runs next. It copies the installed packages from the build container, and then it copies in the application code files from the host machine. It also sets the `NODE_ENV=production` environment variable. This variable is consumed by various JavaScript packages that modify their behavior when running in production.

One more important detail is that this container runs the application process as the user `node`. Since this user is not root, the operating system will not allow the application to bind to any ports below 1024. Therefore this Dockerfile exposes port 3000 (the default port for an Express web server).

The final goal of the container image build process is to upload a fully functioning container image build artifact back to a private Elastic Container Registry so that it can be downloaded and run as a container on compute inside of AWS Fargate, EC2, or other AWS container services.

#### Build and push a container image

If you have not already done so, install the [Amazon ECR Credential Helper](https://github.com/awslabs/amazon-ecr-credential-helper). This utility allows you to use your local AWS credentials or IAM role to automatically authenticate whenever you want to use Amazon Elastic Container Registry.

Now you can build and push a container image using the following commands:

```sh
# Settings
REPO_NAME=sample-app-repo
TAG=nodejs-application

# Create new repo or use existing repo
REPO_URI=$(aws ecr create-repository --repository-name ${REPO_NAME} --query 'repository.repositoryUri' --output text)
if [ -z "${REPO_URI}" ]; then
  REPO_URI=$(aws ecr describe-repositories --repository-names ${REPO_NAME} --query 'repositories[0].repositoryUri' --output text)
fi

# Build and push the container image
docker build -t ${REPO_URI}:${TAG} .
docker push ${REPO_URI}:${TAG}
```

#### Clean up

To clean up your environment you can run the following commands:

```sh
# Clean up all Docker artifacts
docker system prune -af

# Empty and delete the Amazon ECR container registry we created
aws ecr delete-repository --repository-name ${REPO_NAME} --force
```

#### See Also

- [Build and run a Bun JavaScript container in AWS Fargate](bun-js-aws-sdk-container)