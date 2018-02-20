var mongodb = require('mongodb');
var csv = require('csv-parser');
var fs = require('fs');

var MongoClient = mongodb.MongoClient;
var mongoUrl = 'mongodb://localhost:27017/911-calls';

const EARTH_RADIUS_IN_METERS = 6378100;

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

var searchCountInRadius = (db, lat, lng, radius, callback) => {
    var calls = db.collection("calls");
    radius = metersToRadians(radius);

    calls.find({
        location : {
            $geoWithin : {
                $centerSphere :  [
                    [
                    lng, 
                    lat
                    ], 
                radius
                ]
            }
        }
    }).count((err, result) => {
        var number = result;
        callback(number);
    });
}

var metersToRadians = (radius) => {
    return radius / EARTH_RADIUS_IN_METERS;
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
                console.log("searching for calls in a 500m radius to Lansdale, PA, USA...");
                searchCountInRadius(db, 40.241493, -75.283783, 500, (result) => {
                    console.log(result);
                    db.close();
                })
            })
        });
    });
});

// db.calls.find( { location : { $geoWithin : { $centerSphere :  [ [ -75.283783, 40.241493 ] , 500/6378100 ] } } } ).count()