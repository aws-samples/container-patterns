FROM public.ecr.aws/lambda/python:3.11
WORKDIR ${LAMBDA_TASK_ROOT}

# Install and configure notation
ENV XDG_CONFIG_HOME=/var/task
ARG signing_profile_arn
RUN yum install wget -y && \
    wget https://d2hvyiie56hcat.cloudfront.net/linux/amd64/installer/rpm/latest/aws-signer-notation-cli_amd64.rpm && \
    rpm -U aws-signer-notation-cli_amd64.rpm && \
    rm aws-signer-notation-cli_amd64.rpm && \
    tee /var/task/notation/trustpolicy.json <<EOF
{
  "version": "1.0",
  "trustPolicies": [
    {
      "name":"aws-signer-tp",
      "registryScopes":[
        "*"
      ],
      "signatureVerification":{
        "level":"strict"
      },
      "trustStores":[
        "signingAuthority:aws-signer-ts"
      ],
      "trustedIdentities":[
        "${signing_profile_arn}"
      ]
    }
  ]
}
EOF
RUN chmod -R 755 /var/task/notation

# Define the Lambda function that triggers the verification
ADD sigverify.py ${LAMBDA_TASK_ROOT}
CMD [ "sigverify.lambda_handler" ]