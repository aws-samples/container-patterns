---
title: Public facing, load balanced website on EC2
description: >-
  A Cloud Development Kit app showing advanced config for load balancing
  a public facing containerized application that is hosted on EC2 instances
filterDimensions:
  - key: tool
    value: cdk
  - key: type
    value: pattern
  - key: capacity
    value: ec2
authors:
  - peckn
date: Jul 21, 2022
alternatives:
  - key: tool
    value: cloudformation
    id: public-facing-web-ecs-ec2-cloudformation
    description: Instead of programmatic generation of CloudFormation YAML,
                 you can use CloudFormation directly.

---

#### About

This pattern shows how to setup an AWS Cloud Development Kit (CDK) application
for building a container image and deploying it to EC2 capacity, fronted by an Application Load Balancer that serves as the ingress for the application. The container application will be managed by Amazon Elastic Container Service (ECS).

#### Development Environment

To use this pattern you need TypeScript and Node. First, ensure that you have Node.js installed on your development machine. Then create the following files:

<tabs>
<tab label="package.json">

<<< @/pattern/advanced-public-facing-service-cdk/files/package.json

</tab>

<tab label='tsconfig.json'>

<<< @/pattern/advanced-public-facing-service-cdk/files/tsconfig.json

</tab>

<tab label='cdk.json'>

```json
{
  "app": "node index"
}
```

</tab>
</tabs>

The files above serve the following purpose:

- `package.json` - This file is used by NPM or Yarn to identify and install all the required dependencies:
- `tsconfig.json` - Configures the TypeScript settings for the project:
- `cdk.json` - Tells CDK what command to run, and provides a place to pass other contextual settings to CDK.

### CDK Application

Now you can create an `index.ts` file that has the actual code for the CDK application:

<<< @/pattern/advanced-public-facing-service-cdk/files/index.ts

Use the following commands to interact with your CDK application:

* `npm run-script cdk diff` - Show a preview of resources to be deployed
* `npm run-script cdk deploy` - Deploy the resources onto your AWS account
* `npm run-script cdk destroy` - Tear down the deployed stack

#### Next steps

* The sample application is launching EC2 capacity of type `t2.micro`. You will probably want a bigger EC2 instance type
* The sample application is deploying a sample app straight off of Docker Hub. Check out the CDK docs for [`ContainerImage.fromAsset()`](https://docs.aws.amazon.com/cdk/api/v1/docs/@aws-cdk_aws-ecs.ContainerImage.html#static-fromwbrassetdirectory-props) to see how to make CDK build your local application.
* You may wish to add port 443 to the load balancer, and configure an SSL certificate for HTTPS traffic