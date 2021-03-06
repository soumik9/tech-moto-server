const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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
        const paymentCollection = client.db("tech-moto").collection("payments");

        // verify a admin
        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAcc = await usersCollection.findOne({ email: requester });

            if (requesterAcc.role === 'admin') {
                next();
            }else{
                return res.status(403).send({ message: 'forbidden! Not a admin' });
            }
        }

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
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '10d' });
            res.send({ result, token });
        })

        // make new admin
        app.put('/user/make-admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };

            const updateDoc = {
                $set: { role: 'admin' },
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            return res.send(result);
        })

        // remove admin
        app.put('/user/remove-admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };

            const updateDoc = {
                $set: { role: 'user' },
            }
            const result = await usersCollection.updateOne(filter, updateDoc);
            return res.send(result);
        })

        // api get all users
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

        // delete tool
        app.delete('/tool/:toolId', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.toolId;
            const query = {_id: ObjectId(id)};
            const result = await toolsCollection.deleteOne(query);
            res.send(result);
        })

        // update quantity on order
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

        // api get all orders
        app.get('/orders', verifyJWT, verifyAdmin, async (req, res) => {
            const orders = await ordersCollection.find({}).toArray();
            res.send(orders);
        })

        // api get order by id
        app.get('/order/:orderId', verifyJWT, async (req, res) => {
            const id = req.params.orderId;
            const order = await ordersCollection.findOne({_id: ObjectId(id)});
            res.send(order);
        })

        // api get orders by filter email
        app.get('/orders/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;

            if(email === decodedEmail){
                const orders = await ordersCollection.find({email: email}).toArray();
                res.send(orders);
            }else{
                res.status(403).send({ message: 'forbidden access' });
            }
        })

        // api add new order
        app.post('/add-order', async (req, res) => {
            const newOrder = req.body;
            const result = await ordersCollection.insertOne(newOrder);
            res.send(result);
        })

        app.patch('/order/:orderId', verifyJWT, async (req, res) => {
            const id = req.params.orderId;
            const updateOrder = req.body;
            const filter = { _id: ObjectId(id) };

            const updateDoc = {
                $set: {
                    isPaid: "true",
                    transactionId: updateOrder.transactionId,
                }
            }

            const updatedOrder = await ordersCollection.updateOne(filter, updateDoc);
            const result = await paymentCollection.insertOne(updateOrder);
            res.send(result);
        })

        // update order status api
        app.put('/update-order/:orderId', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.orderId;
            const order = req.body
            const filter = { _id: ObjectId(id) };

            const updateDoc = {
                $set: {
                    status: order.status,
                }
            }

            const result = await ordersCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        // delete order
        app.delete('/order/:orderId', async (req, res) => {
            const id = req.params.orderId;
            const query = {_id: ObjectId(id)};
            const result = await ordersCollection.deleteOne(query);
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

        // payment
        app.post('/create-payment', verifyJWT, async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types:['card']
            });
            res.send({ clientSecret: paymentIntent.client_secret });
        })

    } finally {

    }
}

run().catch(console.dir);

// port listening
app.listen(port, () => {
    console.log('Listening to port, ', port);
})