FROM public.ecr.aws/docker/library/busybox

# Create a non-root user to own the files and run our server
RUN adduser -D static
USER static
WORKDIR /home/static

RUN echo "Healthy" > index.html && \
    mkdir service-two && \
    echo "Hello from service two" > service-two/index.html

# Run BusyBox httpd
CMD ["busybox", "httpd", "-f", "-v", "-p", "8080"]