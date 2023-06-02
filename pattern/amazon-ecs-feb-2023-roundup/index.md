---
title: Amazon Elastic Container Service February 2023 round up
description: >-
  The latest news and announcements about Amazon Elastic Container Service, for the month of February 2023
filterDimensions:
  - key: type
    value: video
authors:
  - jldeen
  - maishsk
  - peckn
  - sbcoulto
date: Mar 6, 2023
---

Watch the February 2023 Amazon ECS roundup. This monthly segment discusses the latest announcements about Amazon Elastic Container Service.

<youtube id="RTeB7Ho88bg" />

This episode covered the following topics:

- ECS task definition revision deletion
- Increase of provision tasks quota, improving cluster autoscaling
- New default console experience
- ECS Service Connect
- Monitoring the ECS agent
- Configuring KMS encryption at rest on ECR repositories with ECR replication
- ComposeX
- DAPR on ECS

#### Transcript

__Jessica__: Hello, and welcome to another episode of Containers from the Couch. We have the ECS DA's here with us today. And today is a special episode. We're going to be talking about the ECS February Roundup. I have with me... I'll let them each introduce themselves, but we'll start with: Maish, Scott, and Nathan. Let's have the newest member actually kick off and introduce himself. Scott, this is your first time on containers from the couch.

__Scott__: Hi, thanks for having me. Yes, I'm super excited. Little background about myself: I'm a container enthusiast, linux enthusiast, container runtimes are kind of my thing. And container security. So glad to be on the team.

__Jessica__: Awesome. Well, we're happy to have you. And I think everyone knows Nathan, but let's just have a brief recap. Nathan, let's go ahead and have a little intro from you.

__Nathan__: Hey, everyone, my name is Nathan. I've been working with the ECS team for a few years now. Started out as a startup engineer, very focused on application development and realized I like working on that infrastructure. And I like helping people understand how to build infrastructure better and more efficiently. So now I work on the Elastic Container Service team at AWS.

__Jessica__: Awesome. And then Maish, you want to do a brief intro?

__Maish__: Sure. My name is Maish Saidel-Keesing, also developer advocate here on the team. Been around you for a couple of years, two years, pretty much interested in anything containers, mostly enterprise stuff in the containers, so it's good to everybody. And I do want to give Scott the shout out for getting up very early because I don't know if you recognized his accent, he's not from kind of our part of the world, you're from somewhere down under, which is a bit early in the morning. So thank you very much for joining us so early.

__Jessica__: Scott lives in the future. It's already Tuesday, so it's pretty great.

__Scott__: It is.

__Jessica__: We should ask him what's going to happen on Tuesday. I'm just kidding. And everyone, my name is Jessica. I am fairly new to AWS and the ECS team, but I have been on the show before. A little bit about my background is I'm super passionate about containers, about Linux, about open source and DevOps. So I do a little bit in all of those categories. And then of course, like everyone else on the show, I love community and hanging out with everyone who's watching. So huge shout out to everyone who's watching. I'm sure we have people also from all different time zones. Maish, it's also like nighttime where you are. So thank you for coming in late.

__Jessica__: All right, so today we're going to kick it off the roundup with a recap. We had a lot of announcements in February, like a lot of things.

__Nathan__: Yeah. I think we got to start out first and foremost talking about the one that was most requested. Almost 2000 people asking on the container roadmap for task definition deletion. I don't know if you all have seen the GitHub issue got a little heated there. There were some funny comments as well. But yeah, this issue is around for a while, and anyone else want to talk about what this exactly does.

__Jessica__: Scott actually wrote the blog post out on this and the announcement. He has some [handy scripts in the blog post](/ecs-delete-task-definition) as well. So, Scott, why don't you give us a little brief overview of what it is, why it important, and how it kind of came to be.

__Scott:__ Okay, well, how it came to be was kind of before my time, but let's talk about where we are now. So basically what this allows you to do is delete task revisions. So if you have the problem of too many task revisions, or you have a task revision that has secrets stored in it before Secrets Manager came in and you want to clean that up, it will allow you to do so. Basically what you got to do is just get the task revision number that you want to clean up, mark it as inactive, and then use the delete command that's available in the CLA and our SDKS.

__Scott:__ Now, there's a bash script with the blog post if you want to loop through and do things. So it just starts with the first number of the task deletion. So say I want to delete number 15 through 20. You put the task family name, you put number 15, and then you put the last number is 20, and it'll just loop through and mark them as inactive and then delete them for you.

__Jessica:__ That's awesome. Yeah, it's cool because I think when I was reading your blog post, it's just a simple script, right? It's a for loop, and we're just looping over and running the same command. And it shows the power of how you can do things very easily to accomplish. Now, deleting a mass number of revisions, which I'm sure if you've been around ECS and you've been doing this a little bit, it'd be nice to go in and have some cleanup jobs. I think we actually have the blog post right here so we can see what we're talking about. ([Official AWS blog link](https://aws.amazon.com/blogs/containers/announcing-amazon-ecs-task-definition-deletion/))

__Nathan:__  My buddy Mike just did a funny comment on Twitch. Here it says: "Finally we can delete test definitions without needing to delete an entire AWS account."

__Maish:__ Yeah that was a pain point once upon a time.

__Jessica:__ Yeah, now it's a lot simpler. Yes. Now we don't have to worry about different accounts and we're able to just loop through and delete that. And that was a big announcement. Yeah, that was pretty fun.

__Nathan:__ I could provide a little more context on the history of this. I think when we launched ECS, it was a very difficult problem to solve because we knew we wanted to be able to scale to massive sizes. And that involves a little bit more complexity building a system like ECS than it would with something like Kubernetes, because the ECS control plane is not just serving one cluster for one customer at a time, it's actually serving entire region.

__Nathan:__ And in order to do that reliably, it's split into different cells. And so certain resources are distributed across cells in the cellular architecture in a very decentralized way, where there's not really like one source of truth, so to speak. And so it turns into a very complex thing because everybody is using the same control plane and their individual request, and clusters would be distributed to different cells. And then within those cells, you could have different services that are running. You could have standalone tasks that are running off a task definition. So there's all these dependencies on the task definition and understanding where all of those things are being used in such a way that you don't build strong dependencies between cells. So that way there could be an outage in one availability zone and it brings down everything. That's been sort of the biggest challenge in building this.

__Nathan:__ And so you see, we finally sort of implemented this feature here where it's not instantaneous delete. Call it's something that caveat I should call out. Like when you transition a task definition into delete, it'll go into delete in progress. And it can take a little while. I think Scott did some tests on how long it took in some cases.

__Scott:__ It's roughly between 30 to 60 minutes, depending on the load that you pass it. So if you're passing it thousands, it's going to take slightly longer if you're just doing a couple it sits there for about 30 minutes.

__Nathan:__ There's still some we're working to be done there, but basically it's coordinating across all these resources in the region and all these different isolated cells to basically ensure that everything has been cleaned up. There's no more dependencies on that task definition before it then goes ahead and deletes it. So, very interesting, definitely try it out. Let us know what your thoughts are on it and hopefully it helps some folks clean up their accounts and clean out resources they don't want anymore.

__Maish:__ Yeah, and of course, there was also a GitHub issue that we opened up above and beyond the original one to get your feedback on the next steps that we're going to be doing with this. For example, task definition lifecycle, how we're going to implement that in the future. We would really like to hear your feedback on that as well.

__Nathan:__ Yeah, I think that one is super important because if you look at the features we're building, you kind of understand that we're building an understanding of how an ECS task definition is being used by live deployments. Well, the other thing, the other resource that's in there is your actual container image itself. And so traditionally you would build up maybe a library of 1000 different revisions of your task definition going back in time, each one linking to a different container image version that you had uploaded. Well, if we're actually deleting the task definition, how do you know which container images were uploaded, whether they are in use? And so we're trying to understand what folks needs are there in terms of maybe potentially cleaning up container images automatically. Do you want to actually clean out task definitions once they reach a certain age? What your use cases are for cleaning up old resources on your account? So any information you have for us, definitely add that to the container roadmap issues that we're opening on this.

__Jessica:__ Yeah, absolutely. I think when you mentioned lifecycle, lifecycle is really a key thing as well. And so having that tie in where okay, this task definition references this ECR image and having that easy cleanup between life cycle management based on age, based on whatever parameters or requirements you have as a business is definitely helpful in getting insight on how customers would like to see that feature implemented and have it be accessible is super helpful and super valuable.

__Jessica:__ One of the other announcements in addition to task definition was we also had the increase in increase in the number of provisioning tasks quota that allows us to improve the cluster auto scaling. I think, Nathan, you can talk on that.

__Nathan:__ Yeah. So this one is a little tricky to understand, but I can start by explaining how capacity providers work. So when you want to launch containers, you need capacity. The capacity provider needs to have some understanding of just how much capacity is needed to be launched to run the amount of containers that you want to actually start up.

__Nathan:__ So some of our largest customers, if they're doing a fresh deployment or they're rolling the containers in their service, they might have 1000 containerized tasks that need to start up or actually restart. So what we built in there was a state where ECS can launch a task for a virtual task placeholder into a provisioning state and the capacity provider hooks in asynchronously a different process and looks at your service and sees: Oh, I see that there's this many provisioning tasks that are waiting to be launched and there's no capacity to launch them. Therefore, I need to go ahead and start launching some more capacity into the cluster of more EC2 instances. Scale up this ASG to a certain size in order to make room for these tasks to launch.

__Nathan:__ Well, we had initially, due to the way that's implemented, a fairly lower limit, I think it was 300 provisioning tasks at a time. So for folks that had like, let's say 1200 tasks to launch, it would actually only be able to launch 300 tasks at a time. So it has to do around four rounds of launching additional tasks.

__Nathan:__ Well, we increased that now to 500 provisioning tasks at once. And that allows the capacity provider to observe a larger chunk of requested tasks, understand there's more demand for capacity and launch an increased number of EC2 instances at once. So this translates to about, if I remember correctly, about a 20% improvement in the speed of launching additional EC2 instances, for these really large workloads.

__Jessica:__ 20% is a huge increase.

__Nathan:__ We're hoping to get it even higher than that as well. That will be coming later this year, by allowing there to be even more provisioning tasks at once. So we'll keep you updated on that as we have more further announcements on that.

__Jessica:__ Awesome. And then I think another in addition, so we've talked about task definition deletion, cluster auto scaling, and then we also have ECS has announced a new default console experience. And I think actually we did a dedicated episode on this, right?

__Maish:__ Yes, we did. I was actually the one which was hosting. We had one of our PM's Sergey and a lot of who was here also as well, and one of our engineers to explain a deep dive, why we wanted a new console experience, how it is easy for our users. Going to put a link to that in a second in the chat as well. So you can also view it as well. And it we have done a dedicated episode, we're not going to dive into what it is because it's kind of repeating and repeating ourselves. We don't really like to do that. It's just a waste of most people's time. You can watch it on your own, but have a look at that episode, of course, if you want to, please, of course subscribe to the channel, both to the Twitch channel and of course to the YouTube channel as well so you can get future updates in the future and not miss any of our shows.

__Jessica:__ Absolutely, yeah.

__Nathan:__ I do want to call out one thing from that stream that I learned because I didn't even realize this existed and I was working with the console team on the design. But there's this new functional cookie that you can turn on in the ECS console and it will actually remember information about how you want your ECS console to be customized to your needs.

__Nathan:__ So if there's like a particular column in the table that you don't like, you can hide that column and the functional cookie will remember that. And every time I reload the ECS console, I won't see that column. It even persists the column width. So let's say I like to view my screen and my column width at a certain size. It will remember that and it'll restore that same state every time I load up the console. So that was a huge addition to me. The setting was a little bit buried, so I didn't realize it existed, but now I know it existed, it's making my experience so much nicer.

__Jessica:__ That's pretty cool. My first thought though is then be careful in the future and don't delete your cookies or export that cookie and try to recreate. I don't know, try to do something to save that. You get everything tweaked just right and then you're like, oh, I'm going to go through and do some spring cleaning. Dang it.

__Nathan:__ I have to fix everything in my console again.

__Jessica:__ But yeah, that's awesome. Yeah. So definitely check out that episode. We've dropped that in the chat, so if you're watching or streaming from wherever you are, you should be able to go check that out as well. One of the other things we also did an episode on that was a big announcement was we talked about Amazon ECS Service Connect, which was first announced in November at Reinvent.

__Jessica:__ And it's a different way of allowing service to service communication as opposed to more traditional ways with service discovery and DNS based service to service communication. I was trying to figure out a way to not be so redundant, but I actually hosted the episode on that with Alex from the ECN or Elastic Container Networking Team, as well as by Bob who did an amazing demo. We also have a blog post that walks through that, so I know when we again, we're not going to recap and go too deep into the topics because we did already have an episode and we'll have a link for where you can go check that out.

__Jessica:__ But during that particular episode, I know some users wanted to follow along by running some of the code that Vibhav was running. We have a whole blog post that does that in depth with some scripts available for you as well as cloud formation templates. We even have one click deploy buttons and we have a repo there that's based on so we use a Yelb application that was originally written by Massimo Re Fereè and we kind of build on top of that.

__Jessica:__ And there's a repo that's in the blog post that there is a known issue with the one click buttons. Don't worry, we're on it and we are fixing that, but definitely go check that as well. If you're looking for different ways to have your service to service communication in your ECS cluster, you can now check out Service Connect and you can migrate from Service Discovery without having to make any application changes. It's pretty exciting.

__Nathan:__ And with zero downtime!

__Jessica:__ And with zero downtime, yeah, it's pretty exciting. And you can do that in the like we give you a sample app to migrate that Yelb application I mentioned so you can play with it before you go and do it in your own dev test environments and then ultimately production. But we'd also love feedback on that. There's something that you really love. We'd love to hear that. And if there's something that you feel as an opportunity for improvement, we'd really love that as well.

__Jessica:__ I know another announcement that we had in February was the monitoring the Amazon ECS agent. That was a big one as well.

__Nathan:__ Yeah, I thought that someone was really interesting because it's so necessary to know what your infrastructure is doing as an operator. And I thought this was a very creative way to actually monitor it using CloudWatch events. And it walks you through some of the events that you should expect. Like some of the behaviors of ECS agents, such as the fact that it disconnects and reestablishes its connection a few times per hour. If you understand what to expect inside of the events, then you know, okay, this is normal. It doesn't mean I'm losing connectivity. It's the ECS agent does this on purpose to make sure that still has a valid connection to the control plane.

__Jessica:__ Yeah, and I think being able to have that insight, I mean, when I think of again, I mentioned my background is DevOps. And when I think of all the different parts or aspects of DevOps, one of the last ones that people tend to kind of overlook or not consider because we're so quick to wanting to iterate and be agile. Right. But monitoring is super important. And being able to have that insight that monitoring that telemetry helps from both, like a planning, so you can figure out what your next sprint is, but it also helps you to be able to be proactive and figure out, hey, this is something that we should address. Or this is something I wasn't aware was happening. And being able to actually monitor the ECS agent, I think is a pretty huge thing from, again, observation and metrics monitoring perspective.

__Nathan:__ And one of the things in that blog post is actually a CloudFormation template that deploys a rule that hooks into EventBridge where you can start to set up your own conditions for what you want to do when you see a certain event happen. And so some ideas that pop into my mind is, let's say if I'm using, like an ECS Anywhere or I'm using a piece of infrastructure and I see that that agent disconnects. I see that it doesn't reconnect, then maybe I want to send a Slack message or I want to send some alert being like, check the infrastructure. Something is down. Your ECS cluster capacity is not coming back up as expected or disappeared. You need to check to make sure those tasks are still running. You need to make sure that there's not some network connectivity issues stopping the control plane from making sure people talk to your capacity.

__Jessica:__ Conditional, I don't want to say necessarily notifications, but having conditional control over your monitoring is super powerful. You can get really creative with that. Especially like, I'm thinking from a production team sending a Slack message to a particular team that's responsible for that, posting it on some sort of dashboard, whether you're using Grafana, having that insight is super powerful. So that was an awesome announcement to see.

__Jessica:__ I know another one we had was also because we're kind of talking about monitoring, we're talking about telemetry. I'm also thinking of like security and different improvements. And we had configuring KMS encryption at rest on ECR repositories with ECR replication also announced. And we have a blog post on that by Sam and Joe that was another big announcement.

__Maish:__ So of course, security in this case, of course security, of course, is always what we call job zero at AWS. And yes, if you can encrypt something wherever you can, the better it is. And of course encryption at rest secures your data on the cloud itself. You can encrypt it with your own private keys if you would like, or you bring your own keys in order to encrypt it, not with the default keys which we provide you, which enhances your security posture as well.

__Maish:__ And the most important thing, of course, encryption address doesn't incur any kind of performance penalty at all. This is pretty much transparent. So there is absolutely no reason why you shouldn't do this just to enhance your security posture, make your data in the cloud a lot more secure and keep yourselves away from bad guys, as we call it.

__Jessica:__ Right? Absolutely. And you can do that with ECR replication as well, which I think is pretty awesome. And they walk you through how you can configure that and how to get started in the blog post. But I think you said something that was really powerful. Obviously, security is always job zero on day zero. It's the first thing we think of here at AWS. But I think it's also important because I feel like the industry is finally starting to shift and realize like, hey, security needs to be the first thought, not the last thought after we have everything done.

__Jessica:__ And this really kind of helps us put it like before your application is ever deployed. Once you have your image, you can focus on having security right from the very beginning and making sure that the image you're using is yours, that you're encrypting it with your key and you have complete control over that. That's really powerful.

__Jessica:__ Any other fun announcements that we wanted to touch on while we have everyone here? Things that anyone on the team was super excited about?

__Nathan:__ There was something actually... we had our community meeting with some of the community builders actually last. And I learned about some updates to an ECS tool that has been built called [ECS ComposeX](https://docs.compose-x.io/). So a fun project from community member John Preston. He's built this tool that basically allows you to take your Dockercompose file and deploy it to ECS by turning it into a conversion between Docker Compose and Cloudformation and then Cloudformation to deploying on ECS.

__Nathan:__ And so there's a ton of great features built in here. It's actually very full featured tool. A lot of times things start out as sort of I built internally for myself and it has just the features that I need from my own tool. But he's been on this one for a few years now and it's become quite full featured in terms of logging, scaling, monitoring, Prometheus, Firelens support, alarms. So I've been very impressed and wanted to give it a shout out here. Definitely check this out. If you're using Docker Compose locally and you want to have a little bit of help figuring out how to turn it into a Cloudformation template to deploy to the cloud, ECS ComposeX can help you out.

__Jessica:__ That's a pretty exciting tool. I know. For me. Like I said, I'm new to ECS. I'm new to AWS. I came from a different cloud provider. So trying to understand how to do containers and specifically working with ECS as a container orchestrator through Cloudformation or CDK, there's a little bit of a learning curve there, right? And being able to take something that I feel like is pretty industry standard, if you're already using Docker and Docker Compose, I have 34 docker containers running at home with my various Compose files.

__Jessica:__ Being able to take that and quickly figure out how to get that into CFN and then read what I already am familiar with, read that over in CFN. It kind of helps create that little link where I'm understanding the connection. Being able to have a community driven tool, and I see here it actually already has ten forks and 83 stars. Being able to have something that's community driven to simplify that experience is super awesome.

__Nathan:__ And even just to play around with a feature that you haven't used yet, sometimes figuring out the Cloudformation from scratch is a little bit challenging.

__Jessica:__ Yeah, but if you have something that can spit out some Cloudformation that maybe isn't perfect right, for your use case, but it gives you something to start with, which is better than trying to write everything from scratch yourself. I especially like tools that can give you a little jump start there, and then you can take over and build your own tool or start hand rolling your own templates and things later on.

__Jessica:__ Absolutely. Yeah. "AgileGuru" says that this is a godsend, especially for DevOps pipelines. My background, like I said, DevOps, whether it's Jenkins, whether it's GitHub actions, whether it's Travis CI, I mean, you name it, I've done it. And I agree, being able I'm a huge proponent of having your IAC as part of your pipeline, too, just from disaster recovery perspective, right? If I deploy something, I don't want to get all the way to the end of production and then something's somehow fallen over, been deleted. And being able to have an easy way to have that, IAC included and being able to create that, especially like you said, it might not be perfect, but it gives me that boilerplate, that starting spot that I can then tweak it and refine it for my specific needs and for my workflow or pipeline. That's super awesome.

__Jessica:__ And I also want to shout out that community project just because usually when you do start those community driven projects they're done as passion projects, right? They're not doing it because they work for AWS or ECS. They're doing it because they're trying to simplify and share it with the community. And I think that's also awesome. That's a great example of teamwork and wanting to help simplify and build on the work of others looking right now.

__Maish:__ And for those who are not aware with what community builders are, by the way, there's a program which we have which was open sorry, for subscription and registration and actually closed not so long ago. There's a whole new set of community builders. It's people which are interested in building on AWS. It's a program which you can sign up for if you're accepted based on I'm not 100% sure exactly what the criteria are, forgive me. But it is a program community builders look for AWS. It opens up as a regular enrollment period every now and again. Think twice a year if you are interested and actively involved in building applications and solutions on AWS. So please definitely think of signing up for that for sure.

__Jessica:__ Yeah. That's awesome. And I see that we're actually getting quite a bit of feedback and comments. Do see one comment here. Any movements to support Dapr on ECS? Or is it on the Dapr team side?

__Nathan:__ I was actually just looking into that right now. So DAPR is distributed.... What's the stand for again?

__Jessica:__ Distributed application. Something runtime?

__Nathan:__ Yeah. So basically it's a framework for building microservices and providing you a little jump start for essentially doing the RPC from one service to another. So technically there's nothing that stops Dapr from working on top of ECS. It's just that we need some better examples out there. And I searched through the issues and there's people talking about getting it working on top of ECS. It requires a little bit of configuration on the ECS side, like getting the Service Discovery figured out. Maybe Service Connect is going to make that easier now, but technically it looks like this framework should be able to work inside ECS just like it can work inside other orchestrators as well. We don't have any examples at this time though, that I've seen. Maybe somebody has made a quick start for it for ECS at some point that I'm just missing, but that's a good thing for us to look into and see if we can make that a little bit easier.

__Jessica:__ Dapr came out of a project actually at Microsoft as an incubation project there. And I'm familiar with actually the Dapr team and I've spoken at DaprCon. How to get started with that in production from a Kubernetes perspective. And I love the Dapr team, so I'm happy to kind of play around with that and see what's needed for ECS, because that sounds like a fun project. Definitely service connect that simplifies that. And if there is something I know Eugene had asked if there's something required on the Dapr team side to enhance that. I can absolutely help with that conversation. Cool. Make that work. Because I know, I mean, Dapr right now, it works everywhere. The nice thing about Dapr is it's a set of building blocks that simplifies that dev experience, and you can use it even on bare metal, on cloud, it doesn't require any extra work. And from a developer perspective, it does streamline the amount of code you would have to write to be able to handle if you're using Redis locally, but you want to use Redis in the cloud, you could just simply pop that out because it's a configuration file change and without having to make any application code changes, you now have it ready for the cloud. And so from a developer perspective, it's definitely a very powerful tool in your building. microservices toolbox.

__Nathan:__ Well, it sounds like you just volunteered yourself for that.

__Jessica:__ I did. Scott has some comments on that, too, because we worked on that together.

__Scott:__ Yes. That's definitely on you. That's all I'm saying.

__Jessica:__ Okay, I will take that action item. That'll be fun. This is a fun hangout. It's not very often that everyone on the ECS team gets to hang out all together.

__Maish:__ Sit on the same four blocks on the screen.

__Jessica:__ Yeah, we're on the same couch. Proverbly like we would be in the same room. Even the people live in the future. Actually, I just realized everyone on this call other than me lives in some form of the future because Nathan's East Coast. Mace, you're in Israel. Scott, you're in Australia, and I'm in California. So all of you are ahead of me. Okay. Pretty great.

__Maish:__ The world's still here. Don't worry.

__Jessica:__ The world is okay. Perfect.

__Nathan:__ As far as I can tell.

__Jessica:__ Yeah, good to know.

__Scott:__ Tuesday is pretty good.

__Jessica:__ Tuesday is pretty good. All right, I'll keep that in mind. All right, is there anything else that we didn't cover? Maish, Nathan, any final community questions that you all have that we can answer? We're already all here, so you might as well bring it on.

__Jessica:__ I see something: [12factor.net](https://12factor.net/), I'm not quite sure what that is.

__Maish:__ That's probably from the 12 factor application framework of building modern applications, if I remember correctly.

__Jessica:__ that's the first I'm seeing, makes a lot of sense. I'm looking at it. They have their twelve factors in Roman numerals. Perfect.

__Nathan:__ This is the authoritative manifesto on how to build in a twelve factor style.

__Jessica:__ Makes a lot of sense. All right, well, I think we've covered a lot just to kind of have a brief recap. There's been a lot of announcements and we're just in barely the first week of March in 2023. So finally tackling the task deletion, cluster auto scaling improvements, new console experience improvement to service to service communication. Now we're going to enhance that with some DAPR examples. ECS agent monitoring security, being able to do encryption with KMS on your ECR.

__Jessica:__ We do have a question from Mike, and this, I feel like, may be a Maish question. "When will ECS everywhere launch?"

__Maish:__ Well, ECS runs everywhere at the moment, anywhere you like. That's what ECS Anywhere is for. But we're not rebranding to ECS Everywhere because, we're not. But you can pretty much run ECS anywhere, wherever you would like, be it on-prem, in the cloud as EC2 instances, in other people's clouds as well, which I've done a couple of times for demo purposes, not in the AWS clouds, just to show that it works. But yes, you can run ECS anywhere. Anywhere you would like. So we pretty much cover that one, I think.

__Nathan:__ So as some point, we need to make little mini sites like here's, all the places ECS runs and have some pictures of robots and all kind of cool chips, point of sale pieces, some other vendors clouds.

__Jessica:__ Yeah, that can also be fun. That would be awesome. Yeah. Well, we've made Mike a little sad. He wants everywhere, but I feel like anywhere/everywhere that gets into semantics and grammar. Basically the same thing. All right, so we're just going to, I guess, close up here a little bit. Again, on any of these announcements that we've made, if there's any thoughts, comments, suggestions, improvements, please find a way to get in touch with any of us. All of us.

__Jessica:__ Our handles on Twitter are on the screen here, and we'd love to be able to have that conversation with you. Take that feedback back to the product team.

__Jessica:__ And we also have links to everything, so you can check out the blog posts, the repos that are associated with all the blog posts. And again, also, please don't forget, this is a community effort, so please contribute whether that's ideas, suggestions, positive feedback, we love it all. Also not to get the feedback, we love it all as well. Also negative feedback.

Great. Thank you very much. All right, thank you everyone, until next time. Thanks very much. Bye. 