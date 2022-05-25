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

// jwt verification
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).send({ message: 'Unauthorized access' });
    }

    const token = authHeader.split(' ')[1];
 

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            console.log(err);
            return res.status(403).send({ message: 'Forbidden access' });
        }
        req.decoded = decoded;
        next();
    })
}

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

        // api get all tools
        app.get('/users', async (req, res) => {
            const users = await usersCollection.find({}).toArray();
            res.send(users);
        })

        // get user role by email
        app.get('/user-role/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;

            if(email === decodedEmail){
                const user = await usersCollection.findOne({email: email});
                const isUser = user.role === 'user';
                res.send({user: isUser});
            }else{
                res.status(403).send({ message: 'forbidden access' });
            }
        })

        // get admin role by email
        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;

            if(email === decodedEmail){
                const user = await usersCollection.findOne({email: email});
                const isAdmin = user.role === 'admin';
                res.send({admin: isAdmin});
            }else{
                res.status(403).send({ message: 'forbidden access' });
            }
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

        // api add new tool
        app.post('/add-tool', verifyJWT, async (req, res) => {
            const newTool = req.body;
            const result = await toolsCollection.insertOne(newTool);
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

         // update quantitt on order
         app.put('/update-tool/:toolId', async (req, res) => {
            const id = req.params.toolId;
            const tool = req.body
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true };

            const updateDoc = {
                $set: {
                    quantity: tool.newQuantity,
                    sold: tool.newSold,
                }
            }

            const result = await toolsCollection.updateOne(filter, updateDoc, options);
            res.send(result);
        })

        // api get orders by filter email
        app.get('/orders/:email', async (req, res) => {
            const email = req.params.email;
            const orders = await ordersCollection.find({email: email}).toArray();
            res.send(orders);
        })

        // api add new order
        app.post('/add-order', async (req, res) => {
            const newOrder = req.body;
            const result = await ordersCollection.insertOne(newOrder);
            res.send(result);
        })

        // delete order
        app.delete('/order/:orderId', async (req, res) => {
            const id = req.params.orderId;
            console.log(id);
            const query = {_id: ObjectId(id)};
            const result = await ordersCollection.deleteOne(query);
            console.log(result);
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