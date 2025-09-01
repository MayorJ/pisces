const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3000;
const SECRET_KEY = 'your_very_secure_secret_key';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'password123';

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Multer storage for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// Read data from the JSON file
function readDatabase() {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database file:', error);
        return { products: [], blogs: [] };
    }
}

// Write data to the JSON file
function writeDatabase(data) {
    try {
        fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error('Error writing to database file:', error);
    }
}

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
app.get('/api/analytics', authenticateToken, (req, res) => {
    const db = readDatabase();
    res.json({
        totalProducts: db.products.length,
        totalBlogs: db.blogs.length,
        mostPopularProduct: { name: 'Dark Chocolate Bar', views: 520 }, // Mock data
        recentBloggers: ['Admin', 'John Doe'] // Mock data
    });
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
app.get('/api/products', (req, res) => {
    const db = readDatabase();
    res.json(db.products);
});

app.post('/api/products', authenticateToken, (req, res) => {
    const db = readDatabase();
    const newProduct = { id: db.products.length + 1, ...req.body };
    db.products.push(newProduct);
    writeDatabase(db);
    res.status(201).json(newProduct);
});

app.put('/api/products/:id', authenticateToken, (req, res) => {
    const db = readDatabase();
    const id = parseInt(req.params.id);
    const index = db.products.findIndex(p => p.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'Product not found' });
    }
    db.products[index] = { ...db.products[index], ...req.body };
    writeDatabase(db);
    res.json(db.products[index]);
});

app.delete('/api/products/:id', authenticateToken, (req, res) => {
    const db = readDatabase();
    const id = parseInt(req.params.id);
    db.products = db.products.filter(p => p.id !== id);
    writeDatabase(db);
    res.status(204).send();
});

// Blog API Endpoints
app.get('/api/blogs', (req, res) => {
    const db = readDatabase();
    res.json(db.blogs);
});

app.get('/api/blogs/:id', (req, res) => {
    const db = readDatabase();
    const id = parseInt(req.params.id);
    const blog = db.blogs.find(b => b.id === id);
    if (!blog) {
        return res.status(404).json({ message: 'Blog post not found' });
    }
    res.json(blog);
});

app.post('/api/blogs', authenticateToken, (req, res) => {
    const db = readDatabase();
    const newBlog = { id: db.blogs.length + 1, ...req.body, timestamp: new Date() };
    db.blogs.push(newBlog);
    writeDatabase(db);
    res.status(201).json(newBlog);
});

app.put('/api/blogs/:id', authenticateToken, (req, res) => {
    const db = readDatabase();
    const id = parseInt(req.params.id);
    const index = db.blogs.findIndex(b => b.id === id);
    if (index === -1) {
        return res.status(404).json({ message: 'Blog not found' });
    }
    db.blogs[index] = { ...db.blogs[index], ...req.body };
    writeDatabase(db);
    res.json(db.blogs[index]);
});

app.delete('/api/blogs/:id', authenticateToken, (req, res) => {
    const db = readDatabase();
    const id = parseInt(req.params.id);
    db.blogs = db.blogs.filter(b => b.id !== id);
    writeDatabase(db);
    res.status(204).send();
});

app.post('/api/publish-social-media', authenticateToken, (req, res) => {
    const { blogId, socialMediaPlatform } = req.body;
    try {
        const db = readDatabase();
        const blogPost = db.blogs.find(b => b.id == blogId);
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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});