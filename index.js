const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;

// middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token;
    console.log('Value of token in middleware', token);
    if (!token) {
        return res.status(401).send({ message: 'Not Authorized' });
    }
    jwt.sign(token, process.env.ACCESS_SECRET_TOKEN, (err, decoded) => {
        if(err) {
            console.log(err);
            return res.status(401).send({ message: 'Unauthorized' });
        }
        console.log('Decoded in then token', decoded);
        req.user = decoded;
        next();
    })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.d7bt1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {

        const serviceCollection = client.db('AutoCareDB').collection('services');
        const cartCollection = client.db('AutoCareDB').collection('carts');

        // auth related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_SECRET_TOKEN, { expiresIn: '1h' });
            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: false,
                    // sameSite: 'none'
                })
                .send({ success: true });
        })

        app.get('/services', async (req, res) => {
            const services = serviceCollection.find();
            const result = await services.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = new ObjectId(id);
            const service = await serviceCollection.findOne(query);
            res.send(service);
        })

        app.post('/carts', async (req, res) => {
            const cart = req.body;
            console.log(cart);
            const result = await cartCollection.insertOne(cart);
            res.send(result);
        })

        app.get('/carts', verifyToken, async (req, res) => {
            console.log('user in the valid token', req.user);
            if(req.query.email !== req.user.email) {
                return res.status(403).send({ message: 'Forbidden access' });
            }
            let query = {};
            if (req.query?.email) {
                query = { email: req.query.email }
            }

            const carts = cartCollection.find(query);
            const result = await carts.toArray();
            res.send(result);
        })

        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Auto care server is running');
})

app.listen(port, () => {
    console.log(`Auto care server is running on port ${port}`)
})
