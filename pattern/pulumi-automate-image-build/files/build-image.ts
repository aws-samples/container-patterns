import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const repository = new awsx.ecr.Repository("repository", {});
const image = new awsx.ecr.Image("image", {
  repositoryUrl: repository.url,
  path: "./app",
});
const cluster = new aws.ecs.Cluster("cluster", {});
const lb = new awsx.lb.ApplicationLoadBalancer("lb", {});
const service = new awsx.ecs.FargateService("service", {
  cluster: cluster.arn,
  assignPublicIp: true,
  taskDefinitionArgs: {
    container: {
      image: image.imageUri,
      cpu: 512,
      memory: 128,
      essential: true,
      portMappings: [{
        targetGroup: lb.defaultTargetGroup,
      }],
    },
  },
});
export const url = lb.loadBalancer.dnsName;