const dgram = require('dgram');
const dnsPacket = require('dns-packet');
const server = dgram.createSocket('udp4');

// Mock DNS database
const db = {
    'sugata.dev':
    {
        type:'A',
        ip:'1.2.3.4'
    },
    'app.sugata.dev': 
    {
        type:'CNAME',
        ip:'hashnet.com'
    }
};

server.on('message', (msg, rinfo) => {
    try {
        // Decode the incoming DNS query
        const incomingMsg = dnsPacket.decode(msg);

        console.log(`Query for: ${incomingMsg.questions[0].name}`);

        const domainName = incomingMsg.questions[0].name;
        const infoFromDb = db[domainName];

        // Prepare the DNS response
        const response = {
            type: 'response',
            id: incomingMsg.id,
            flags: dnsPacket.RECURSION_DESIRED | dnsPacket.RECURSION_AVAILABLE | dnsPacket.AUTHORITATIVE_ANSWER, // Proper flags
            questions: incomingMsg.questions,
            answers: [], // Default empty
        };

        if (infoFromDb) {
            // If the domain exists in the db, add it to the answers
            response.answers.push({
                type: infoFromDb.type,
                class: 'IN',
                name: domainName,
                ttl: 300, // Time-to-live in seconds
                data: infoFromDb.ip,
            });
        } else {
            // If domain is not found, set NXDOMAIN (RCODE=3)
            response.flags |= dnsPacket.RESPONSE_CODE.NXDOMAIN;
        }

        // Encode the response and send it
        const ans = dnsPacket.encode(response);
        server.send(ans, rinfo.port, rinfo.address);
    } catch (error) {
        console.error(`Error processing DNS request: ${error.message}`);
    }
});

server.bind(53, () => {
    console.log('DNS Server is listening on port 53');
});
