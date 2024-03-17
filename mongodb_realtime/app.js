const { Server } = require('socket.io');
const { ObjectId } = require('mongodb');
const MongoConnect = require("./configuration/db");
const ExpressServer = require("./configuration/server");

const { server, app } = ExpressServer();
const io = new Server(server);

const emitData = async (col, query) => {

    const { filter, select, sort, skip, limit } = query;

    // Handle empty objects
    let finalFilter = filter || '{}'
    let finalProjection = select || '{}';
    let finalSort = sort || '{}';
    const finalSkip = typeof (skip) === 'string' ? parseInt(skip) : skip || 0;
    const finalLimit = typeof (limit) == 'string' ? parseInt(limit) : limit || 0; // Use 0 for no limit

    if (typeof finalFilter === 'string') {
        finalFilter = JSON.parse(finalFilter);
    }
    if (typeof finalProjection === 'string') {
        finalProjection = JSON.parse(finalProjection)
    }

    if (typeof finalSort === 'string') {
        finalSort = JSON.parse(finalSort);
    }

    if (finalFilter['_id']) {
        finalFilter['_id'] = new ObjectId(finalFilter['_id']);
    }


    const result = await col.find(finalFilter)
        .sort(finalSort)
        .project(finalProjection)
        .skip(finalSkip)
        .limit(finalLimit)
        .toArray();

    return result;

    // const r = await result.then((result, err) => {
    //     if (err) {

    //         return {
    //             status: false,
    //             message: `${err}`,
    //             data: []
    //         }
    //     }
    //     return {
    //         status: true,
    //         message: `${collection} get`,
    //         data: [...result]
    //     };
    // });

}

io.on('connection', (socket) => {
    console.log('connection established: ' + socket.id);

    socket.on('request', (query) => {
        console.log(query);
        const { collection, filter } = query;
        MongoConnect().then(async ({ client, db }) => {
            const col = db.collection(collection);
            const result = await emitData(col, query);
            // initial emit
            io.emit('response', result);

            let documentsIds = result.map(doc => doc._id.toString());

            const changeStream = col.watch();
            changeStream.on('change', async (change) => {

                // insert or replace data in streams
                if (change.operationType === 'insert' || change.operationType === 'replace') {
                    const updatedDocumentKey = change.documentKey._id.toString();
                    if(!query?.filter?._id){
                        const result = await emitData(col, { ...query, filter: {...query.filter, _id: updatedDocumentKey}, select: { _id: 1 } });
                        if(result.length > 0){
                            const res = await emitData(col, query);
                            io.emit('response', res);
                            documentsIds = result.map(doc => doc._id.toString());
                        }
                    }

                }

                // update the stream
                if (change.operationType === 'update' || change.operationType === 'delete') {
                    const updatedDocumentKey = change.documentKey._id.toString();
                    const find = documentsIds.find(id => id === updatedDocumentKey);
                    if (find) {
                        emitData(col, query).then(result => {
                            io.emit('response', result);
                            documentsIds = result.map(doc => doc._id.toString());
                        });
                    }
                }


            })

        });

    }); //fetch-list

});

// MongoConnect().then(async ({ client, db }) => {
// const collection = db.collection('users');

// const result = await collection.find().toArray();
// console.log(result);
// });

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});
