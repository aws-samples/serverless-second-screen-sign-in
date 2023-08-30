import { Construct } from "constructs";
import { Duration } from "aws-cdk-lib";
import { RemovalPolicy } from "aws-cdk-lib";
import { PolicyStatement, CanonicalUserPrincipal } from "aws-cdk-lib/aws-iam";
import {
  OriginAccessIdentity,
  Distribution,
  SecurityPolicyProtocol,
  AllowedMethods,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { BlockPublicAccess, Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import {execSync} from 'child_process'
import { Stack } from "aws-cdk-lib";
import { AwsCustomResource, PhysicalResourceId } from "aws-cdk-lib/custom-resources";
 
export class WebsiteHosting extends Construct {

  public readonly distributionUrl: string;
  public readonly distribution: Distribution;
  public readonly siteBucket: Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);


    const oai = new OriginAccessIdentity(scope, "cloudfrontOai", {
      comment: `oai for ${id}`,
    });

    this.siteBucket = new Bucket(scope, "siteBucket", {
      bucketName: `second-screen-login-frontend-${Stack.of(this).account}`,
      publicReadAccess: false,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY, // NOT recommended for production code
      autoDeleteObjects: true, // NOT recommended for production code
    });

    // Grant access to cloudfront
    this.siteBucket.addToResourcePolicy(
      new PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [this.siteBucket.arnForObjects("*")],
        principals: [
          new CanonicalUserPrincipal(
            oai.cloudFrontOriginAccessIdentityS3CanonicalUserId
          ),
        ],
      })
    );

    // CloudFront distribution
    this.distribution = new Distribution(this, "siteDistribution", {
      defaultRootObject: "index.html",
      minimumProtocolVersion: SecurityPolicyProtocol.TLS_V1_2_2021,
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: Duration.minutes(30),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
      defaultBehavior: {
        origin: new S3Origin(this.siteBucket, { originAccessIdentity: oai }),
        compress: true,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
    });

    this.distributionUrl = this.distribution.distributionDomainName;  
  }

  deployWebsiteToS3(appApiEndpoint: string, websocketUrl: string, domain: string, authUrl: string, clientId: string, userPoolId:string) { 
    // Build the Webpage.
    execSync(
      `npm install && npm run build --prefix ../frontend`,
    ); 

    const config = `
      window.env = { 
        "apiEndpoint": "${appApiEndpoint}",
        "websocketUrl": "${websocketUrl}",
        "domain": "${domain}",
        "authUrl": "${authUrl}",
        "clientId": "${clientId}",
        "userpoolId": "${userPoolId}"
    }`;
    

    const deployment = new BucketDeployment(this, "deployWithInvalidation", {
      sources: [Source.asset("../frontend/build")],
      destinationBucket: this.siteBucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
    });

    // This exists to deploy inject the environment variables for the front end. 
    // The website imports env.js, which contains the correct values. 
    new AwsCustomResource(this, 'WriteS3ConfigFile', {
      onUpdate: {
        service: 'S3',
        action: 'putObject',
        parameters: {
          Body: config,
          Bucket: this.siteBucket.bucketName,
          Key: 'env.js',
        },
        physicalResourceId: PhysicalResourceId.of(Date.now().toString()),  // always write this file
      },
      policy: {
        statements: [
          new PolicyStatement({
            actions: ['s3:PutObject'],
            resources: [`${this.siteBucket.bucketArn}/env.js`],
         })
        ]
      },
    }).node.addDependency(deployment)
  }
}