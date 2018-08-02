let mongoDb;
let rsmq;

module.exports = {
  getMongo: () => {
    return mongoDb;
  },
  setMongo: (newMongoDb) => {
    mongoDb = newMongoDb;
  },
  getRsmq: () => {
    return rsmq;
  },
  setRsmq: (newRsmq) => {
    rsmq = newRsmq;
  }
};