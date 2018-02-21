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

// Function for first request
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


// Function for 2nd request
var sortByCategory = (db, callback) => {
    var calls = db.collection("calls");

    calls.find({
        $text : {
            $search : 
                "\"EMS:\""
        }
    }).count((err, result) => {
        var EMSnumber = result;
        calls.find({
            $text : {
                $search : 
                    "\"Traffic:\""
            }
        }).count((err, result) => {
            var trafficNumber = result;
            calls.find({
                $text : {
                    $search : 
                        "\"Fire:\""
                }
            }).count((err, result) => {
                var fireNumber = result;
                callback(EMSnumber, trafficNumber, fireNumber);
            })
        })
    })
}

MongoClient.connect(mongoUrl, (err, db) => {
    // Whole process for the 4 requests
    db.collection("calls").drop((err, del) => {
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
                        console.log("searching calls grouped by type...");
                        sortByCategory(db, (ems, traffic, fire) => {
                            console.log("EMS calls : " + ems);
                            console.log("Traffic calls : " + traffic);
                            console.log("Fire calls : " + fire);
                            db.close();
                        })
                    })
                })
            });
        });
    });
});