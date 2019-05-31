var AWS = require("aws-sdk");

AWS.config.update({ region: process.env.AWS_REGION });

var DDB = new AWS.DynamoDB({ apiVersion: "2012-10-08" });

exports.handler = function (event, context, callback) {
    var putParams = {
        TableName: process.env.TABLE_NAME,
        Item: {
            key1: { S: `connection-${event.requestContext.connectionId}` },
            key2: { S: `connection` },
            connectionEstablished: { S: new Date().toISOString() },
            // ttl: { N: (new Date() + 30).valueOf() }
        }
    };

    DDB.putItem(putParams, function (err) {
        callback(null, {
            statusCode: err ? 500 : 200,
            body: err ? "Failed to connect: " + JSON.stringify(err) : "Connected."
        });
    });
};