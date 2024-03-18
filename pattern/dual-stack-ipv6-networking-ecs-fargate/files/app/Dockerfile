# Build stage, includings NPM and tools necessary for the build
FROM public.ecr.aws/docker/library/node:20 as build
WORKDIR /srv

# Install dependencies based on the `package.json` and `package-lock.json`
# files in the host folder
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev


# Production stage, only includes what is needed for production
FROM public.ecr.aws/docker/library/node:20-slim

ENV NODE_ENV production
USER node

COPY --from=build /srv .
ADD . .

# Specify the command to run when launching the container
EXPOSE 3000
CMD node index.js