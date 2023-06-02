import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const cluster = new aws.ecs.Cluster("cluster", {});
const lb = new awsx.lb.ApplicationLoadBalancer("lb", {});
const service = new awsx.ecs.FargateService("service", {
  cluster: cluster.arn,
  assignPublicIp: true,
  desiredCount: 2,
  taskDefinitionArgs: {
    container: {
      image: "nginx:latest",
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