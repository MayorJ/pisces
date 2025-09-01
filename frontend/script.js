document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:3000';

    const renderProducts = (products, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (products.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No products found.</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 product-card">
                    <img src="${product.img}" class="card-img-top" alt="${product.name}">
                    <div class="card-body">
                        <h5 class="card-title">${product.name}</h5>
                        <p class="card-text text-muted">${product.category}</p>
                        <p class="card-text fw-bold">₦${product.price.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `).join('');
    };

    const renderBlogs = (blogs, containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        if (blogs.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">No blog posts found.</p>';
            return;
        }

        container.innerHTML = blogs.map(blog => `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100 blog-card">
                    <img src="${blog.img}" class="card-img-top" alt="${blog.title}">
                    <div class="card-body">
                        <h5 class="card-title">${blog.title}</h5>
                        <p class="card-text text-muted">${new Date(blog.timestamp).toLocaleDateString()} by ${blog.author}</p>
                        <p class="card-text">${blog.content.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>
                        <a href="blog-post.html?id=${blog.id}" class="btn btn-primary">Read More</a>
                    </div>
                </div>
            </div>
        `).join('');
    };

    const populateFilters = (data, filterId, prop, label) => {
        const filterEl = document.getElementById(filterId);
        if (!filterEl) return;
        
        const uniqueValues = new Set(data.map(item => item[prop]));
        filterEl.innerHTML = `<option value="">All ${label}</option>`;
        uniqueValues.forEach(value => {
            if (value) {
                const option = document.createElement('option');
                option.value = value;
                option.textContent = value;
                filterEl.appendChild(option);
            }
        });
    };

    const initializePublicSite = async () => {
        const path = window.location.pathname;

        if (path.includes('index.html') || path === '/') {
            try {
                const productsResponse = await fetch(`${API_URL}/api/products`);
                const products = await productsResponse.json();
                const featuredProducts = products.filter(p => p.featured);
                renderProducts(featuredProducts, 'featured-products-container');
            } catch (error) {
                console.error('Error fetching featured products:', error);
            }

            try {
                const blogsResponse = await fetch(`${API_URL}/api/blogs`);
                const blogs = await blogsResponse.json();
                const featuredBlogs = blogs.filter(b => b.featured);
                renderBlogs(featuredBlogs, 'featured-blogs-container');
            } catch (error) {
                console.error('Error fetching featured blogs:', error);
            }
        } else if (path.includes('products.html')) {
            const productSearch = document.getElementById('productSearch');
            const categoryFilter = document.getElementById('productCategory');
            
            let allProducts = [];

            const fetchAndRender = async () => {
                try {
                    const response = await fetch(`${API_URL}/api/products`);
                    allProducts = await response.json();
                    
                    populateFilters(allProducts, 'productCategory', 'category', 'Categories');

                    filterAndSortProducts();
                } catch (error) {
                    console.error('Error fetching products:', error);
                }
            };

            const filterAndSortProducts = () => {
                let filteredProducts = [...allProducts];

                const searchTerm = productSearch.value.toLowerCase();
                if (searchTerm) {
                    filteredProducts = filteredProducts.filter(p => 
                        p.name.toLowerCase().includes(searchTerm) || 
                        p.description.toLowerCase().includes(searchTerm)
                    );
                }

                const category = categoryFilter.value;
                if (category) {
                    filteredProducts = filteredProducts.filter(p => p.category === category);
                }

                renderProducts(filteredProducts, 'products-container');
            };

            productSearch.addEventListener('input', filterAndSortProducts);
            categoryFilter.addEventListener('change', filterAndSortProducts);

            fetchAndRender();
        } else if (path.includes('blogs.html')) {
            const categoryFilter = document.getElementById('blogCategory');
            const blogSearch = document.getElementById('blogSearch');

            let allBlogs = [];

            const fetchAndRender = async () => {
                try {
                    const response = await fetch(`${API_URL}/api/blogs`);
                    allBlogs = await response.json();
                    
                    populateFilters(allBlogs, 'blogCategory', 'category', 'Categories');

                    filterBlogs();
                } catch (error) {
                    console.error('Error fetching blogs:', error);
                }
            };

            const filterBlogs = () => {
                let filteredBlogs = [...allBlogs];
                
                const searchTerm = blogSearch.value.toLowerCase();
                if (searchTerm) {
                    filteredBlogs = filteredBlogs.filter(b =>
                        b.title.toLowerCase().includes(searchTerm) ||
                        b.content.toLowerCase().includes(searchTerm)
                    );
                }

                const category = categoryFilter.value;
                if (category) {
                    filteredBlogs = filteredBlogs.filter(b => b.category === category);
                }
                
                renderBlogs(filteredBlogs, 'blogs-container');
            };

            categoryFilter.addEventListener('change', filterBlogs);
            blogSearch.addEventListener('input', filterBlogs);
            
            fetchAndRender();
        } else if (path.includes('blog-post.html')) {
            const urlParams = new URLSearchParams(window.location.search);
            const blogId = urlParams.get('id');

            if (blogId) {
                try {
                    const response = await fetch(`${API_URL}/api/blogs/${blogId}`);
                    const blogPost = await response.json();
                    
                    if (blogPost) {
                        const container = document.getElementById('blog-post-content');
                        document.title = `${blogPost.title} - Blog Post`;
                        container.innerHTML = `
                            <img src="${blogPost.img}" class="img-fluid mb-4 blog-post-image" alt="${blogPost.title}">
                            <h1 class="mb-3">${blogPost.title}</h1>
                            <p class="text-muted fst-italic">By ${blogPost.author} on ${new Date(blogPost.timestamp).toLocaleDateString()}</p>
                            <div class="blog-content">${blogPost.content}</div>
                        `;
                    } else {
                        document.getElementById('blog-post-content').innerHTML = '<p class="text-center text-danger">Blog post not found.</p>';
                    }
                } catch (error) {
                    console.error('Error fetching single blog post:', error);
                    document.getElementById('blog-post-content').innerHTML = '<p class="text-center text-danger">Failed to load blog post.</p>';
                }
            } else {
                document.getElementById('blog-post-content').innerHTML = '<p class="text-center text-danger">Invalid blog post ID.</p>';
            }
        }
    };

    initializePublicSite();
});