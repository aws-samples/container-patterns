FROM public.ecr.aws/docker/library/node:20 as build
WORKDIR /srv
ADD package.json .
RUN npm install

FROM public.ecr.aws/docker/library/node:20-slim
COPY --from=build /srv .
ADD . .

# Specify the command to run when launching the container
EXPOSE 3000
CMD node index.js