import ecs = require('aws-cdk-lib/aws-ecs');
import cdk = require('aws-cdk-lib');
import {
  Container,
  Environment,
  HttpLoadBalancerExtension,
  FireLensExtension,
  Service,
  ServiceDescription
} from '@aws-cdk-containers/ecs-service-extensions';

class ECSStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an environment to deploy a service in.
    const environment = new Environment(this, 'production');

    // Build out the service description
    const nginxDescription = new ServiceDescription();

    // Define the container for the service.
    nginxDescription.add(new Container({
      cpu: 1024,
      memoryMiB: 2048,
      trafficPort: 80,
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/nginx/nginx:latest'),
    }));

    // Create a load balancer and attach it to the
    // container's traffic port.
    nginxDescription.add(new HttpLoadBalancerExtension());

    // Route logs with FireLens
    nginxDescription.add(new FireLensExtension());

    // Use the service description to make a service
    // inside of the environment.
    new Service(this, 'nginx', {
      environment: environment,
      serviceDescription: nginxDescription,
    });
  }
}

const app = new cdk.App();
new ECSStack(app, 'ECSStack');
app.synth();