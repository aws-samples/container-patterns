import ecs = require('aws-cdk-lib/aws-ecs');
import cdk = require('aws-cdk-lib');
import {
  Container,
  Environment,
  HttpLoadBalancerExtension,
  Service,
  ServiceDescription
} from '@aws-cdk-containers/ecs-service-extensions';
import { DurableVolume } from './efs-volume';
import { StaticScaleOut } from './static-scale';
import { Exec } from './ecs-exec';

const app = new cdk.App();
const stack = new cdk.Stack(app, 'efs-sample');

// Create an environment to deploy a service in.
const environment = new Environment(stack, 'production');

// Build out the service description
const description = new ServiceDescription();

// Define the container for the service.
description.add(new Container({
  cpu: 1024,
  memoryMiB: 2048,
  trafficPort: 80,
  image: ecs.ContainerImage.fromRegistry("public.ecr.aws/ecs-sample-image/amazon-ecs-sample"),
}));

// Create a load balancer and attach it to the
// container's traffic port.
description.add(new HttpLoadBalancerExtension());
description.add(new DurableVolume({
  path: '/srv',
  readonly: false
}));
description.add(new StaticScaleOut({
  desiredCount: 2
}))
description.add(new Exec())

// Use the service description to make a service
// inside of the environment.
new Service(stack, 'ecs-sample', {
  environment: environment,
  serviceDescription: description,
});

app.synth();