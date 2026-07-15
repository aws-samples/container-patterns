---
title: Running GPU workloads with Amazon ECS and AWS Cloud Development Kit
description: >-
  A Cloud Development Kit demo app that shows how to run an application
  that depends on GPU resources.
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
  - key: capacity
    value: ec2
  - key: app
    value: machine-learning
authors:
  - peckn
license:
  label: Apache 2.0
  link: https://github.com/aws-samples/aws-cdk-examples/blob/master/LICENSE
date: April 18 2023
---

#### About

This pattern shows how to setup a fleet of GPU instances and use Amazon ECS to launch GPU enabled tasks across the cluster. You can use this pattern as the basis for setting up your own GPU accelerated machine learning workload orchestrated through Amazon ECS.

#### Setup Cloud Development Kit

To use this pattern you need TypeScript and Node. First, ensure that you have Node.js installed on your development machine. Then create the following files:

<tabs>
<tab label="package.json">

<<< files/package.json

</tab>

<tab label='tsconfig.json'>

<<< files/tsconfig.json

</tab>

<tab label='cdk.json'>

<<< files/cdk.json

</tab>
</tabs>

The files above serve the following purpose:

- `package.json` - This file is used by NPM or Yarn to identify and install all the required dependencies:
- `tsconfig.json` - Configures the TypeScript settings for the project:
- `cdk.json` - Tells CDK what command to run, and provides a place to pass other contextual settings to CDK.

Last but not least run the following commands to install dependencies and setup your AWS account for the deployment:

```sh
npm install
npm run-script cdk bootstrap
```

#### Create the CDK application

Now create the following file to define the CDK application itself:

<<< files/index.ts

Some things to note in this application:

- `ec2.MachineImage.fromSsmParameter('/aws/service/ecs/optimized-ami/amazon-linux-2023/gpu/recommended/image_id')` - The CDK application uses this SSM Parameter to automatically launch the latest version of the ECS Optimized AMI with built-in GPU support.
- `gpuCount: 1` - The ECS task is configured to require one GPU core.
- The `G4dn` instance type provides NVIDIA T4 GPUs with CUDA 12 support.

#### Build and deploy the CDK app

Preview what will be deployed:

```sh
npm run-script cdk diff
```

Deploy the GPU cluster and task:

```sh
npm run-script cdk deploy
```

#### Make sure it worked

Open up the Amazon ECS console and find the cluster that deployed.
Within that cluster you will see the GPU enabled service has launched
two tasks. Select one of the tasks to view it's details and click on the "Logs"
tab to see its output. You should see something similar to this:

```txt
---------------------------------------------------------------------------------------------------
|   timestamp   |                                     message                                     |
|---------------|---------------------------------------------------------------------------------|
| 1752574414000 | Wed Jul 15 11:46:58 2026                                                        |
| 1752574414000 | +-----------------------------------------------------------------------------------------+ |
| 1752574414000 | | NVIDIA-SMI 580.159.03             Driver Version: 580.159.03     CUDA Version: 13.0     | |
| 1752574414000 | +-----------------------------------------+------------------------+----------------------+ |
| 1752574414000 | | GPU  Name                 Persistence-M | Bus-Id          Disp.A | Volatile Uncorr. ECC | |
| 1752574414000 | | Fan  Temp   Perf          Pwr:Usage/Cap |           Memory-Usage | GPU-Util  Compute M. | |
| 1752574414000 | |                                         |                        |               MIG M. | |
| 1752574414000 | |=========================================+========================+======================| |
| 1752574414000 | |   0  Tesla T4                       On  |   00000000:00:1E.0 Off |                    0 | |
| 1752574414000 | | N/A   29C    P8              9W /   70W |       0MiB /  15360MiB |      0%      Default | |
| 1752574414000 | |                                         |                        |                  N/A | |
| 1752574414000 | +-----------------------------------------+------------------------+----------------------+ |
| 1752574414000 |                                                                                         |
| 1752574414000 | +-----------------------------------------------------------------------------------------+ |
| 1752574414000 | | Processes:                                                                              | |
| 1752574414000 | |  GPU   GI   CI              PID   Type   Process name                        GPU Memory | |
| 1752574414000 | |        ID   ID                                                               Usage      | |
| 1752574414000 | |=========================================================================================| |
| 1752574414000 | |  No running processes found                                                             | |
| 1752574414000 | +-----------------------------------------------------------------------------------------+ |
---------------------------------------------------------------------------------------------------
```

#### Clean Up

You can tear down the example stack when you are done with it by running:

```sh
npm run-script cdk destroy
```