const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const ordersCollection = client.db("tech-moto").collection("orders");
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

        // api single user info
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = {email: email};
            const user = await usersCollection.findOne(query);
            res.send(user);
        })

        // user update api
        app.put('/update-user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body
            const filter = { email: email };
            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    education: user.education,
                    location: user.location,
                    mobile: user.mobile,
                    linkedin: user.linkedin,
                }
            }

            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // api get all tools
        app.get('/tools', async (req, res) => {
            const tools = await toolsCollection.find({}).toArray();
            res.send(tools);
        })

        // api get single tool 
        app.get('/tool/:toolId', async (req, res) => {
            const id = req.params.toolId;
            const query = {_id: ObjectId(id)};
            const tool = await toolsCollection.findOne(query);
            res.send(tool);
        })

        // api add new order
        app.post('/add-order', async (req, res) => {
            const newOrder = req.body;
            const result = await ordersCollection.insertOne(newOrder);
            res.send(result);
        })

        // api get all reviews
        app.get('/reviews', async (req, res) => {
            const reviews = await reviewsCollection.find({}).toArray();
            res.send(reviews);
        })

        // api add new review
        app.post('/add-review', async (req, res) => {
            const newReview = req.body;
            const result = await reviewsCollection.insertOne(newReview);
            res.send(result);
        })

    } finally {

    }
}

run().catch(console.dir);

// port listening
app.listen(port, () => {
    console.log('Listening to port, ', port);
})