---
title: Explore file system contents of a container image locally
description: >-
  CLI commands to explore the contents of a local Docker image
filterDimensions:
  - key: type
    value: script
authors:
  - peckn
date: Sept 7 2023
---

There are three main ways to explore the contents of a local container image. Which one you choose
depends primarily on how much you trust the container image authors, and the code inside of the image.

#### Run the image's command locally, use its interactive shell to explore

This approach runs the command that is built in to the container. This is useful in
scenarios where you expect for the code inside of the image to mutate the container file system.
You want to check on any added files or changed files inside of the container's file system.

After the container starts up you will run `sh`, an interactive shell that is part of the
container's content.

```sh
docker pull nginx
id=$(docker run -d nginx)
docker exec -it $id sh

# Inside the container shell
ls

# To get out of the container back to your host
exit
```

::: warning
This approach explicitly runs the container's built-in code. If the image contents are
malicious then a malicious binary is likely to be launched. Only use this approach
if you already trust the image and it's contents.
:::

::: info
Some minimal images may not ship with a built-in shell at all. If the image has no `sh` inside of it
then you will need to use the approach "Extract the image file system contents, view locally"
:::

#### Override the container's default run command with an interactive shell

With this approach you will start the container locally and run it with a command that
overrides the default container command. Instead you will launch `sh`, an interactive shell built-in to the
image. The shell will allow you to explore the container file system.

```sh
docker pull busybox
docker run -it busybox sh

# Inside the container shell
ls

# To get out of the container back to your host
exit
```

::: warning
This approach still requires that you trust the container image authors. Although it bypasses the
default command that is built into the image, a malicious container image author
could have still placed a malicious binary called `sh` inside of the image. When attempting
to open the shell, you could inadvertently launch malicious code. So be careful with this approach.
:::

#### (Safe) Extract the image file system contents statically, explore locally

This approach creates a stopped container locally, exports its static file system contents to a TAR file,
and then extracts that TAR file to a local directory, where you can then inspect the container's file system contents.

```sh
docker pull busybox
id=$(docker create busybox)
docker export $id > busybox.tar
mkdir busybox
tar -xvf busybox.tar -C busybox
```

This approach is safest because it does not run any code from inside of the image. You are merely
extracting the image contents out of the image into a local folder. You can then use your own
local utilities to explore the file system as static files, without ever running any code
from inside of the image.

#### See Also

- Use [Amazon ECS Exec to explore the contents of a remote container that is running on EC2 or AWS Fargate](/elastic-file-system-aws-copilot)