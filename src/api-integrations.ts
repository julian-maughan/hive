import * as cdk from '@aws-cdk/cdk';
import * as lambda from '@aws-cdk/aws-lambda';
import * as iam from '@aws-cdk/aws-iam';

interface ApiIntegrationsProps {
    tableName: string
}

export class ApiIntegrations extends cdk.Construct {

    readonly onConnectFunction: lambda.Function;
    readonly onDisconnectFunction: lambda.Function;
    readonly onPublishFunction: lambda.Function;
    readonly onSubscribeFunction: lambda.Function;

    constructor(scope: cdk.Construct, id: string, props: ApiIntegrationsProps) {

        super(scope, id);

        this.onConnectFunction = new lambda.Function(this, "OnConnectFunction", {
            description: "Handle websocket connection",
            runtime: lambda.Runtime.NodeJS10x,
            code: new lambda.AssetCode("assets"),
            handler: "OnConnect.handler",
            environment: {
                "TABLE_NAME": props.tableName
            }
        });

        this.onDisconnectFunction = new lambda.Function(this, "OnDisconnectFunction", {
            description: "Handle websocket disconnection",
            runtime: lambda.Runtime.NodeJS10x,
            code: new lambda.AssetCode("assets"),
            handler: "OnDisconnect.handler",
            environment: {
                "TABLE_NAME": props.tableName
            }
        });

        this.onSubscribeFunction = new lambda.Function(this, "OnSubscribeFunction", {
            description: "Allow clients to subscribe to topics they are interested in",
            runtime: lambda.Runtime.NodeJS10x,
            code: new lambda.AssetCode("assets"),
            handler: "OnSubscribe.handler",
            environment: {
                "TABLE_NAME": props.tableName,
                "DEFAULT_TTL": "3600000" // 1 hour
            }
        });

        this.onPublishFunction = new lambda.Function(this, "OnPublishFunction", {
            description: "Publish messages to websocket-connected clients",
            runtime: lambda.Runtime.NodeJS10x,
            code: new lambda.AssetCode("assets"),
            handler: "OnPublish.handler",
            environment: {
                "TABLE_NAME": props.tableName
            }
        });

        // const lambdaRole = new iam.Role(this, "LambdaRole", {
        //   assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        //   inlinePolicies: {
        //     "DynamoDbAccessPolicy": new iam.PolicyDocument().addStatement(
        //       new iam.PolicyStatement(iam.PolicyStatementEffect.Allow)
        //         .addAction("dynamodb:*")
        //         .addResources(
        //           table.tableArn
        //         ))
        //   }
        // });
    }
}
