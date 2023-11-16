"use strict";
const pulumi = require("@pulumi/pulumi");
const aws = require("@pulumi/aws");
const awsx = require("@pulumi/awsx");

// Create an AWS resource (S3 Bucket)
//const bucket = new aws.s3.Bucket("my-bucket");
// Export the name of the bucket
//exports.bucketName = bucket.id;


// Create a new Pulumi stack for your AWS resources.
//const stack = new pulumi.Stack();
let config = new pulumi.Config();

const cidr_block = config.require("cidr_block");
const desired_subnets = config.require("desired_subnets");
const destination_cidr_block = config.require("destination_cidr_block");
const amiid = config.require("amiid");
const localhostport = config.require("localhostport");
const postgresportnumber = config.require("postgresportnumber");
const env_path = config.require("ENV_FILE_PATH");

const tcpprotocol = config.require("tcpprotocol");
const port0 = config.require("port0");
const port22 = config.require("port22");
const port80 = config.require("port80");
const port443 = config.require("port443");

const rdsparamsengine = config.require("rdsparamsengine");
const rdsparamsname = config.require("rdsparamsname");
const rdsparamsvalue = config.require("rdsparamsvalue");
const rdsparamsAM = config.require("rdsparamsAM");

const rdsstoragetype = config.require("rdsstoragetype");
const rdsengine = config.require("rdsengine");
const rdsinstanceClass = config.require("rdsinstanceClass");
const rdsidentifier = config.require("rdsidentifier");
const rdsusername = config.require("rdsusername");
const rdspassword = config.require("rdspassword");
const rdsdbname = config.require("rdsdbname");

const ec2instancetype = config.require("ec2instancetype");
const ec2RBVS = config.require("ec2RBVS");
const ec2RBVT = config.require("ec2RBVT");

const ebsRBVS = config.require("ebsRBVS");
const ebsRBVT = config.require("ebsRBVT");
const ebsVA = config.require("ebsVA");

const cwrassumeaction = config.require("cwrassumeaction");
const cwrassumeeffect = config.require("cwrassumeeffect");
const cwrassumeservice = config.require("cwrassumeservice");
const cloudwatchfullaccess = config.require("cloudwatchfullaccess");
const cloudwatchagentserver = config.require("cloudwatchagentserver");
const arecordzone = config.require("arecordzone");
const arecordtype = config.require("arecordtype");
const arecordttl = config.require("arecordttl");

const loadbalancertype = config.require("loadbalancertype");
const targetgrouptargettype = config.require("targetgrouptargettype");
const httpprotocol = config.require("httpprotocol");
const targetgrouppath = config.require("targetgrouppath");
const healthythreshold = config.require("healthythreshold");
const unhealthythreshold = config.require("unhealthythreshold");
const maxsize = config.require("maxsize");
const targetgrouptimeout = config.require("targetgrouptimeout");
const targetgroupinterval = config.require("targetgroupinterval");
const adjustmenttype = config.require("adjustmenttype");
const cooldown = config.require("cooldown");
const cpualarmhighthreshold = config.require("cpualarmhighthreshold");
const cpualarmlowthreshold = config.require("cpualarmlowthreshold");
const listenertype = config.require("listenertype");
const scaleuppolicyadjustment = config.require("scaleuppolicyadjustment");
const scaledownpolicyadjustment = config.require("scaledownpolicyadjustment");


let awsConfig = new pulumi.Config("aws");
let awsRegion = awsConfig.require("region");
console.log(cidr_block, desired_subnets, destination_cidr_block);

// Assignment 4 : 
// Step 1: Create a Virtual Private Cloud (VPC).
const vpc = new aws.ec2.Vpc('myVpc', {
    cidrBlock: cidr_block,
    tags: {
        Name: 'my-vpc',
    }
});
// Step 2: Create subnets (3 public and 3 private in different AZs).
let finalListOfAvailabilityZones = [];
let availabilityZones = [];
const subnets = [];
const availabilityZones1 = pulumi.output(aws.getAvailabilityZones({ state: "available", region: awsRegion }));

availabilityZones1.apply(azs => {
    pulumi.log.info(`Availability Zones in ${awsRegion}: ${JSON.stringify(azs.names)}`);
    finalListOfAvailabilityZones = azs.names;
    pulumi.log.info(`Availability used in finalListOfAvailabilityZones from ${awsRegion} are: ${finalListOfAvailabilityZones}, no.of items being : ${finalListOfAvailabilityZones.length}`);

    const numberOfItemsToCopy = Math.min(desired_subnets, finalListOfAvailabilityZones.length);
    for (const item of finalListOfAvailabilityZones.slice(0, numberOfItemsToCopy)) {
        availabilityZones.push(item);
    }
    pulumi.log.info(`Availability used in availabilityZones from ${awsRegion} are: ${availabilityZones}`);


    for (let index = 0; index < availabilityZones.length * 2; index++) {
        const isPublic = index < availabilityZones.length; // First 3 are public, next 3 are private
        const azIndex = index % availabilityZones.length; // Rotate through the AZs

        const subnetName = isPublic ? `public-subnet-${availabilityZones[azIndex]}` : `private-subnet-${availabilityZones[azIndex]}`;
        const subnet = new aws.ec2.Subnet(subnetName, {
            vpcId: vpc.id,
            cidrBlock: `10.0.${index + 1}.0/24`,
            availabilityZone: availabilityZones[azIndex],
            mapPublicIpOnLaunch: isPublic,
            tags: {
                Name: `my-subnet-${index}`,
            }
        });

        subnets.push(subnet);
    }
    pulumi.log.info(`Subnets created from subnets list in ${awsRegion} are: ${subnets}`);
    // Step 3: Create an Internet Gateway and attach it to the VPC.
    const internetGateway = new aws.ec2.InternetGateway('myInternetGateway', {
        vpcId: vpc.id,
        tags: {
            Name: 'my-internet-gateway',
        }
    });

    // Step 4: Create a public route table and attach public subnets to it.
    const publicRouteTable = new aws.ec2.RouteTable('publicRouteTable', {
        vpcId: vpc.id,
        tags: {
            Name: 'my-public-route-table',
        }
    });

    subnets.slice(0, subnets.length / 2).forEach((subnet, index) => {
        const routeName = `public-route-${index}`;

        const routeAssocName = `public-route-table-assoc-${index}`;
        new aws.ec2.Route(routeName, {
            routeTableId: publicRouteTable.id,
            destinationCidrBlock: destination_cidr_block,
            gatewayId: internetGateway.id,
        });
        new aws.ec2.RouteTableAssociation(routeAssocName, {
            subnetId: subnet.id,
            routeTableId: publicRouteTable.id,
        });

        // new aws.ec2.Route('publicRouteToInternet', {
        //     routeTableId: publicRouteTable.id,
        //     destinationCidrBlock: '0.0.0.0/0',
        //     gatewayId: internetGateway.id,
        // });


    });


    // Step 5: Create a private route table and attach private subnets to it.
    const privateRouteTable = new aws.ec2.RouteTable('privateRouteTable', {
        vpcId: vpc.id,
        tags: {
            Name: 'my-private-route-table',
        }
    });

    subnets.slice(subnets.length / 2).forEach((subnet, index) => {
        const routeAssocName = `private-route-table-assoc-${index}`;

        new aws.ec2.RouteTableAssociation(routeAssocName, {
            subnetId: subnet.id,
            routeTableId: privateRouteTable.id,
        });
    });

    // Step 6: Create a public route in the public route table.
    new aws.ec2.Route('publicRouteToInternet', {
        routeTableId: publicRouteTable.id,
        destinationCidrBlock: destination_cidr_block,
        gatewayId: internetGateway.id,
    });



    // Assignment 5 addons : 


    // Adding Assignment 8 addon here to create load balancer security group. We use the ports below to update
    // the application sec group ports.
    // REQUIRED TO BE HERE SO to resolve REFERENCE error in application ec2 sec group.
    const lbSecGrp = new aws.ec2.SecurityGroup("loadBalancerSecurityGroup", {
        vpcId: vpc.id,
        description: "Load Balancer Security Group",
        ingress: [
            {
                protocol: tcpprotocol, fromPort: port80, toPort: port80,
                cidrBlocks: [destination_cidr_block]
            },
            {
                protocol: tcpprotocol, fromPort: port443, toPort: port443,
                cidrBlocks: [destination_cidr_block]
            }
        ],
        egress: [
            { protocol: "-1", fromPort: port0, toPort: port0, cidrBlocks: [destination_cidr_block] }
        ],
        tags: {
            Name: "load-balancer-security-group",
        },
    });

    // Create a new security group for your web application instances
    const applicationSecurityGroup = new aws.ec2.SecurityGroup("applicationSecurityGroup", {
        description: "Security group for iac-pulumi-webapp",
        vpcId: vpc.id, // Replace with your VPC ID
        tags: {
            Name: "application-security-group",
        },
        ingress: [
            {
                protocol: tcpprotocol,
                fromPort: port22,
                toPort: port22,
                //cidrBlocks: [destination_cidr_block], // Open SSH access from anywhere (insecure, for demonstration only)
                securityGroups: [lbSecGrp.id]
            },
            {
                protocol: tcpprotocol,
                fromPort: localhostport, // Replace with your application's port
                toPort: localhostport, // Replace with your application's port
                //cidrBlocks: [destination_cidr_block], // Open access to your application port from anywhere (insecure, for demonstration only)
                securityGroups: [lbSecGrp.id]
            },
        ],
        egress: [
            {
                protocol: "-1",
                fromPort: port0,
                toPort: port0,
                cidrBlocks: [destination_cidr_block],
            },
        ],
    });

    // EC2, EBS, and Volume attachment added to end of code, as RDS instance for Assignment 6 
    // had to be added as well.

    // Assignment 6, RDS instance
    // Create a security group for the RDS instances
    const dbSecurityGroup = new aws.ec2.SecurityGroup("database-security-group", {
        description: "Database Security Group",
        vpcId: vpc.id,
        tags: {
            Name: "DB-security-group",
        },
        ingress: [
            {
                protocol: tcpprotocol,
                fromPort: postgresportnumber,
                toPort: postgresportnumber,
                securityGroups: [applicationSecurityGroup.id],
            },
        ],
        // Restrict all outbound traffic (optional, but for completeness):
        egress: [
            {
                protocol: "-1", // means all
                fromPort: port0,
                toPort: port0,
                cidrBlocks: [destination_cidr_block],
            },
        ]

    });



    // RDS Parameter group 
    const dbParameterGroup = new aws.rds.ParameterGroup("database-parameter-group", {
        family: rdsparamsengine,  // Change this to match your DB engine and version
        description: "Custom Parameter Group for RDS",
        parameters: [
            {
                name: rdsparamsname,
                value: rdsparamsvalue,
                applyMethod: rdsparamsAM
            },
            // // Add more parameters as needed
        ],
        tags: {
            Name: "my-rds-parameter-group",
        },
    });

    // RDS Subnet group for Private subnets.

    const rdsSubnetGroup = new aws.rds.SubnetGroup("myrdssubnetgroup", {
        subnetIds: subnets.slice(subnets.length / 2),
        description: "Subnet group for RDS instances",
        tags: {
            Name: "my-rds-subnet-group",
        },
    });

    // Create an RDS Instance
    const rdsInstance = new aws.rds.Instance("rds-instance", {
        allocatedStorage: 20,
        storageType: rdsstoragetype,
        engine: rdsengine,
        instanceClass: rdsinstanceClass,
        multiAz: false,
        identifier: rdsidentifier,
        username: rdsusername,
        password: rdspassword,
        skipFinalSnapshot: true,
        vpcSecurityGroupIds: [dbSecurityGroup.id],
        dbSubnetGroupName: rdsSubnetGroup,
        publiclyAccessible: false,
        dbName: rdsdbname,
        parameterGroupName: dbParameterGroup.name,
        applyImmediately: true,
        tags: {
            Name: "my-rds-instance",
        },
    });
    // Output the RDS instance endpoint for use in EC2 User Data
    const rdsInstanceEndpoint = rdsInstance.endpoint.apply(endpoint => endpoint.split(":")[0]);;
    const rdsInstanceUserName = rdsInstance.username;
    const rdsInstancePassword = rdsInstance.password;
    const rdsInstancedbName = rdsInstance.dbName;
    const rdsInstanceDialect = rdsInstance.engine;

    const ec2UserData = pulumi.interpolate`#!/bin/bash
echo "DB_HOST=${rdsInstanceEndpoint}" > /opt/csye6225/webapp/.env
echo "DB_NAME=${rdsInstancedbName}" >> /opt/csye6225/webapp/.env
echo "DB_USER=${rdsInstanceUserName}" >> /opt/csye6225/webapp/.env
echo "DB_PASS=${rdsInstancePassword}" >> /opt/csye6225/webapp/.env
echo "DB_DIALECT=${rdsInstanceDialect}" >> /opt/csye6225/webapp/.env

sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/csye6225/webapp/cloudwatch-config.json \
    -s


sudo systemctl restart web-app
`;

    // Assignment 7 addons :
    // Ec2 IAM role for using CloudWatch
    const ec2CloudWatchRole = new aws.iam.Role("EC2CloudWatchRole", {
        assumeRolePolicy: {
            Version: "2012-10-17",
            Statement: [
                {
                    Action: cwrassumeaction,
                    Effect: cwrassumeeffect,
                    Principal: {
                        Service: cwrassumeservice,
                    },
                },
            ],
        },
        tags: {
            Name: "my-ec2-cloudwatch-role",
        },
    });
    const cloudWatchFullAccessPolicy = new aws.iam.PolicyAttachment("CloudWatchFullAccessPolicy", {
        policyArn: cloudwatchfullaccess,
        roles: [ec2CloudWatchRole.name],
    });
    const cloudWatchAgentPolicy = new aws.iam.PolicyAttachment("CloudWatchAgentPolicy", {
        policyArn: cloudwatchagentserver,
        roles: [ec2CloudWatchRole.name],
    });
    const ec2CWinstanceProfile = new aws.iam.InstanceProfile("my-ec2CW-instance-profile", {
        role: ec2CloudWatchRole.name,
    });

    // Create an EC2 instance    
    // Retrieve an existing AWS key pair by its name
    const existingKeyPair = aws.ec2.KeyPair.get("my-existing-key-pair", "1");

    const existingKeyName = existingKeyPair.keyName;

    // Assignment 8 addons : 
    // EC2 ASG Launch template
    let user_data_encoded = ec2UserData.apply(script => {
        return Buffer.from(script).toString('base64');
    });
    const launchTemplate = new aws.ec2.LaunchTemplate("asg-launch-template", {
        blockDeviceMappings: [{
            deviceName: "/dev/xvda",
            ebs: {
                deleteOnTermination: true,
                volumeSize: ec2RBVS,
                volumeType: ec2RBVT,
                encrypted: true,
            },
        }],
        imageId: amiid,
        instanceType: ec2instancetype,
        keyName: existingKeyName,
        userData: user_data_encoded,
        disableApiTermination: false,
        iamInstanceProfile: {
            name: ec2CWinstanceProfile.name,
        },
        monitoring: {
            enabled: true,
        },
        networkInterfaces: [{
            associatePublicIpAddress: true,
            securityGroups: [applicationSecurityGroup.id],
            subnetId: subnets.slice(0, subnets.length / 2).id,
            deleteOnTermination: true,
        }],
        opts: {
            dependsOn: [rdsInstance],
        },
    });


    // Create an AWS Application Load Balancer
    const lb = new aws.lb.LoadBalancer("lb", {
        name: "csye6225-lb",
        internal: false,
        loadBalancerType: loadbalancertype,
        securityGroups: [lbSecGrp.id],
        subnets: pulumi.output(subnets.slice(0, subnets.length / 2)).apply(subnets => subnets.map(subnet => subnet.id)),
        tags: {
            Application: "webapp",
        },
    });
    // Create an AWS Target Group
    const targetGroup = new aws.lb.TargetGroup("target_group", {
        name: "csye6225-lb-alb-tg",
        port: localhostport,
        targetType: targetgrouptargettype,
        protocol: httpprotocol,
        vpcId: vpc.id,
        healthCheck: {
            healthyThreshold: healthythreshold,
            unhealthyThreshold: unhealthythreshold,
            timeout: targetgrouptimeout,
            interval: targetgroupinterval,
            path: targetgrouppath,
        },
    });
    // Create an AWS Listener for the Load Balancer
    const listener = new aws.lb.Listener("front_end", {
        loadBalancerArn: lb.arn,
        port: port80,
        protocol: httpprotocol,
        defaultActions: [{
            type: listenertype,
            targetGroupArn: targetGroup.arn,
        }],
    });
    // Create an AWS ASG for the Load Balancer
    const autoScalingGroup = new aws.autoscaling.Group("autoScalingGroup", {
        vpcZoneIdentifiers: pulumi.output(subnets.slice(0, subnets.length / 2)).apply(ids => ids || []),
        maxSize: maxsize,
        minSize: 1,
        forceDelete: true,
        defaultCooldown: cooldown,
        launchTemplate: {
            id: launchTemplate.id,
            version: "$Latest",
        },
        targetGroupArns: [targetGroup.arn]
    });

    // Creating scaling policies.
    const scaleUpPolicy = new aws.autoscaling.Policy("scaleUpPolicy", {
        name: "scale_up_policy",
        scalingAdjustment: scaleuppolicyadjustment,
        adjustmentType: adjustmenttype,
        cooldown: cooldown,
        autoscalingGroupName: autoScalingGroup.name,

    });

    const scaleDownPolicy = new aws.autoscaling.Policy("scaleDownPolicy", {
        name: "scale_down_policy",
        scalingAdjustment: scaledownpolicyadjustment,
        adjustmentType: adjustmenttype,
        cooldown: cooldown,
        autoscalingGroupName: autoScalingGroup.name,
    });

    const demoArecord = new aws.route53.Record("aRecord", {
        zoneId: arecordzone,
        name: "",
        type: arecordtype,
        aliases: [{
            name: lb.dnsName,
            zoneId: lb.zoneId,
            evaluateTargetHealth: true,
        }],
    });

    const cpuUtilizationAlarmHigh = new aws.cloudwatch.MetricAlarm(
        "cpuUtilizationAlarmHigh",
        {
            comparisonOperator: "GreaterThanThreshold",
            evaluationPeriods: 1,
            metricName: "CPUUtilization",
            namespace: "AWS/EC2",
            period: cooldown,
            threshold: cpualarmhighthreshold,
            statistic: "Average",
            alarmActions: [scaleUpPolicy.arn],
            dimensions: { AutoScalingGroupName: autoScalingGroup.name },
        }
    );

    const cpuUtilizationAlarmLow = new aws.cloudwatch.MetricAlarm(
        "cpuUtilizationAlarmLow",
        {
            comparisonOperator: "LessThanThreshold",
            evaluationPeriods: 1,
            metricName: "CPUUtilization",
            namespace: "AWS/EC2",
            period: cooldown,
            statistic: "Average",
            threshold: cpualarmlowthreshold,
            alarmActions: [scaleDownPolicy.arn],
            dimensions: { AutoScalingGroupName: autoScalingGroup.name },
        }
    );

    exports.rdsEndpoint = rdsInstance.endpoint;
});
exports.availabilityZones1 = availabilityZones1;

// Export the VPC ID for other Pulumi stacks to reference.
exports.vpcId = vpc.id;



