var mongodb = require('mongodb');
var csv = require('csv-parser');
var fs = require('fs');

var MongoClient = mongodb.MongoClient;
var mongoUrl = 'mongodb://localhost:27017/911-calls';

var insertCalls = function(db, callback) {
    var collection = db.collection('calls');

    var calls = [];
    fs.createReadStream('../911.csv')
        .pipe(csv())
        .on('data', data => {
            var call = {
                location : {
                    type : "Point",
                    coordinates : [Number(data.lng), Number(data.lat)]
                },
                description : data.desc,
                zip : data.zip,
                title : data.title,
                timeStamp : data.timeStamp,
                twp : data.twp,
                addr : data.addr
                // ignore e which is a superfluous column
            };
            calls.push(call);
        })
        .on('end', () => {
          collection.insertMany(calls, (err, result) => {
            callback(result)
          });
        });
}

MongoClient.connect(mongoUrl, (err, db) => {
    insertCalls(db, result => {
        var calls = db.collection("calls")
        console.log(`${result.insertedCount} calls inserted`);
        calls.createIndex({location : "2dsphere"}, (err, result) => {
            if (err){
                console.log(err);
            } else {
                console.log("2dsphere index added");
            }
            calls.createIndex({title : "text"}, (err, result) => {
                if (err){
                    console.log(err);
                } else {
                    console.log("text index added");
                }
                db.close();
            })
        });
    });
});
