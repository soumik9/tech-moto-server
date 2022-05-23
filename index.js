const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

//mongodb connect
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@tech-moto.cy4t9.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {

        // connect to mongodb collection
        await client.connect();
        const usersCollection = client.db("tech-moto").collection("users");
        const reviewsCollection = client.db("tech-moto").collection("reviews");
        const toolsCollection = client.db("tech-moto").collection("tools");

        // api homepage
        app.get('/', (req, res) => {
            res.send('Tech Moto App Server Is Ready')
        })


        // on login get user info
        app.put('/users/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body
            const filter = { email: email };
            const options = { upsert: true };

            const updateDoc = {
                $set: user,
            }

            const result = await usersCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
            res.send({ result, token });
        })

        // api get all tools
        app.get('/tools', async (req, res) => {
            const tools = await toolsCollection.find({}).toArray();
            res.send(tools);
        })

        // api get all reviews
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewsCollection.find({}).toArray();
            res.send(reviews);
        })

    } finally {

    }
}

run().catch(console.dir);

// port listening
app.listen(port, () => {
    console.log('Listening to port, ', port);
})