FROM public.ecr.aws/docker/library/node:19 AS build
WORKDIR /srv
ADD package.json .
RUN npm install

FROM public.ecr.aws/docker/library/node:19
COPY --from=build /srv .
ADD . .
ENTRYPOINT ["npm", "run-script", "cdk"]