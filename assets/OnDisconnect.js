var AWS = require("aws-sdk");

AWS.config.update({ region: process.env.AWS_REGION });

var DDB = new AWS.DynamoDB({ apiVersion: "2012-10-08" });

exports.handler = function (event, context, callback) {
    var deleteParams = {
        TableName: process.env.TABLE_NAME,
        Key: {
            key1: { S: `connection-${event.requestContext.connectionId}` },
            key2: { S: `connection` }
        }
    };

    // TODO: Delete any associated subscriptions

    DDB.deleteItem(deleteParams, function (err) {
        callback(null, {
            statusCode: err ? 500 : 200,
            body: err ? "Failed to disconnect: " + JSON.stringify(err) : "Disconnected."
        });
    });
};