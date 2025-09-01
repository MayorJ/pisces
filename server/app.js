const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb'); // New import
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const serverless = require('serverless-http');

const app = express();
const SECRET_KEY = 'your_very_secure_secret_key';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123';

// MongoDB connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let db;
async function connectToDatabase() {
    if (db) {
        return db;
    }
    try {
        await client.connect();
        db = client.db('piscesDB');
        return db;
    } catch (e) {
        console.error("Could not connect to MongoDB Atlas", e);
        throw e;
    }
}

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Note: Multer with diskStorage is not compatible with Vercel.
// For production, you need a cloud storage service like Cloudinary.
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // This won't work on Vercel
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}-${file.originalname}`);
    }
});
const upload = multer({ storage: storage });

// Admin authentication middleware
const authenticateToken = (req, res, next) => {
    const token = req.headers['x-api-key'];
    if (!token) {
        return res.status(401).json({ message: 'Authentication failed. API key is missing.' });
    }
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Authentication failed. Invalid token.' });
        }
        req.user = user;
        next();
    });
};

// Login endpoint
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = jwt.sign({ username: ADMIN_USERNAME }, SECRET_KEY, { expiresIn: '1h' });
        return res.json({ message: 'Login successful', token });
    } else {
        return res.status(401).json({ message: 'Invalid username or password' });
    }
});

// Endpoint to get analytics
app.get('/api/analytics', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const productsCollection = db.collection('products');
        const blogsCollection = db.collection('blogs');
        const totalProducts = await productsCollection.countDocuments();
        const totalBlogs = await blogsCollection.countDocuments();
        res.json({
            totalProducts,
            totalBlogs,
            mostPopularProduct: { name: 'Dark Chocolate Bar', views: 520 }, // Mock data
            recentBloggers: ['Admin', 'John Doe'] // Mock data
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch analytics', error: error.message });
    }
});

// Endpoint to handle image uploads
app.post('/api/upload-image', authenticateToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ imgUrl: imageUrl, message: 'Image uploaded successfully.' });
});

// Product API Endpoints
app.get('/api/products', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const productsCollection = db.collection('products');
        const products = await productsCollection.find({}).toArray();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch products', error: error.message });
    }
});

app.post('/api/products', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const productsCollection = db.collection('products');
        const newProduct = req.body;
        const result = await productsCollection.insertOne(newProduct);
        res.status(201).json({ ...newProduct, _id: result.insertedId });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add product', error: error.message });
    }
});

app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const productsCollection = db.collection('products');
        const id = req.params.id;
        const updatedProduct = req.body;
        const result = await productsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedProduct });
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update product', error: error.message });
    }
});

app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const productsCollection = db.collection('products');
        const id = req.params.id;
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete product', error: error.message });
    }
});

// Blog API Endpoints
app.get('/api/blogs', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const blogsCollection = db.collection('blogs');
        const blogs = await blogsCollection.find({}).toArray();
        res.json(blogs);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch blogs', error: error.message });
    }
});

app.get('/api/blogs/:id', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const blogsCollection = db.collection('blogs');
        const id = req.params.id;
        const blog = await blogsCollection.findOne({ _id: new ObjectId(id) });
        if (!blog) {
            return res.status(404).json({ message: 'Blog post not found' });
        }
        res.json(blog);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch blog post', error: error.message });
    }
});

app.post('/api/blogs', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const blogsCollection = db.collection('blogs');
        const newBlog = { ...req.body, timestamp: new Date() };
        const result = await blogsCollection.insertOne(newBlog);
        res.status(201).json({ ...newBlog, _id: result.insertedId });
    } catch (error) {
        res.status(500).json({ message: 'Failed to add blog post', error: error.message });
    }
});

app.put('/api/blogs/:id', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const blogsCollection = db.collection('blogs');
        const id = req.params.id;
        const updatedBlog = req.body;
        const result = await blogsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedBlog });
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.json({ message: 'Blog updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update blog', error: error.message });
    }
});

app.delete('/api/blogs/:id', authenticateToken, async (req, res) => {
    try {
        const db = await connectToDatabase();
        const blogsCollection = db.collection('blogs');
        const id = req.params.id;
        const result = await blogsCollection.deleteOne({ _id: new ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'Blog not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete blog', error: error.message });
    }
});

// Simulate social media publishing
app.post('/api/publish-social-media', authenticateToken, async (req, res) => {
    const { blogId, socialMediaPlatform } = req.body;
    try {
        const db = await connectToDatabase();
        const blogsCollection = db.collection('blogs');
        const blogPost = await blogsCollection.findOne({ _id: new ObjectId(blogId) });
        if (!blogPost) {
            return res.status(404).json({ message: 'Blog post not found.' });
        }
        if (socialMediaPlatform === 'facebook') {
            const message = `${blogPost.title}\n\n${blogPost.content.replace(/<[^>]*>/g, '')}`;
            const link = `http://localhost:3000/blog.html?id=${blogPost.id}`;
            const picture = `http://localhost:3000${blogPost.img}`;
            console.log('--- Simulating Facebook Post ---');
            console.log('Content to be posted:', message);
            console.log('Link:', link);
            console.log('Image:', picture);
            console.log('--- Post Simulated Successfully ---');
            res.status(200).json({ message: 'Post simulated and "published" to Facebook successfully!' });
        } else {
            res.status(400).json({ message: 'Unsupported social media platform.' });
        }
    } catch (error) {
        console.error('Error simulating publish to Facebook:', error.message);
        res.status(500).json({ message: 'Failed to simulate publish to social media.', error: error.message });
    }
});

// Serve front-end files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.get('/:page', (req, res) => {
    const page = req.params.page;
    const filePath = path.join(__dirname, '..', 'public', `${page}.html`);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Page not found');
    }
});

module.exports = app;
module.exports.handler = serverless(app);