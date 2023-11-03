# Build stage
FROM public.ecr.aws/lambda/python:3.11
WORKDIR ${LAMBDA_TASK_ROOT}

# Add Poetry to the image
RUN set -o pipefail && curl -sSL https://install.python-poetry.org | POETRY_HOME=/tmp python3 -

# Add the code
COPY pyproject.toml poetry.lock README.md ${LAMBDA_TASK_ROOT}/
COPY src/ ${LAMBDA_TASK_ROOT}/src

# Install the required packages
RUN /tmp/bin/poetry config virtualenvs.create false \
    && /tmp/bin/poetry install --only main --no-interaction --no-ansi

CMD [ "src/ecr_metrics/main.handler" ]