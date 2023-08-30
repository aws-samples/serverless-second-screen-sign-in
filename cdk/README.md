# Second Screen Sign In - How to build and deploy the CDK Application 

This guide will walk you through how to deploy 

 This enhanced authentication method provides a seamless experience for users. The project is written in TypeScript and requires three arguments: email, ses_email_arn, and project_prefix.

Follow the steps below to deploy the project:

### Prerequisites

1. Ensure you have Node.js and npm (Node Package Manager) installed on your machine.

2. Ensure that you have an email registered with SES, note the ARN this will be necessary for the CDK step later.

3. Ensure that the CDK 


### Deployment Steps 

1. First, install the project dependencies. 
```
npm install
``` 

2. Build the project dependencies (Websockets, Frontend, etc)
```
npm run build-dependencies.
```

3. Deploy the CDK using the following commands.
```
cdk synth -- -c email=YOUR_EMAIL -c ses_email_arn=YOUR_SES_EMAIL_ARN -c project_prefix=YOUR_PROJECT_PREFIX
cdk deploy -- -c email=YOUR_EMAIL -c ses_email_arn=YOUR_SES_EMAIL_ARN -c project_prefix=YOUR_PROJECT_PREFIX
```

Replace YOUR_EMAIL, YOUR_SES_EMAIL_ARN, and YOUR_PROJECT_PREFIX. The project prefix can be anything.


## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `cdk deploy`      deploy this stack to your default AWS account/region
* `cdk diff`        compare deployed stack with current state
* `cdk synth`       emits the synthesized CloudFormation template
