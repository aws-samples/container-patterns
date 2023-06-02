---
title: Uninstall ECS Anywhere
description: >-
  A bash script that cleans up a host that was used as capacity for ECS Anywhere
filterDimensions:
  - key: tool
    value: aws-cli
  - key: type
    value: script
  - key: capacity
    value: anywhere
authors:
  - peckn
date: Dec 2021
---

The following script removes the components of ECS Anywhere from a host.
After running this you can reinstall ECS Anywhere back onto the host cleanly, and the host will have a new identity in SSM and in the ECS console.

<<< @/pattern/uninstall-ecs-anywhere/files/uninstall-ecs-anywhere.sh

::: danger
Be careful using this script. Each time you cleanup the SSM registration key and reregister the host it will be a new SSM managed intance with a new identity. This means it will add to your SSM cost.

Additionally you will still need to use the SSM console or API to clean up old managed instances in SSM that you no longer wish to track.

If you would like to have the instance maintain the same SSM identity
you can modify the uninstall script to preserve the file `/var/lib/amazon/ssm/Vault/Store/RegistrationKey`. This way when you reinstall the SSM agent it will see the prexisting key and keep the same SSM identity.
:::
