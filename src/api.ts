import * as cdk from '@aws-cdk/cdk';
import * as lambda from '@aws-cdk/aws-lambda';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import * as iam from '@aws-cdk/aws-iam';

// TODO: Implement ping/pong

type LambdaIntegrations = 'OnConnect' | 'OnDisconnect' | 'OnPublish' | 'OnSubscribe';

export interface ApiProps {
    lambdaIntegrations: { [integration in LambdaIntegrations]: lambda.Function }
}

export class Api extends cdk.Construct {

    static SUBSCRIBE_MODEL_NAME = "SubscribeModel";

    constructor(scope: cdk.Construct, id: string, props: ApiProps) {

        super(scope, id);

        const api = new apiGateway.CfnApiV2(this, "HiveAPI", {
            name: "Hive",
            protocolType: "WEBSOCKET",
            routeSelectionExpression: "$request.body.action"
        });

        new apiGateway.CfnModelV2(this, "SubscribeModel", {
            apiId: api.apiId,
            name: Api.SUBSCRIBE_MODEL_NAME,
            contentType: 'application/json',
            schema: {
                "$schema": "http://json-schema.org/draft-04/schema#",
                "type": "object",
                "properties": {
                    "action": { "type": "string" },
                    "newSubscriptions": {
                        "type": "array",
                        "items": { "type": "string" }
                    },
                    "replaceExisting": { "type": "boolean" }
                }
            }
        });

        const apiGatewayRole = new iam.Role(this, "LambdaInvocationRole", {
            assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
            inlinePolicies: {
                "LambdaInvocationPolicy": new iam.PolicyDocument().addStatement(
                    new iam.PolicyStatement(iam.PolicyStatementEffect.Allow)
                        .addAction("lambda:InvokeFunction")
                        .addResources(
                            props.lambdaIntegrations.OnConnect.functionArn,
                            props.lambdaIntegrations.OnDisconnect.functionArn,
                            props.lambdaIntegrations.OnPublish.functionArn,
                            props.lambdaIntegrations.OnSubscribe.functionArn
                        )
                )
            }
        });

        // const connectIntegration = new apiGateway.LambdaIntegration(onConnectFunction);
        const connectIntegration = new apiGateway.CfnIntegrationV2(this, "ConnectIntegration", {
            apiId: api.apiId,
            integrationType: apiGateway.IntegrationType.AwsProxy,
            integrationUri: this.createIntegrationUri(props.lambdaIntegrations.OnConnect),
            credentialsArn: apiGatewayRole.roleArn
        });

        const disconnectIntegration = new apiGateway.CfnIntegrationV2(this, "DisconnectIntegration", {
            apiId: api.apiId,
            integrationType: apiGateway.IntegrationType.AwsProxy,
            integrationUri: this.createIntegrationUri(props.lambdaIntegrations.OnDisconnect),
            credentialsArn: apiGatewayRole.roleArn
        });

        const subscribeIntegration = new apiGateway.CfnIntegrationV2(this, "SubscribeIntegration", {
            apiId: api.apiId,
            integrationType: apiGateway.IntegrationType.AwsProxy,
            integrationUri: this.createIntegrationUri(props.lambdaIntegrations.OnSubscribe),
            credentialsArn: apiGatewayRole.roleArn
        });

        const connectRoute = new apiGateway.CfnRouteV2(this, "ConnectRoute", {
            apiId: api.apiId,
            operationName: "ConnectRoute",
            routeKey: "$connect",
            target: `integrations/${connectIntegration.integrationId}`
        });

        const disconnectRoute = new apiGateway.CfnRouteV2(this, "DisconnectRoute", {
            apiId: api.apiId,
            operationName: "DisconnectRoute",
            routeKey: "$disconnect",
            target: `integrations/${disconnectIntegration.integrationId}`
        });

        const subscribeRoute = new apiGateway.CfnRouteV2(this, "SubscribeRoute", {
            apiId: api.apiId,
            operationName: "SubscribeRoute",
            routeKey: "subscribe",
            target: `integrations/${subscribeIntegration.integrationId}`,
            modelSelectionExpression: "$request.body.action",
            requestModels: {
                "subscribe": Api.SUBSCRIBE_MODEL_NAME
            }
        });

        const deployment = new apiGateway.CfnDeploymentV2(this, "Deployment", {
            apiId: api.apiId
        });

        deployment.addDependsOn(connectRoute);
        deployment.addDependsOn(disconnectRoute);
        deployment.addDependsOn(subscribeRoute);

        new apiGateway.CfnStageV2(this, "NonProductionStage", {
            apiId: api.apiId,
            stageName: "Non-Production",
            deploymentId: deployment.deploymentId,
            defaultRouteSettings: {
                detailedMetricsEnabled: true,
                loggingLevel: 'ERROR',
                dataTraceEnabled: true // log full message data
            }
        });

        new apiGateway.CfnStageV2(this, "ProductionStage", {
            apiId: api.apiId,
            stageName: "Production",
            deploymentId: deployment.deploymentId
        });

        // Allow OnPublish lambda to publish to API Gateway connected clients
        props.lambdaIntegrations.OnPublish.addToRolePolicy(
            new iam.PolicyStatement(iam.PolicyStatementEffect.Allow)
                .addAction("execute-api:ManageConnections")
                .addResource(`arn:aws:execute-api:${this.node.stack.region}:*:${api.apiId}`));
    }

    private createIntegrationUri(fn: lambda.Function): string {
        return `arn:aws:apigateway:${this.node.stack.region}:lambda:path/2015-03-31/functions/${fn.functionArn}/invocations`
    }
}