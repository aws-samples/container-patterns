---
title: Container image signing and verification using AWS Signer for Amazon ECS and AWS Fargate
description: >-
  How to use AWS Signer to verify container images run using Amazon ECS and AWS Fargate
filterDimensions:
  - key: tool
    value: cloudformation
  - key: capacity
    value: fargate
  - key: type
    value: tutorial
authors:
  - peckn
date: Dec 5, 2023
---

[AWS Signer](https://docs.aws.amazon.com/signer/latest/developerguide/Welcome.html) is a fully managed code-signing service to ensure the trust and integrity of your code. It can be used to sign and verify container images.

[Notary](https://notaryproject.dev/) is open source software that is the basis for AWS Signer support for container images. The CLI for Notary is called Notation CLI.

In this reference architecture you will sign a container image, then deploy an automated event hook for [Amazon Elastic Container Service](https://aws.amazon.com/ecs/). The hook will check if containers launched on [AWS Fargate](https://aws.amazon.com/fargate/) are actually signed and verified.

#### Architecture

The following diagram shows the architecture you will deploy:


::: warning
This EventBridge powered hook is read-only. Therefore this hook based
architecture is only intended for auditing and notifying of unsigned images being launched. It can not actually block
Elastic Container Service from launching the unsigned image.
:::

#### Dependencies

In order to setup this architecture you need:

* Latest AWS CLI, and an AWS account
* [Notation CLI with AWS Signer plugin](https://docs.aws.amazon.com/signer/latest/developerguide/image-signing-prerequisites.html) - This is used to sign and verify container images.
* [Amazon ECR Credential Helper](https://github.com/awslabs/amazon-ecr-credential-helper) - This will automatically use your current IAM credentials to give you access to Elastic Container Registry.

You can verify that Notation CLI is installed:

```sh
notation version
```

You should see the following output:

```txt
Notation - a tool to sign and verify artifacts.

Version:     1.0.0
Go version:  go1.20.7
Git commit:  80e3fc4e2eeb43ac00bc888cf41101f5c56f1535
```

Next verify that AWS Signer is installed as a plugin:

```sh
notation plugin ls
```

You should see the following output:

```txt
NAME                                   DESCRIPTION                      VERSION   CAPABILITIES                                                                                             ERROR
com.amazonaws.signer.notation.plugin   AWS Signer plugin for Notation   1.0.298   [SIGNATURE_GENERATOR.ENVELOPE SIGNATURE_VERIFIER.TRUSTED_IDENTITY SIGNATURE_VERIFIER.REVOCATION_CHECK]   <nil>
```

#### Create the registry

First of all we need a signed container image for testing. In order to accomplish this you will pull a public image from
Elastic Container Registry public gallery, sign it, and then push it to your own private registry.

First let's create the supporting infrastructure for storing your signed containers:

<<< files/registry.yml

Use the following `parent-step-01.yml` file to deploy the `registry.yml` file. This will allow us to add additional stacks as modules later:

<<< files/parent-step-01.yml

You can deploy the parent stack using the following command:

```sh
sam deploy \
  --template-file parent-step-01.yml \
  --stack-name aws-signer-image-verification \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM
```

#### Sign and push a container image to the registry

First copy the public image into your own private registry.

```sh
REPO_URI=$(aws cloudformation describe-stacks --stack-name aws-signer-image-verification --query "Stacks[0].Outputs[?OutputKey=='RepositoryUri'].OutputValue" --output text)

docker pull public.ecr.aws/ecs-sample-image/amazon-ecs-sample:latest
docker tag public.ecr.aws/ecs-sample-image/amazon-ecs-sample:latest $REPO_URI:demo-app
docker push $REPO_URI:demo-app

IMAGE_SHA=$(docker inspect --format='{{index .RepoDigests 0}}' $REPO_URI:demo-app)
```

Now you can use Notation to sign the image:

```sh
SIGNING_PROFILE_ARN=$(aws cloudformation describe-stacks --stack-name aws-signer-image-verification --query "Stacks[0].Outputs[?OutputKey=='SigningProfileArn'].OutputValue" --output text)

notation sign $IMAGE_SHA  \
--plugin com.amazonaws.signer.notation.plugin \
--id $SIGNING_PROFILE_ARN
```

You can now inspect the image:

```sh
notation inspect $IMAGE_SHA
```

You will see output similar to this, showing a chain of AWS Signer signatures verifying the image:

```txt
Inspecting all signatures for signed artifact
209640446841.dkr.ecr.us-east-2.amazonaws.com/aws-signer-image-verification-registrystack-1wx1liv7jgtji-privatecontainerregistry-jy91ycwfb07n@sha256:3c4c1f42a89e343c7b050c5e5d6f670a0e0b82e70e0e7d023f10092a04bbb5a7
└── application/vnd.cncf.notary.signature
    ├── sha256:7ca0bafbbf0fce4a90d9f2fd6765910392cef72bf8e62a60043a01632a9d781c
    │   ├── media type: application/jose+json
    │   ├── signature algorithm: ECDSA-SHA-384
    │   ├── signed attributes
    │   │   ├── signingTime: Wed Dec  6 01:20:03 2023
    │   │   ├── expiry: Sun Dec  6 01:20:03 2026
    │   │   ├── io.cncf.notary.verificationPlugin: com.amazonaws.signer.notation.plugin
    │   │   ├── com.amazonaws.signer.signingProfileVersion: arn:aws:signer:us-east-2:209640446841:/signing-profiles/SigningProfile_0Aoxfd1fB9Lu/awUPb84ibN
    │   │   ├── com.amazonaws.signer.signingJob: arn:aws:signer:us-east-2:209640446841:/signing-jobs/e218ee67-5dd3-4dc4-8caf-224898b12493
    │   │   └── signingScheme: notary.x509.signingAuthority
    │   ├── user defined attributes
    │   │   └── (empty)
    │   ├── unsigned attributes
    │   │   └── (empty)
    │   ├── certificates
    │   │   ├── SHA256 fingerprint: dab5bb7bbd23b298fefe3de475e02ef049e36726db4aba6ca62ec4cdb174132d
    │   │   │   ├── issued to: CN=AWS Signer,OU=AWS Cryptography,O=AWS,L=Seattle,ST=WA,C=US
    │   │   │   ├── issued by: CN=AWS Signer us-east-2 Code Signing CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   └── expiry: Sat Dec  9 00:30:50 2023
    │   │   ├── SHA256 fingerprint: d49c2c63e66818a6e8228701a5b13db31022f8777ede82395b365aa462fc12f1
    │   │   │   ├── issued to: CN=AWS Signer us-east-2 Code Signing CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   ├── issued by: CN=AWS Signer Code Signing Int CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   └── expiry: Tue Oct  1 22:10:13 2024
    │   │   ├── SHA256 fingerprint: eaaac975dcc0d5d160fca1e39834834f014a238cd224d053670982388ccbfca1
    │   │   │   ├── issued to: CN=AWS Signer Code Signing Int CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   ├── issued by: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │   │   └── expiry: Thu Oct 28 23:18:32 2027
    │   │   └── SHA256 fingerprint: 90a87d0543c3f094dbff9589b6649affe2f3d6e0f308799be2258461c686473f
    │   │       ├── issued to: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │       ├── issued by: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
    │   │       └── expiry: Tue Oct 27 22:33:22 2122
    │   └── signed artifact
    │       ├── media type: application/vnd.docker.distribution.manifest.v2+json
    │       ├── digest: sha256:3c4c1f42a89e343c7b050c5e5d6f670a0e0b82e70e0e7d023f10092a04bbb5a7
    │       └── size: 1778
    └── sha256:5c8ec6f038b5574a80c89b0a297d7f67b4c58c63e95b4adf0975a85f5de72aaa
        ├── media type: application/jose+json
        ├── signature algorithm: ECDSA-SHA-384
        ├── signed attributes
        │   ├── com.amazonaws.signer.signingJob: arn:aws:signer:us-east-2:209640446841:/signing-jobs/38627deb-eb04-4383-a247-3f6521178f37
        │   ├── signingScheme: notary.x509.signingAuthority
        │   ├── signingTime: Wed Dec  6 01:23:40 2023
        │   ├── expiry: Sun Dec  6 01:23:40 2026
        │   ├── io.cncf.notary.verificationPlugin: com.amazonaws.signer.notation.plugin
        │   └── com.amazonaws.signer.signingProfileVersion: arn:aws:signer:us-east-2:209640446841:/signing-profiles/SigningProfile_0Aoxfd1fB9Lu/awUPb84ibN
        ├── user defined attributes
        │   └── (empty)
        ├── unsigned attributes
        │   └── (empty)
        ├── certificates
        │   ├── SHA256 fingerprint: dab5bb7bbd23b298fefe3de475e02ef049e36726db4aba6ca62ec4cdb174132d
        │   │   ├── issued to: CN=AWS Signer,OU=AWS Cryptography,O=AWS,L=Seattle,ST=WA,C=US
        │   │   ├── issued by: CN=AWS Signer us-east-2 Code Signing CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   └── expiry: Sat Dec  9 00:30:50 2023
        │   ├── SHA256 fingerprint: d49c2c63e66818a6e8228701a5b13db31022f8777ede82395b365aa462fc12f1
        │   │   ├── issued to: CN=AWS Signer us-east-2 Code Signing CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   ├── issued by: CN=AWS Signer Code Signing Int CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   └── expiry: Tue Oct  1 22:10:13 2024
        │   ├── SHA256 fingerprint: eaaac975dcc0d5d160fca1e39834834f014a238cd224d053670982388ccbfca1
        │   │   ├── issued to: CN=AWS Signer Code Signing Int CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   ├── issued by: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │   │   └── expiry: Thu Oct 28 23:18:32 2027
        │   └── SHA256 fingerprint: 90a87d0543c3f094dbff9589b6649affe2f3d6e0f308799be2258461c686473f
        │       ├── issued to: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │       ├── issued by: CN=AWS Signer Code Signing Root CA G1,OU=Cryptography,O=AWS,ST=WA,C=US
        │       └── expiry: Tue Oct 27 22:33:22 2122
        └── signed artifact
            ├── media type: application/vnd.docker.distribution.manifest.v2+json
            ├── digest: sha256:3c4c1f42a89e343c7b050c5e5d6f670a0e0b82e70e0e7d023f10092a04bbb5a7
            └── size: 1778
```

#### Verify container images at runtime

Now let's setup the runtime component of this architecture. We will deploy a Lambda function that
is invoked on ECS task launch. It will check to see if the image is signed.

First we need to define the verification Lambda function to run:

<<< files/sigverify.yml

Next we add the verification function to the application:

<<< files/parent-step-02.yml

We can deploy this application using the following commands:

```sh
sam build --template parent-step-02.yml

sam deploy \
  --template-file .aws-sam/build/template.yaml \
  --stack-name aws-signer-image-verification \
  --resolve-image-repos \
  --resolve-s3 \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND
```