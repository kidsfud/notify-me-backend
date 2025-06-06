// server.js

// 1. Load environment variables from .env (so process.env.MONGODB_URI is available)
require('dotenv').config();

const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

// 2. Grab the MongoDB URI from env
const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("❌ Error: MONGODB_URI is not set in .env");
  process.exit(1);
}

// 3. Create a new MongoClient instance
// const client = new MongoClient(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });
const client = new MongoClient(uri, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  }
});



// 4. Prepare Express app
const app = express();
const PORT = process.env.PORT || 3000;

// 5. Apply middleware
app.use(cors());             // Allow requests from any origin (you can restrict later)
app.use(express.json());     // Automatically parse JSON request bodies

// 6. This variable will hold our collection reference once we connect
let notifyCollection;

// 7. Connect to MongoDB Atlas once on startup
client.connect()
  .then(() => {
    console.log("✅ Connected to MongoDB Atlas");

    // 7a. Use the database name from your URI (e.g., "NotifyMeDB")
    const db = client.db("NotifyMeDB");

    // 7b. Use (or create) a collection named "notifies"
    notifyCollection = db.collection("notifies");
    console.log("🎉 Using collection 'notifies' in database 'NotifyMeDB'");
  })
  .catch(err => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// 8. Health-check route (optional)
app.get('/', (req, res) => {
  res.send("Notify Me backend is up and running.");
});

// 9. POST /items — handle incoming "Notify Me" requests
app.post('/items', async (req, res) => {
  try {
    // 9a. Destructure the expected fields from the JSON body
    const { name, email, mobileNumber, productPageUrl } = req.body;

    // 9b. Basic validation: all four fields must be present
    if (!name || !email || !mobileNumber || !productPageUrl) {
      return res.status(400).json({ error: "All fields (name, email, mobileNumber, productPageUrl) are required." });
    }

    // 9c. Create a new document with a timestamp
    const newDoc = {
      name,
      email,
      mobileNumber,
      productPageUrl,
      createdAt: new Date()
    };

    // 9d. Insert it into the "notifies" collection
    const result = await notifyCollection.insertOne(newDoc);

    // 9e. Fetch the inserted document (so we return exactly what’s in the database, including _id)
    const savedDoc = await notifyCollection.findOne({ _id: result.insertedId });

    // 9f. Return 201 Created + the saved document as JSON
    return res.status(201).json(savedDoc);
  } catch (err) {
    console.error("❌ Error saving document:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// 10. (Optional) GET /items — list all saved requests (for your own debugging)
app.get('/items', async (req, res) => {
  try {
    const allDocs = await notifyCollection.find().sort({ createdAt: -1 }).toArray();
    return res.json(allDocs);
  } catch (err) {
    console.error("❌ Error fetching items:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

// 11. Start the Express server
app.listen(PORT, () => {
  console.log(`🚀 Server is listening on port ${PORT}`);
});