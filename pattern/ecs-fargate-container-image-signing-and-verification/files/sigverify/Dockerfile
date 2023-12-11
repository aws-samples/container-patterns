FROM public.ecr.aws/lambda/python:3.11
WORKDIR ${LAMBDA_TASK_ROOT}

RUN yum install wget -y && \
    wget https://d2hvyiie56hcat.cloudfront.net/linux/amd64/installer/rpm/latest/aws-signer-notation-cli_amd64.rpm && \
    rpm -U aws-signer-notation-cli_amd64.rpm && \
    rm aws-signer-notation-cli_amd64.rpm

ADD sigverify.py .

CMD [ "sigverify.lambda_handler" ]