var elasticsearch = require('elasticsearch');
var csv = require('csv-parser');
var fs = require('fs');

var esClient = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'error'
});

const createBulkQuery = chunks => {
  const body = chunks.reduce((acc, chunk) => {
    acc.push({ index: { _index: '911', _type: 'call' } });
    acc.push(chunk);
    return acc;
  }, []);

  return { body };
}

var calls = [];
fs.createReadStream('../911.csv')
    .pipe(csv())
    .on('data', data => {
      calls.push({
        location : {
          lng : parseFloat(data.lng), lat : parseFloat(data.lat)
        },
        description : data.desc,
        zip : data.zip,
        title : data.title,
        timeStamp : new Date(data.timeStamp),
        twp : data.twp,
        addr : data.addr
      });
    })
    .on('end', () => {
      esClient.bulk(createBulkQuery(calls), (err, response) => {
        if (err){
          console.log(err);
        }
        esClient.close();
      });
});
