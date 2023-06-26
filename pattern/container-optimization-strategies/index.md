---
title: Container optimization strategies
description: >-
  Mike Fiedler, AWS Container Hero discusses some key strategies for optimizing containerized applications, including image optimizations that reduce container startup time.
filterDimensions:
  - key: type
    value: video
authors:
  - maishsk
date: March 2, 2023
---

Mike Fiedler, AWS Container Hero, discusses some key strategies for optimizing the performance of your containerized applications. Learn the best practices for image optimization, utilizing open source tooling, and reducing container startup time.

<youtube id="AM7Wy8bpyL0" />

#### Summary

Mike Fiedler and Maish discuss container optimization strategies, including using slim base images, using image layers properly, and removing unnecessary files and dependencies. They also emphasize the importance of running only one essential process per container for system and resource isolation, as well as using multistage builds to optimize image size and exclude unnecessary artifacts.

1. Research and implement container optimization strategies such as using slim base images and layering.
2. Ensure that only one essential process is running per container for system and resource isolation.
3. Use multistage builds to optimize container image size and exclude unnecessary artifacts.
4. Check for vulnerabilities in dependencies added to the container image.
