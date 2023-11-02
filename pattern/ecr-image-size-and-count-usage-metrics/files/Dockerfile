# Build stage
FROM public.ecr.aws/lambda/python:3.10
WORKDIR ${LAMBDA_TASK_ROOT}

# Add Poetry to the image
RUN curl -sSL https://install.python-poetry.org | POETRY_HOME=/tmp python3 -

# Add the code
COPY ecr-metrics ${LAMBDA_TASK_ROOT}

# Install the required packages
RUN /tmp/bin/poetry config virtualenvs.create false \
    && /tmp/bin/poetry install --no-dev --no-interaction --no-ansi

CMD [ "src/ecr_metrics/main.handler" ]