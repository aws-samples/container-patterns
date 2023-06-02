#!/bin/bash -ex

TASKNAME=<task name>
START=1 # the first number of the task revision to loop through
END=1000 # The last number to stop the delete loop at

# This function will deregister the task definition
for (( x=$START; x<=$END; x++ ))
do
        aws ecs deregister-task-definition --task-definition $TASKNAME:$x --no-cli-pager
        sleep 5
        echo "The task $TASKNAME and revision $x has been deregistered"
done

# This function will delete the task definition
for (( y=$START; y<=$END; y++ ))
do
        aws ecs delete-task-definitions --task-definitions $TASKNAME:$y --no-cli-pager
        sleep 5
        echo "The task $TASKNAME and revision $y has been deleted"
done