---
title: NGINX reverse proxy sidecar for a web container hosted with Amazon ECS and AWS Fargate
description: >-
  How to run a sidecar NGINX reverse proxy to offload static file serving and protect your dynamic application code from bad traffic.
filterDimensions:
  - key: tool
    value: cloudformation
  - key: tool
    value: aws-sam-cli
  - key: capacity
    value: fargate
  - key: app
    value: website
  - key: type
    value: pattern
authors:
  - peckn
date: Nov 11, 2023
---

#### About

[NGINX](https://nginx.org/en/docs/) is a high performance HTTP server and reverse proxy which has achieved significant adoption because of its asynchronous event driven architecture which allows it to serve thousands of concurrent requests with very low memory footprint.

[Amazon Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) is a highly scalable, high performance container management service that runs containers on a managed cluster of Amazon EC2 instances, or using serverless AWS Fargate capacity.

This pattern will show how to deploy open source NGINX as a reverse proxy container in front of your application container.

#### Architecture

This pattern will deploy the following architecture:

!!! @/pattern/nginx-reverse-proxy-sidecar-ecs-fargate-task/diagram.svg

1. An ECS task runs in AWS Fargate. The task has two containers: an NGINX sidecar, and a simple JavaScript webserver
2. The task only accepts inbound traffic on the NGINX traffic port. The NGINX server filters out bad traffic, and forwards good traffic to the backend task on it's local port.
3. The NGINX server responds back to clients, returning the response from the application server. The NGINX server can also transform responses, such as doing compression of plaintext responses. This offloads work from the application itself.

#### Why use a reverse proxy?

A reverse proxy fetches resources from another server on behalf of a client. One of the challenges of running a web server that serves requests from the public is that you can expect to receive quite a lot of unwanted traffic every day. Some of this traffic is relatively benign scans by researchers and tools such as Shodan or nmap:

```txt
[18/May/2017:15:10:10 +0000] "GET /YesThisIsAReallyLongRequestURLbutWeAreDoingItOnPurposeWeAreScanningForResearchPurposePleaseHaveALookAtTheUserAgentTHXYesThisIsAReallyLongRequestURLbutWeAreDoingItOnPurposeWeAreScanningForResearchPurposePleaseHaveALookAtTheUserAgentTHXYesThisIsAReallyLongRequestURLbutWeAreDoingItOnPurposeWeAreScanningForResearchPurposePleaseHaveALookAtTheUserAgentTHXYesThisIsAReallyLongRequestURLbutWeAreDoingItOnPurposeWeAreScanningForResearchPurposePleaseHaveALookAtTheUserAgentTHXYesThisIsAReallyLongRequestURLbutWeAreDoingItOnPurposeWeAreScanningForResearchPurposePleaseHaveALookAtTheUserAgentTHXYesThisIsAReallyLongRequestURLbutWeAreDoingItOnPurposeWeAreScanningForResearchPurposePleaseHaveALookAtTheUserAgentTHXYesThisIsAReallyLongRequestURLbutWeAreDoingItOnPurposeWeAreScanningForResearchPurposePleaseHaveALookAtTheUserAgentTHXYesThisIsAReallyLongRequestURLbutWeAreDoingItOnPurposeWeAreScanningForResearchPurposePleaseHaveALookAtTheUserAgentTHXYesThisIsAReallyLongRequestURLbutWeAreDoingItOnPurposeWeAreScann HTTP/1.1" 404 1389 - Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36
[18/May/2017:18:19:51 +0000] "GET /clientaccesspolicy.xml HTTP/1.1" 404 322 - Cloud mapping experiment. Contact research@pdrlabs.net
```

But other traffic is much more malicious. For example here is what a web server sees while being scanned by the hacking tool [ZmEu](https://en.wikipedia.org/wiki/ZmEu_(vulnerability_scanner)) which scans web servers trying to find PHPMyAdmin installations to exploit:

```txt
[18/May/2017:16:27:39 +0000] "GET /mysqladmin/scripts/setup.php HTTP/1.1" 404 391 - ZmEu
[18/May/2017:16:27:39 +0000] "GET /web/phpMyAdmin/scripts/setup.php HTTP/1.1" 404 394 - ZmEu
[18/May/2017:16:27:39 +0000] "GET /xampp/phpmyadmin/scripts/setup.php HTTP/1.1" 404 396 - ZmEu
[18/May/2017:16:27:40 +0000] "GET /apache-default/phpmyadmin/scripts/setup.php HTTP/1.1" 404 405 - ZmEu
[18/May/2017:16:27:40 +0000] "GET /phpMyAdmin-2.10.0.0/scripts/setup.php HTTP/1.1" 404 397 - ZmEu
[18/May/2017:16:27:40 +0000] "GET /mysql/scripts/setup.php HTTP/1.1" 404 386 - ZmEu
[18/May/2017:16:27:41 +0000] "GET /admin/scripts/setup.php HTTP/1.1" 404 386 - ZmEu
[18/May/2017:16:27:41 +0000] "GET /forum/phpmyadmin/scripts/setup.php HTTP/1.1" 404 396 - ZmEu
[18/May/2017:16:27:41 +0000] "GET /typo3/phpmyadmin/scripts/setup.php HTTP/1.1" 404 396 - ZmEu
[18/May/2017:16:27:42 +0000] "GET /phpMyAdmin-2.10.0.1/scripts/setup.php HTTP/1.1" 404 399 - ZmEu
[18/May/2017:16:27:44 +0000] "GET /administrator/components/com_joommyadmin/phpmyadmin/scripts/setup.php HTTP/1.1" 404 418 - ZmEu
[18/May/2017:18:34:45 +0000] "GET /phpmyadmin/scripts/setup.php HTTP/1.1" 404 390 - ZmEu
[18/May/2017:16:27:45 +0000] "GET /w00tw00t.at.blackhats.romanian.anti-sec:) HTTP/1.1" 404 401 - ZmEu
```

In addition to hacking tools scanning your servers you can also end up receiving unwanted web traffic that was intended for another server. In a dynamic cloud environment your application may end up taking over a public IP address that was formerly connected to another service. When this happens its not uncommon for misconfigured or misbehaving DNS servers to result in traffic that was intended to go to a completely different host to continue to be directed to an IP address which is now connected to your own server.

Anyone running a web server connected to the internet has to assume the responsibility of handling and rejecting potentially malicious traffic or unwanted traffic. Ideally the web server is capable of rejecting this traffic as early as possible, before it actually reaches your core application code. A reverse proxy is one way to provide an extra layer of protection for your application server. It can be configured to reject these requests before they reach your application server.

Another potential benefit of using a reverse proxy is that you can offload some static responses from the application itself. In this pattern you will notice that the healthcheck requests that the Application Load Balancer sends to the task are also being offloaded onto NGINX instead of going all the way to the application code. You could use a similar approach to host your own static HTML webpage, or other static content that you wish to serve to the internet.

#### Dependencies

This pattern requires that you have an AWS account and the following tools locally:

- [Docker](https://www.docker.com/) or similar OCI compatible container image builder
- AWS Serverless Application Model (SAM) CLI - If not already installed then please [install SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html) for your system.

#### Build the application

Create a folder `app` and put the following files into the folder. These three files define a basic JavaScript application that implements an API:

<tabs>
<tab label="index.js">

<<< files/app/index.js

</tab>
<tab label="package.json">

<<< files/app/package.json

</tab>
<tab label="Dockerfile">

<<< files/app/Dockerfile{Dockerfile}

</tab>
</tabs>

You should now have an `app` directory with three files in it:

- `index.js` - The application code that the web server will run
- `package.json` - Describes dependencies for the application code
- `Dockerfile` - Describes how to package up the application code and it's dependencies into a container image.

You can now build and push the container image to AWS by running the following commands in the `app` directory.

```sh
APP_URI=$(aws ecr create-repository --repository-name app --query 'repository.repositoryUri' --output text)
docker build -t $APP_URI .
docker push $APP_URI
```

#### Build the NGINX proxy

Next we need to build a customized NGINX reverse proxy with the configuration that will forward requests to
the application, while rejecting unwanted requests.

Create a folder `nginx` and put the following files in the folder:

<tabs>
<tab label="nginx.conf">

<<< files/nginx/nginx.conf{nginx}

</tab>
<tab label="Dockerfile">

<<< files/nginx/Dockerfile{Dockerfile}

</tab>
<tab label="index.html">

<<< files/nginx/index.html

</tab>
</tabs>

You should now have an `nginx` directory with two files in it:

- `nginx.conf` - Defines the proxy configuration
- `index.html` - Basic file that we will use as a healthcheck response
- `Dockerfile` - Defines how to apply the proxy configuration on top of a generic NGINX image from the Elastic Conatiner Registry Public Gallery.

Some things to note in the `nginx.conf`:

1. Lines 3-6 tell NGINX to compress outgoing content. This allows your application to just return plaintext responses, and offload compression onto the NGINX sidecar.
2. Line 12 limits what traffic paths will be forwarded to the application. The application will only receive requests that match `/api*`. All other requests will be rejected and the response will be returned directly from the NGINX container, without your application ever being touched.
3. Lines 14-15 will reject a variety of malformed requests that don't match known HTTP methods
4. Lines 20-26 control how traffic is forwarded to the application container.

You can now build and push the container image to AWS by running the following commands in the `nginx` directory.

```sh
NGINX_URI=$(aws ecr create-repository --repository-name nginx --query 'repository.repositoryUri' --output text)
docker build -t $NGINX_URI .
docker push $NGINX_URI
```

#### Define the network

This pattern can be deployed on top of either of the following VPC patterns:

- [Low cost VPC](/low-cost-vpc-amazon-ecs-cluster)
- [Large sized VPC](/large-vpc-for-amazon-ecs-cluster)

Which one you choose depends on your goals for this deployment. You can choose the low cost VPC to start with and upgrade to the large sized VPC later on if you have additional private services, or private database servers you wish to deploy in the VPC.

If you have any doubts as to which VPC to choose, then go with the "Low cost VPC" option.

Download the `vpc.yml` file from your chosen pattern, but do not deploy it yet. Deployment will be done later in the process

#### Define the cluster

Next we need to define an ECS cluster. For this pattern we will deploy the workload to AWS Fargate:

<<< files/cluster.yml

#### Define the service

Next we need to define the service that will run:

<<< files/service.yml

Things to note in this template:

- The `AWS::ECS::TaskDefinition` uses networking mode `awsvpc`. This means that every task gets it's own private networking interface.
  Containers that share a task can communicate with each other using `localhost`. This allows the `nginx.conf` proxy configuration to work,
  as it expects the application container to be available at `http://localhost:3000`.
- The task has two container definitions. Each container has it's own log group. This allows us to keep the application logs separately
  from the NGINX access logs.

#### Deploy it all

In order to deploy everything, we will use a parent stack that defines each of the children stacks and what values they expect.

<<< files/parent.yml

You should have four files:

- `vpc.yml` - Defines the networking setup
- `cluster.yml` - Defines the Amazon ECS cluster
- `service.yml` - Defines the service and task to run
- `parent.yml` - Top level stack that deploys the three child stacks.

You can deploy everything with the following command:

```sh
sam deploy \
  --template-file parent.yml \
  --stack-name nginx-reverse-proxy \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides AppImageUrl=$APP_URI NginxImageUrl=$NGINX_URI
```

#### Test it out

Open your Amazon ECS console, and locate the ECS service that you just deployed. You can find the public address of the service on the "Networking" tab, under the DNS names section. Click "open address" to open this URI in your browser.

You will see a message:

```txt
Service is healthy
```

This response is coming from NGINX, which is serving the contents of the `index.html` file.

Now try sending a request to the same URI but add `/api/users/1` to the end of the URI. You will see a response like:

```txt
User 1 found!
```

This response is coming from the application container, via NGINX. The NGINX reverse proxy has forwarded the request to the app container since it matched the pattern `/api`, and then returned the application container's response to the client.

Try sending a request to a URL like `/web/phpmyadmin`. You will see a `404 Not Found` message coming back from NGINX. The reverse proxy has answered the request without burdening the application container at all.

#### Tear it down

When you are done experimenting with this stack you can run the following command to tear everything done:

```shell
sam delete --stack-name nginx-reverse-proxy
```

#### See Also

- Consider using a [serverless API Gateway Ingress](api-gateway-fargate-cloudformation) instead of Application Load Balancer.
- Add [target tracking auto scaling](target-tracking-scale-ecs-service-cloudformation) to your service, so that it can handle bursts of traffic better.