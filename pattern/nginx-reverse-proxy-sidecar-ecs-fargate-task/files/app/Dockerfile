FROM oven/bun
WORKDIR /srv

# Add the package manifest and install packages
ADD package.json .
RUN bun install

# Add the application code
ADD index.js .

# Specify the command to run when launching the container
CMD bun index.js