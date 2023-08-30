import { AttributeType, Table, ProjectionType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from "constructs";

export class DynamoDBTable extends Construct {

    readonly table: Table;
    readonly tableName: string;  

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const tableName = "connectionLoginCodes";

        const table = new Table(scope, `${tableName}Table`, {
            tableName: tableName,
            partitionKey: {
                name: "loginCode",
                type: AttributeType.STRING,
            },
            removalPolicy: RemovalPolicy.DESTROY,
            timeToLiveAttribute: 'ttl',
            billingMode: BillingMode.PAY_PER_REQUEST,
        });

        table.addGlobalSecondaryIndex({
            indexName: "connectionIdIdx",
            partitionKey: {
                name: "connectionId",
                type: AttributeType.STRING
            },
            
            projectionType: ProjectionType.ALL,
        })

        this.table = table;
        this.tableName = tableName;
    }
    
}